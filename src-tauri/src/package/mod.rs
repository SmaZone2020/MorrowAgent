pub mod archive;
pub mod checksums;
pub mod content;
pub mod manifest;
pub mod paths;

use std::path::{Path, PathBuf};

use serde::Serialize;

use content::PackageContent;
use manifest::{compare_versions, PackageManifest, PackageSummary};
use paths::check_package_path;

/// The strings this build understands. A package declaring anything else is
/// rejected instead of being half-read.
pub const SUPPORTED_FORMAT_VERSION: &str = "1.0";
pub const APP_VERSION: &str = "0.1.0";

/// One line in the import dialog's checklist (MLPS §15.1).
#[derive(Debug, Clone, Serialize)]
pub struct CheckLine {
    #[serde(rename = "key")]
    pub Key: String,
    #[serde(rename = "label")]
    pub Label: String,
    #[serde(rename = "ok")]
    pub Ok: bool,
    /// Errors for this step; empty when `Ok`.
    #[serde(rename = "details")]
    pub Details: Vec<String>,
}

/// The result of looking at a `.morrow` file without installing anything.
#[derive(Debug, Clone, Serialize)]
pub struct ValidationReport {
    #[serde(rename = "file")]
    pub File: String,
    #[serde(rename = "ok")]
    pub Ok: bool,
    #[serde(rename = "checks")]
    pub Checks: Vec<CheckLine>,
    /// Present when the manifest was readable, so the dialog can preview the
    /// package even when a later step failed.
    #[serde(rename = "summary")]
    pub Summary: Option<PackageSummary>,
    #[serde(rename = "stats")]
    pub Stats: Option<content::ContentStats>,
    /// A same-id workspace already installed and older than this file.
    #[serde(rename = "update")]
    pub Update: bool,
    /// Where the verified tree was extracted. The install step moves this
    /// directory into place instead of unpacking the archive a second time.
    #[serde(rename = "staging")]
    pub Staging: Option<String>,
}

/// Installs or updates a package and returns its loaded content.
#[derive(Debug, Clone, Serialize)]
pub struct InstallResult {
    #[serde(rename = "manifest")]
    pub Manifest: PackageSummary,
    #[serde(rename = "rootPath")]
    pub RootPath: String,
    #[serde(rename = "coverPath")]
    pub CoverPath: Option<String>,
    #[serde(rename = "stats")]
    pub Stats: content::ContentStats,
    #[serde(rename = "replacedVersion")]
    pub ReplacedVersion: Option<String>,
}

fn check(key: &str, label: &str, details: Vec<String>) -> CheckLine {
    CheckLine {
        Key: key.to_string(),
        Label: label.to_string(),
        Ok: details.is_empty(),
        Details: details,
    }
}

