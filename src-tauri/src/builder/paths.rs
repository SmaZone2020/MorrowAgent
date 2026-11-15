use std::path::{Path, PathBuf};

/// The builder workspace root: an existing directory the user chose.
pub fn root(raw: &str) -> Result<PathBuf, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("还没有选择工作区文件夹".to_string());
    }
    let path = Path::new(trimmed);
    if !path.is_dir() {
        return Err(format!("工作区文件夹不存在：{trimmed}"));
    }
    path.canonicalize()
        .map_err(|error| format!("无法解析工作区文件夹：{error}"))
}

/// Turns a model-authored path into a POSIX-style relative path.
///
/// The model decides these paths, so every shape that could leave the
/// workspace — absolute roots, drive letters, `..` — is refused by name rather
/// than silently normalised away.
pub fn normalize(relative: &str) -> Result<String, String> {
    let unified = relative.trim().replace('\\', "/");
    if unified.is_empty() {
        return Err("path 不能为空".to_string());
    }
    if unified.starts_with('/') {
        return Err("只能使用工作区内的相对路径".to_string());
    }
    if unified.as_bytes().get(1) == Some(&b':') {
        return Err("只能使用工作区内的相对路径".to_string());
    }
    if unified.contains('\0') {
        return Err("路径包含非法字符".to_string());
    }

    let mut segments: Vec<&str> = Vec::new();
    for segment in unified.split('/') {
        match segment {
            "" | "." => continue,
            ".." => return Err("不允许 .. 路径段".to_string()),
            other => segments.push(other),
        }
    }
    if segments.is_empty() {
        return Err("path 不能为空".to_string());
    }
    Ok(segments.join("/"))
}

/// Joins a relative path onto the root and proves the result stays inside it.
///
/// For a write the parent may not exist yet, so the directories are created
/// first and the check runs on the canonical parent: an existing symlink that
/// points outside the workspace still fails.
pub fn resolve(root: &Path, relative: &str, for_write: bool) -> Result<PathBuf, String> {
    let normalized = normalize(relative)?;
    let joined = root.join(&normalized);

    let parent = joined
        .parent()
        .ok_or_else(|| format!("无法解析 {normalized} 的上级目录"))?;
    if for_write {
        std::fs::create_dir_all(parent).map_err(|error| format!("无法创建目录：{error}"))?;
    }

    let canonical_root = root
        .canonicalize()
        .map_err(|error| format!("无法解析工作区：{error}"))?;
    let canonical_parent = parent
        .canonicalize()
        .map_err(|error| format!("无法解析 {normalized} 的上级目录：{error}"))?;
    if !canonical_parent.starts_with(&canonical_root) {
        return Err(format!("{normalized} 指向工作区之外"));
    }

    let full = canonical_parent.join(
        joined
            .file_name()
            .ok_or_else(|| format!("{normalized} 不是有效路径"))?,
    );
    if let Ok(existing) = full.canonicalize() {
        if !existing.starts_with(&canonical_root) {
            return Err(format!("{normalized} 指向工作区之外"));
        }
    }
    Ok(full)
}

/// The path as the model should see it: relative, POSIX separators.
pub fn display(root: &Path, full: &Path) -> String {
    full.strip_prefix(root)
        .map(|rest| rest.to_string_lossy().replace('\\', "/"))
        .unwrap_or_else(|_| full.to_string_lossy().replace('\\', "/"))
}

#[cfg(test)]
mod tests {
    use super::{normalize, resolve};

    #[test]
    fn only_relative_paths_survive() {
        assert_eq!(normalize("knowledge/index.yaml").ok().as_deref(), Some("knowledge/index.yaml"));
        assert_eq!(normalize("knowledge\\index.yaml").ok().as_deref(), Some("knowledge/index.yaml"));
        assert_eq!(normalize("./a//b.md").ok().as_deref(), Some("a/b.md"));
        assert!(normalize("../escape.md").is_err());
        assert!(normalize("/etc/passwd").is_err());
        assert!(normalize("C:/windows").is_err());
        assert!(normalize("   ").is_err());
    }

    #[test]
    fn writes_stay_under_the_root() {
        let root = std::env::temp_dir().join("morrow-builder-resolve");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(root.join("knowledge")).expect("temp dir");
        let canonical = root.canonicalize().expect("canonical");

        let joined = resolve(&canonical, "knowledge/a.md", true).expect("write path");
        assert!(joined.starts_with(&canonical));
        assert!(resolve(&canonical, "../escape.md", true).is_err());
        assert!(resolve(&canonical, "nested/deep/file.md", true).is_ok());

        let _ = std::fs::remove_dir_all(&root);
    }
}
