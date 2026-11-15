//! The last step of a build: putting the finished folder on the shelf.
//!
//! Builder Mode writes files; the shelf installs archives. Rather than teach the
//! model the importer's internals, the tool packs the tree the way an export
//! would and then hands the archive to the *same* `package::inspect` the import
//! dialog uses. A package that would be refused from a downloaded file is
//! refused here too, with the same checklist — which is the point: a folder that
//! only this tool accepts is a folder the user cannot share.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};

use serde::Serialize;

use crate::package::{self, ValidationReport};
use crate::store::Workspace;

/// One import attempt. A failure still carries the checklist, because "校验未通过"
/// without the failing lines is the least useful thing a tool can return.
#[derive(Debug, Clone, Serialize)]
pub struct BuilderImport {
    #[serde(rename = "report")]
    pub Report: ValidationReport,
    /// Present only when the package was installed.
    #[serde(rename = "workspace")]
    pub Workspace: Option<Workspace>,
}

/// A scratch directory that cannot collide with a concurrent import.
///
/// Two builds in two folders are a realistic pair — the user opens a second
/// conversation while the first is still packing — and `temp_dir()/builder`
/// would have them overwriting each other's archive.
pub fn scratch_dir() -> PathBuf {
    static COUNTER: AtomicU32 = AtomicU32::new(0);
    let unique = COUNTER.fetch_add(1, Ordering::Relaxed);
    std::env::temp_dir().join(format!(
        "morrow-builder-import-{}-{unique}",
        std::process::id()
    ))
}

/// Packs `tree` into `scratch` and runs the importer's checks against it.
///
/// The archive is thrown away by the caller: an author who asked to import their
/// folder did not ask for `out.morrow` to appear next to it. A build that wants
/// the archive can run the pack itself — `guideStructure` documents the command.
pub fn pack_and_inspect(
    tree: &Path,
    packages_root: &Path,
    scratch: &Path,
) -> Result<BuilderImport, String> {
    if !tree.join("manifest.yaml").is_file() {
        return Err(format!(
            "{} 下面没有 manifest.yaml，这不是一个学习包的根目录。先用 file_write 把 manifest.yaml 写到正确的位置，或者把 path 指到包所在的子文件夹。",
            tree.display()
        ));
    }

    std::fs::create_dir_all(scratch).map_err(|error| format!("无法创建临时目录：{error}"))?;
    let archive = scratch.join("builder.morrow");
    package::archive::pack(tree, &archive)?;

    let staging = package::staging_path(packages_root);
    let report = package::inspect(&archive, &staging, packages_root)?;
    if !report.Ok {
        // Same rule as the dialog: a failed inspection must not leave the
        // half-extracted tree behind for the next attempt to trip over.
        let _ = std::fs::remove_dir_all(&staging);
    }

    Ok(BuilderImport {
        Report: report,
        Workspace: None,
    })
}

#[cfg(test)]
mod tests {
    use super::{pack_and_inspect, scratch_dir};
    use crate::package::archive;
    use std::path::Path;

    fn sample_root() -> Option<std::path::PathBuf> {
        crate::package::sample_package()
    }

    fn work(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("morrow-builder-import-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("dir");
        dir
    }

    #[test]
    fn a_folder_without_a_manifest_is_refused_before_packing() {
        let dir = work("no-manifest");
        let error = pack_and_inspect(&dir, &dir.join("packages"), &scratch_dir())
            .expect_err("no manifest");
        assert!(error.contains("manifest.yaml"), "{error}");
        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn a_finished_package_passes_the_import_checks() {
        let Some(root) = sample_root() else {
            eprintln!("skipped: no sample package in packages/");
            return;
        };

        let dir = work("valid");
        let packages = dir.join("packages");
        let outcome = pack_and_inspect(&root, &packages, &scratch_dir()).expect("inspect");

        assert!(outcome.Report.Ok, "{:?}", outcome.Report.Checks);
        // Nothing was installed, so there is no workspace to report.
        assert!(outcome.Workspace.is_none());
        assert!(outcome.Report.Staging.is_some(), "a passing report stages the tree");

        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn a_broken_checksum_fails_the_same_check_as_a_download() {
        let Some(root) = sample_root() else {
            eprintln!("skipped: no sample package in packages/");
            return;
        };

        let dir = work("tampered");
        let copy = dir.join("pkg");
        archive::copy_tree(&root, &copy).expect("copy");
        std::fs::write(copy.join("README.md"), "tampered").expect("rewrite");

        let outcome = pack_and_inspect(&copy, &dir.join("packages"), &scratch_dir()).expect("inspect");
        assert!(!outcome.Report.Ok);

        let integrity = outcome
            .Report
            .Checks
            .iter()
            .find(|line| line.Key == "integrity")
            .expect("integrity line");
        assert!(!integrity.Ok);
        // The staging tree of a failed import is deleted, not handed back.
        assert!(outcome.Report.Staging.is_none());

        let _ = std::fs::remove_dir_all(dir);
    }

    #[test]
    fn scratch_directories_do_not_collide() {
        assert_ne!(scratch_dir(), scratch_dir());
    }

    #[test]
    fn pack_is_refused_for_a_missing_tree() {
        let missing = Path::new("C:/does/not/exist/morrow-pkg");
        assert!(pack_and_inspect(missing, Path::new("C:/tmp/packages"), &scratch_dir()).is_err());
    }
}