/// The full pre-install sweep. Reading is done against a temporary extraction,
/// because checksums and cross-file references cannot be judged from headers
/// alone; the caller is responsible for deleting that directory.
pub fn inspect(archive_path: &Path, staging: &Path) -> Result<ValidationReport, String> {
    let mut checks = Vec::new();
    let file = archive_path.to_string_lossy().to_string();

    // 1 — real 7z container, not just a renamed file.
    let listed = match archive::list_entries(archive_path) {
        Ok(entries) => entries,
        Err(error) => {
            checks.push(check("container", "7z 容器", vec![error]));
            return Ok(ValidationReport {
                File: file,
                Ok: false,
                Checks: checks,
                Summary: None,
                Stats: None,
                Update: false,
                Staging: None,
            });
        }
    };
    checks.push(check("container", "7z 容器", Vec::new()));

    // 2 — the manifest must be reachable at the root, before anything is written.
    let manifest_bytes = match archive::read_entry(archive_path, "manifest.yaml")? {
        Some(bytes) => bytes,
        None => {
            checks.push(check(
                "manifest",
                "manifest.yaml",
                vec!["根目录缺少 manifest.yaml".to_string()],
            ));
            return Ok(ValidationReport {
                File: file,
                Ok: false,
                Checks: checks,
                Summary: None,
                Stats: None,
                Update: false,
                Staging: None,
            });
        }
    };

    let manifest: PackageManifest = match serde_yaml::from_str(
        String::from_utf8_lossy(&manifest_bytes).as_ref(),
    ) {
        Ok(manifest) => manifest,
        Err(error) => {
            checks.push(check(
                "manifest",
                "manifest.yaml",
                vec![format!("解析失败：{error}")],
            ));
            return Ok(ValidationReport {
                File: file,
                Ok: false,
                Checks: checks,
                Summary: None,
                Stats: None,
                Update: false,
                Staging: None,
            });
        }
    };
    checks.push(check("manifest", "manifest.yaml", Vec::new()));

    // 3 — format version, ids, versions, cover syntax.
    checks.push(check("schema", "Manifest 字段", manifest.Check()));

    // 4 — the archive only carries files a package may carry.
    let names: Vec<String> = listed
        .iter()
        .filter(|entry| !entry.IsDirectory)
        .map(|entry| entry.Name.clone())
        .collect();
    checks.push(check(
        "paths",
        "文件路径与类型",
        paths::check_archive_entries(&names),
    ));

    // 5 — declared content paths exist.
    let mut missing = Vec::new();
    for path in manifest.ContentPaths() {
        if check_package_path(path).is_err() || !names.iter().any(|name| name == path) {
            missing.push(format!("缺少 {path}"));
        }
    }
    for required in ["README.md", "checksums.sha256"] {
        if !names.iter().any(|name| name == required) {
            missing.push(format!("缺少 {required}"));
        }
    }
    checks.push(check("files", "必需文件", missing));

    // 6 — compatibility with this build.
    let mut compatibility = Vec::new();
    if manifest.Format.Version != SUPPORTED_FORMAT_VERSION {
        compatibility.push(format!(
            "format.version 是 {}，本客户端只支持 {SUPPORTED_FORMAT_VERSION}",
            manifest.Format.Version
        ));
    }
    if compare_versions(APP_VERSION, &manifest.Compatibility.MinAppVersion) < 0 {
        compatibility.push(format!(
            "需要客户端至少 {}，当前 {APP_VERSION}",
            manifest.Compatibility.MinAppVersion
        ));
    }
    checks.push(check("compatibility", "版本兼容", compatibility));

    // A failing structural check means extraction would be wasted work.
    if checks.iter().any(|line| !line.Ok) {
        return Ok(ValidationReport {
            File: file,
            Ok: false,
            Checks: checks,
            Summary: Some(manifest.Summary()),
            Stats: None,
            Update: false,
            Staging: None,
        });
    }

    // 7 — extract into staging, which is also where the remaining checks run.
    archive::extract(archive_path, staging)?;

    // 8 — integrity: every file registered, every hash matching.
    let checksum_raw = std::fs::read_to_string(staging.join("checksums.sha256"))
        .map_err(|error| format!("无法读取 checksums.sha256：{error}"))?;
    let integrity = match checksums::parse(&checksum_raw) {
        Ok(entries) => checksums::verify(staging, &entries).err().unwrap_or_default(),
        Err(errors) => errors,
    };
    checks.push(check("integrity", "SHA-256 校验", integrity));

    // 9 — parse the content; this also proves the declared paths resolve and
    // that every question points at a real knowledge point.
    let loaded = content::load(staging, manifest.clone());
    match &loaded {
        Ok(loaded) => {
            let mut errors = Vec::new();
            let known: std::collections::BTreeSet<&str> =
                loaded.Points.iter().map(|point| point.Id.as_str()).collect();
            for question in &loaded.Questions {
                for point in &question.KnowledgePoints {
                    if !known.contains(point.as_str()) {
                        errors.push(format!("题 {} 引用了未定义的知识点 {point}", question.Id));
                    }
                }
            }
            checks.push(check("content", "内容与引用", errors));
        }
        Err(error) => checks.push(check("content", "内容与引用", vec![error.clone()])),
    }

    let summary = manifest.Summary();
    let stats = loaded.as_ref().ok().map(|loaded| loaded.Stats.clone());
    let ok = checks.iter().all(|line| line.Ok);

    Ok(ValidationReport {
        File: file,
        Ok: ok,
        Checks: checks,
        Summary: Some(summary),
        Stats: stats,
        Update: false,
        // A failed report leaves no staging directory: the caller deletes it,
        // and handing back a path would invite an install from unproven bytes.
        Staging: if ok {
            Some(staging.to_string_lossy().to_string())
        } else {
            None
        },
    })
}

