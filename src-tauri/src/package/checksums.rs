use std::collections::BTreeMap;
use std::path::Path;

use sha2::{Digest, Sha256};

use super::paths::{check_package_path, check_extension, safe_join};

/// One line of `checksums.sha256`.
#[derive(Debug, Clone)]
pub struct ChecksumEntry {
    pub Path: String,
    pub Hash: String,
}

/// Parses the checksum file. Anything that is not `<64 hex>  <path>` is an
/// error rather than a skipped line: a malformed entry would otherwise let a
/// file slip past the integrity check unnoticed.
pub fn parse(raw: &str) -> Result<Vec<ChecksumEntry>, Vec<String>> {
    let mut entries = Vec::new();
    let mut errors = Vec::new();
    let mut seen = BTreeMap::new();

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let mut parts = trimmed.splitn(2, char::is_whitespace);
        let hash = parts.next().unwrap_or_default().to_ascii_lowercase();
        let path = parts.next().unwrap_or_default().trim().trim_start_matches('*');

        if hash.len() != 64 || !hash.chars().all(|character| character.is_ascii_hexdigit()) {
            errors.push(format!("checksums.sha256 行格式错误：{trimmed}"));
            continue;
        }
        if let Err(message) = check_package_path(path) {
            errors.push(format!("checksums.sha256 中的路径 {path}：{message}"));
            continue;
        }
        if seen.contains_key(path) {
            errors.push(format!("checksums.sha256 重复登记 {path}"));
            continue;
        }

        seen.insert(path.to_string(), ());
        entries.push(ChecksumEntry {
            Path: path.to_string(),
            Hash: hash,
        });
    }

    if errors.is_empty() {
        Ok(entries)
    } else {
        Err(errors)
    }
}

pub fn hash_file(path: &Path) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|error| format!("无法读取文件：{error}"))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(hex(&hasher.finalize()))
}

fn hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}

/// Verifies the whole tree in both directions: every registered file must
/// exist and match, and every file on disk must be registered. A stray file is
/// a failure, because the install would otherwise ship content nobody vouched
/// for.
pub fn verify(root: &Path, entries: &[ChecksumEntry]) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();
    let mut registered = BTreeMap::new();
    for entry in entries {
        registered.insert(entry.Path.as_str(), entry.Hash.as_str());
    }

    for entry in entries {
        let full = match safe_join(root, &entry.Path) {
            Ok(path) => path,
            Err(message) => {
                errors.push(message);
                continue;
            }
        };
        if !full.exists() {
            errors.push(format!("checksums.sha256 登记了不存在的文件 {}", entry.Path));
            continue;
        }
        match hash_file(&full) {
            Ok(actual) if actual != entry.Hash => errors.push(format!(
                "{} 的 SHA-256 不一致：登记 {}，实际 {actual}",
                entry.Path, entry.Hash
            )),
            Ok(_) => {}
            Err(message) => errors.push(format!("{}：{message}", entry.Path)),
        }
    }

    for path in walk(root) {
        if path == "checksums.sha256" {
            continue;
        }
        if !registered.contains_key(path.as_str()) {
            errors.push(format!("checksums.sha256 未登记 {path}"));
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Every file in the tree as a POSIX path, sorted, skipping `checksums.sha256`.
pub fn walk(root: &Path) -> Vec<String> {
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];

    while let Some(directory) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&directory) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let Ok(file_type) = entry.file_type() else {
                continue;
            };
            if file_type.is_dir() {
                stack.push(path);
            } else if file_type.is_file() {
                if let Ok(relative) = path.strip_prefix(root) {
                    out.push(relative.to_string_lossy().replace('\\', "/"));
                }
            }
        }
    }

    out.sort();
    out
}

/// Rebuilds `checksums.sha256` from what is actually on disk, which is what an
/// export must do: the exported container describes the content as installed,
/// not as it was authored.
pub fn generate(root: &Path) -> Result<String, String> {
    let mut lines = String::new();
    for path in walk(root) {
        if path == "checksums.sha256" {
            continue;
        }
        if let Err(message) = check_extension(&path) {
            return Err(format!("{path}：{message}"));
        }
        let hash = hash_file(&root.join(&path))?;
        lines.push_str(&format!("{hash}  {path}\n"));
    }
    Ok(lines)
}

#[cfg(test)]
mod tests {
    use super::{generate, parse, verify};

    fn fixture(name: &str) -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!("morrow-checksums-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("knowledge")).expect("dir");
        std::fs::write(root.join("manifest.yaml"), b"format: 1\n").expect("write");
        std::fs::write(root.join("knowledge/index.yaml"), b"chapters: []\n").expect("write");
        root
    }

    #[test]
    fn a_generated_file_verifies_against_itself() {
        let root = fixture("roundtrip");
        let raw = generate(&root).expect("generate");
        std::fs::write(root.join("checksums.sha256"), &raw).expect("write");

        let entries = parse(&raw).expect("parse");
        assert_eq!(entries.len(), 2);
        assert!(verify(&root, &entries).is_ok());

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn a_tampered_file_fails_verification() {
        let root = fixture("tamper");
        let raw = generate(&root).expect("generate");
        let entries = parse(&raw).expect("parse");

        std::fs::write(root.join("manifest.yaml"), b"format: 2\n").expect("rewrite");
        let errors = verify(&root, &entries).expect_err("should fail");
        assert!(errors.iter().any(|line| line.contains("SHA-256")));

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn an_unregistered_file_fails_verification() {
        let root = fixture("stray");
        let raw = generate(&root).expect("generate");
        let entries = parse(&raw).expect("parse");
        std::fs::write(root.join("stray.md"), b"extra").expect("write");

        let errors = verify(&root, &entries).expect_err("should fail");
        assert!(errors.iter().any(|line| line.contains("未登记")));

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn malformed_lines_are_reported_together() {
        let raw = "not-a-hash  manifest.yaml\nabc  ../escape.md\n";
        let errors = parse(raw).expect_err("should fail");
        assert_eq!(errors.len(), 2);
    }
}
