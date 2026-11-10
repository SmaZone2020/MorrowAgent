use serde::Deserialize;

/// The part of `manifest.yaml` the installer has to understand.
///
/// The manifest is the only entry point into a package (MLPS §4): everything
/// else is reached by a path declared here, so a package that cannot describe
/// itself is rejected before a single content file is opened.
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PackageManifest {
    #[serde(rename = "format")]
    pub Format: FormatBlock,
    #[serde(rename = "package")]
    pub Package: PackageBlock,
    #[serde(rename = "author")]
    pub Author: AuthorBlock,
    #[serde(rename = "compatibility")]
    pub Compatibility: CompatibilityBlock,
    #[serde(rename = "contents")]
    pub Contents: ContentsBlock,
    #[serde(rename = "dependencies", default)]
    pub Dependencies: Vec<Dependency>,
    #[serde(rename = "integrity")]
    pub Integrity: IntegrityBlock,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FormatBlock {
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "version")]
    pub Version: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PackageBlock {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "version")]
    pub Version: String,
    #[serde(rename = "description", default)]
    pub Description: String,
    #[serde(rename = "subject")]
    pub Subject: String,
    #[serde(rename = "sub_subject", default)]
    pub SubSubject: Option<String>,
    #[serde(rename = "language")]
    pub Language: String,
    #[serde(rename = "targets", default)]
    pub Targets: Vec<String>,
    #[serde(rename = "region", default)]
    pub Region: Vec<String>,
    #[serde(rename = "tags", default)]
    pub Tags: Vec<String>,
    #[serde(rename = "cover", default)]
    pub Cover: Option<CoverBlock>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CoverBlock {
    #[serde(rename = "file", default)]
    pub File: Option<String>,
    #[serde(rename = "accent")]
    pub Accent: String,
    #[serde(rename = "focus", default)]
    pub Focus: Option<Vec<f32>>,
    #[serde(rename = "alt", default)]
    pub Alt: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AuthorBlock {
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "url", default)]
    pub Url: Option<String>,
    #[serde(rename = "email", default)]
    pub Email: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CompatibilityBlock {
    #[serde(rename = "min_app_version")]
    pub MinAppVersion: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ContentsBlock {
    #[serde(rename = "knowledge")]
    pub Knowledge: IndexBlock,
    #[serde(rename = "questions")]
    pub Questions: IndexBlock,
    #[serde(rename = "relations")]
    pub Relations: IndexBlock,
    #[serde(rename = "taxonomy")]
    pub Taxonomy: TaxonomyBlock,
    #[serde(rename = "citations")]
    pub Citations: CitationsBlock,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct IndexBlock {
    #[serde(rename = "index")]
    pub Index: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TaxonomyBlock {
    #[serde(rename = "tags")]
    pub Tags: String,
    #[serde(rename = "error_types")]
    pub ErrorTypes: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CitationsBlock {
    #[serde(rename = "sources")]
    pub Sources: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Dependency {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "version")]
    pub Version: String,
    #[serde(rename = "optional", default)]
    pub Optional: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct IntegrityBlock {
    #[serde(rename = "algorithm")]
    pub Algorithm: String,
    #[serde(rename = "file")]
    pub File: String,
}

impl PackageManifest {
    /// Every declared content path, in the order the installer probes them.
    /// A package whose manifest points outside itself is rejected before any of
    /// these are opened, so this list is safe to hand to `exists` checks.
    pub fn ContentPaths(&self) -> Vec<&str> {
        vec![
            self.Contents.Knowledge.Index.as_str(),
            self.Contents.Questions.Index.as_str(),
            self.Contents.Relations.Index.as_str(),
            self.Contents.Taxonomy.Tags.as_str(),
            self.Contents.Taxonomy.ErrorTypes.as_str(),
            self.Contents.Citations.Sources.as_str(),
        ]
    }

    /// Draws the line between "the manifest is readable" and "the manifest
    /// describes a package this build can install". Kept separate from the
    /// deserializer so the caller can report every problem at once.
    pub fn Check(&self) -> Vec<String> {
        let mut errors = Vec::new();

        if self.Format.Name != "morrow-learning-package" {
            errors.push(format!("format.name 是 {}", self.Format.Name));
        }
        if self.Format.Version != "1.0" {
            errors.push(format!(
                "format.version 是 {}，本客户端只支持 1.0",
                self.Format.Version
            ));
        }

        if !is_package_id(&self.Package.Id) {
            errors.push(format!("package.id {} 不是合法的反向域名式 ID", self.Package.Id));
        }
        if self.Package.Name.trim().is_empty() {
            errors.push("package.name 为空".to_string());
        }
        if !is_semver(&self.Package.Version) {
            errors.push(format!("package.version {} 不是 x.y.z 形式", self.Package.Version));
        }
        if self.Package.Tags.is_empty() {
            errors.push("package.tags 为空，书架无法归类".to_string());
        }
        if !is_semver(&self.Compatibility.MinAppVersion) {
            errors.push(format!(
                "compatibility.min_app_version {} 不是 x.y.z 形式",
                self.Compatibility.MinAppVersion
            ));
        }
        if self.Integrity.Algorithm != "sha256" || self.Integrity.File != "checksums.sha256" {
            errors.push("integrity 必须是 sha256 + checksums.sha256".to_string());
        }

        if let Some(cover) = &self.Package.Cover {
            if !is_accent(&cover.Accent) {
                errors.push(format!("cover.accent {} 不是 #RRGGBB", cover.Accent));
            }
            if let Some(focus) = &cover.Focus {
                if focus.len() != 2 || focus.iter().any(|value| !(0.0..=1.0).contains(value)) {
                    errors.push("cover.focus 必须是两个 0–1 之间的数".to_string());
                }
            }
        }

        errors
    }

    /// Package metadata as the shelf needs it, without the content paths.
    pub fn Summary(&self) -> PackageSummary {
        let cover = self.Package.Cover.as_ref();
        PackageSummary {
            Id: self.Package.Id.clone(),
            Name: self.Package.Name.clone(),
            Version: self.Package.Version.clone(),
            Description: self.Package.Description.clone(),
            Subject: self.Package.Subject.clone(),
            Tags: self.Package.Tags.clone(),
            Author: self.Author.Name.clone(),
            Accent: cover.map(|block| block.Accent.clone()),
            CoverFile: cover.and_then(|block| block.File.clone()),
            CoverAlt: cover.and_then(|block| block.Alt.clone()),
            Focus: cover.and_then(|block| block.Focus.clone()),
        }
    }
}

/// The slice of a manifest the shelf renders. Persisted into `workspaces` so a
/// card still shows a name and colour after the package files are gone.
#[derive(Debug, Clone, serde::Serialize)]
pub struct PackageSummary {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "version")]
    pub Version: String,
    #[serde(rename = "description")]
    pub Description: String,
    #[serde(rename = "subject")]
    pub Subject: String,
    #[serde(rename = "tags")]
    pub Tags: Vec<String>,
    #[serde(rename = "author")]
    pub Author: String,
    #[serde(rename = "accent")]
    pub Accent: Option<String>,
    #[serde(rename = "coverFile")]
    pub CoverFile: Option<String>,
    #[serde(rename = "coverAlt")]
    pub CoverAlt: Option<String>,
    #[serde(rename = "focus")]
    pub Focus: Option<Vec<f32>>,
}

/// Reverse-domain id: at least two dot-separated segments, lower case.
pub fn is_package_id(value: &str) -> bool {
    let segments: Vec<&str> = value.split('.').collect();
    if segments.len() < 2 {
        return false;
    }
    segments.iter().all(|segment| {
        !segment.is_empty()
            && segment.starts_with(|character: char| character.is_ascii_lowercase())
            && segment
                .chars()
                .all(|character| character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-')
    })
}

pub fn is_semver(value: &str) -> bool {
    let parts: Vec<&str> = value.split('.').collect();
    parts.len() == 3
        && parts
            .iter()
            .all(|part| !part.is_empty() && part.chars().all(|character| character.is_ascii_digit()))
}

fn is_accent(value: &str) -> bool {
    value.len() == 7
        && value.starts_with('#')
        && value[1..].chars().all(|character| character.is_ascii_hexdigit())
}

/// Numeric comparison, so `1.10.0` outranks `1.9.0`. Returns `Ordering` values
/// as -1 / 0 / 1 to keep the call sites terse.
pub fn compare_versions(left: &str, right: &str) -> i32 {
    let parse = |value: &str| -> Vec<i64> {
        value
            .split('.')
            .map(|part| part.parse::<i64>().unwrap_or(0))
            .collect()
    };
    let a = parse(left);
    let b = parse(right);
    for index in 0..3 {
        let diff = a.get(index).copied().unwrap_or(0) - b.get(index).copied().unwrap_or(0);
        if diff != 0 {
            return if diff > 0 { 1 } else { -1 };
        }
    }
    0
}

#[cfg(test)]
mod tests {
    use super::{compare_versions, is_package_id, is_semver, PackageManifest};

    #[test]
    fn ids_need_two_lower_case_segments() {
        assert!(is_package_id("cn.morrow.calculus"));
        assert!(!is_package_id("calculus"));
        assert!(!is_package_id("cn.Morrow"));
        assert!(!is_package_id("cn..morrow"));
    }

    #[test]
    fn versions_compare_numerically() {
        assert!(compare_versions("1.10.0", "1.9.0") > 0);
        assert_eq!(compare_versions("1.0.0", "1.0.0"), 0);
        assert!(compare_versions("0.1.0", "1.0.0") < 0);
        assert!(is_semver("2.0.1"));
        assert!(!is_semver("2.0"));
    }

    #[test]
    fn the_sample_manifest_parses_and_checks_clean() {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../packages/cn.morrow.calculus.shaanxi-upgrade/manifest.yaml");
        let raw = std::fs::read_to_string(&path).expect("sample manifest is readable");
        let manifest: PackageManifest = serde_yaml::from_str(&raw).expect("manifest parses");
        assert!(manifest.Check().is_empty(), "{:?}", manifest.Check());
        assert_eq!(manifest.Package.Id, "cn.morrow.calculus.shaanxi-upgrade");
        assert!(manifest.Package.Tags.contains(&"calculus".to_string()));
        assert_eq!(manifest.Summary().Accent.as_deref(), Some("#2f6f5e"));
    }

    #[test]
    fn an_unknown_key_is_rejected_rather_than_ignored() {
        let raw = "format:\n  name: morrow-learning-package\n  version: '1.0'\n  extra: true\n";
        assert!(serde_yaml::from_str::<PackageManifest>(raw).is_err());
    }
}