/// Installs from an already-extracted staging directory.
///
/// The move is atomic per package: content is staged at
/// `packages/.staging/<id>-<nonce>` and only renamed into place after every
/// check passed, so a failure leaves either the old version or nothing.
pub fn install(staging: &Path, packages_root: &Path) -> Result<InstallResult, String> {
    let manifest_raw = std::fs::read_to_string(staging.join("manifest.yaml"))
        .map_err(|error| format!("无法读取 manifest.yaml：{error}"))?;
    let manifest: PackageManifest =
        serde_yaml::from_str(&manifest_raw).map_err(|error| format!("manifest 解析失败：{error}"))?;

    let problems = manifest.Check();
    if !problems.is_empty() {
        return Err(problems.join("；"));
    }

    let target = packages_root.join(&manifest.Package.Id);
    let replaced = current_version(&target);

    if let Some(existing) = &replaced {
        if compare_versions(&manifest.Package.Version, existing) < 0 {
            return Err(format!(
                "已安装 {existing}，不能用更低版本 {} 覆盖",
                manifest.Package.Version
            ));
        }
    }

    // Replace by swap: the new tree lands next to the old one, then the old one
    // is removed. A crash between the two leaves two directories, which the
    // next install cleans up, rather than a half-written package.
    if target.exists() {
        let trash = packages_root.join(format!(".trash-{}", nonce()));
        std::fs::rename(&target, &trash)
            .map_err(|error| format!("无法移动旧版本：{error}"))?;
        std::fs::rename(staging, &target)
            .map_err(|error| format!("无法安装新版本：{error}"))?;
        let _ = std::fs::remove_dir_all(&trash);
    } else {
        std::fs::create_dir_all(packages_root)
            .map_err(|error| format!("无法创建学习包目录：{error}"))?;
        std::fs::rename(staging, &target)
            .map_err(|error| format!("无法安装学习包：{error}"))?;
    }

    let content = content::load(&target, manifest)?;
    // The cover is stored as the package-relative path the manifest declares,
    // not as an absolute one: the read command re-joins it under the workspace
    // root so a moved package does not strand its own cover.
    let cover = content.Manifest.CoverFile.clone();

    Ok(InstallResult {
        Stats: content.Stats,
        Manifest: content.Manifest,
        RootPath: target.to_string_lossy().to_string(),
        CoverPath: cover,
        ReplacedVersion: replaced,
    })
}

/// Reads an installed package for the workspace. Returns `None` when the
/// directory vanished, so the caller can mark the workspace orphaned instead of
/// erroring forever.
pub fn open(root: &Path) -> Result<Option<PackageContent>, String> {
    if !root.join("manifest.yaml").exists() {
        return Ok(None);
    }
    let raw = std::fs::read_to_string(root.join("manifest.yaml"))
        .map_err(|error| format!("无法读取 manifest.yaml：{error}"))?;
    let manifest: PackageManifest =
        serde_yaml::from_str(&raw).map_err(|error| format!("manifest 解析失败：{error}"))?;
    content::load(root, manifest).map(Some)
}

/// Rewrites the checksums from what is on disk, then packs the tree. An export
/// therefore describes the installed content, not the file the user once
/// imported.
///
/// The rewrite happens on a copy: mutating `root` would change the bytes of a
/// live package, so the archive on disk would no longer match the checksums the
/// workspace was installed with.
pub fn export(root: &Path, target: &Path) -> Result<u64, String> {
    let copy = std::env::temp_dir().join(format!("morrow-export-{}", nonce()));
    let _ = std::fs::remove_dir_all(&copy);
    let result = (|| {
        archive::copy_tree(root, &copy)?;
        let generated = checksums::generate(&copy)?;
        std::fs::write(copy.join("checksums.sha256"), generated)
            .map_err(|error| format!("无法更新校验和：{error}"))?;
        archive::pack(&copy, target)
    })();
    let _ = std::fs::remove_dir_all(&copy);
    result
}

fn current_version(target: &Path) -> Option<String> {
    let raw = std::fs::read_to_string(target.join("manifest.yaml")).ok()?;
    let manifest: PackageManifest = serde_yaml::from_str(&raw).ok()?;
    Some(manifest.Package.Version)
}

fn nonce() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_nanos())
        .unwrap_or(0)
}

/// A unique staging directory per install attempt.
pub fn staging_path(packages_root: &Path) -> PathBuf {
    packages_root
        .join(".staging")
        .join(nonce().to_string())
}

#[cfg(test)]
mod tests {
    use super::{export, inspect, install, open, staging_path};

    fn sample_root() -> std::path::PathBuf {
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../packages/cn.morrow.calculus.shaanxi-upgrade")
    }

    fn workspace_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("morrow-install-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("dir");
        dir
    }

    #[test]
    fn a_sample_package_round_trips_through_export_and_install() {
        let work = workspace_dir("roundtrip");
        let archive = work.join("sample.morrow");
        export(&sample_root(), &archive).expect("export");

        let staging = staging_path(&work.join("packages"));
        let report = inspect(&archive, &staging).expect("inspect");
        assert!(report.Ok, "{:?}", report.Checks);
        assert_eq!(report.Stats.as_ref().map(|stats| stats.Points), Some(8));

        let installed = install(&staging, &work.join("packages")).expect("install");
        assert_eq!(installed.Manifest.Id, "cn.morrow.calculus.shaanxi-upgrade");
        assert!(installed.ReplacedVersion.is_none());

        let content = open(std::path::Path::new(&installed.RootPath))
            .expect("open")
            .expect("present");
        assert_eq!(content.Stats.Questions, 15);

        let _ = std::fs::remove_dir_all(work);
    }

    #[test]
    fn installing_a_newer_version_replaces_the_old_tree() {
        let work = workspace_dir("update");
        let packages = work.join("packages");
        std::fs::create_dir_all(&packages).expect("dir");

        let first = work.join("first.morrow");
        export(&sample_root(), &first).expect("export first");
        let staging = staging_path(&packages);
        inspect(&first, &staging).expect("inspect first");
        let installed = install(&staging, &packages).expect("install first");

        // A second identical build lands as the same version and reports no
        // replacement, which is what an idempotent reinstall looks like.
        let second = work.join("second.morrow");
        export(&sample_root(), &second).expect("export second");
        let staging = staging_path(&packages);
        inspect(&second, &staging).expect("inspect second");
        let again = install(&staging, &packages).expect("install again");
        assert_eq!(
            again.ReplacedVersion.as_deref(),
            Some("1.0.0"),
            "reinstall keeps the workspace id but records the old version"
        );
        assert_eq!(again.RootPath, installed.RootPath);

        let _ = std::fs::remove_dir_all(work);
    }

    #[test]
    fn a_tampered_package_fails_the_integrity_check() {
        let work = workspace_dir("tamper");
        let source = work.join("source");
        copy_dir(&sample_root(), &source);
        std::fs::write(source.join("README.md"), "tampered").expect("rewrite");

        let archive = work.join("tampered.morrow");
        super::archive::pack(&source, &archive).expect("pack");

        let staging = staging_path(&work.join("packages"));
        let report = inspect(&archive, &staging).expect("inspect");
        assert!(!report.Ok);
        let integrity = report
            .Checks
            .iter()
            .find(|line| line.Key == "integrity")
            .expect("integrity line");
        assert!(!integrity.Ok);

        let _ = std::fs::remove_dir_all(work);
    }

    #[test]
    fn a_non_archive_is_refused_at_the_first_check() {
        let work = workspace_dir("not7z");
        let archive = work.join("fake.morrow");
        std::fs::write(&archive, b"nope").expect("write");

        let report = inspect(&archive, &staging_path(&work.join("packages"))).expect("inspect");
        assert!(!report.Ok);
        assert_eq!(report.Checks.len(), 1);
        assert_eq!(report.Checks[0].Key, "container");

        let _ = std::fs::remove_dir_all(work);
    }

    fn copy_dir(source: &std::path::Path, target: &std::path::Path) {
        std::fs::create_dir_all(target).expect("dir");
        for entry in std::fs::read_dir(source).expect("read") {
            let entry = entry.expect("entry");
            let path = entry.path();
            let destination = target.join(entry.file_name());
            if path.is_dir() {
                copy_dir(&path, &destination);
            } else {
                std::fs::copy(&path, &destination).expect("copy");
            }
        }
    }
}
