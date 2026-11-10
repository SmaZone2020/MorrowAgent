use std::path::{Path, PathBuf};

/// Extensions a package may carry. Anything executable or scriptable is
/// refused outright (MLPS §15.1 item 15): the archive is untrusted input.
const FORBIDDEN: &[&str] = &[
    "exe", "dll", "so", "dylib", "bat", "cmd", "ps1", "sh", "msi", "com", "scr", "js", "mjs",
    "cjs", "vbs", "jar", "py",
];

const ALLOWED: &[&str] = &[
    "md", "yaml", "yml", "json", "sha256", "txt", "png", "jpg", "jpeg", "webp", "svg", "pdf",
    "docx", "doc", "pptx", "ppt", "mp3", "wav", "m4a", "ogg", "mp4", "webm",
];

/// A path inside a package is always POSIX-relative. Absolute paths, drive
/// letters, backslashes and `..` are the three shapes a Zip Slip needs, so all
/// of them fail before the file is opened.
pub fn check_package_path(path: &str) -> Result<(), String> {
    if path.is_empty() {
        return Err("路径为空".to_string());
    }
    if path.starts_with('/') || path.starts_with('\\') {
        return Err("不允许绝对路径".to_string());
    }
    if path.as_bytes().get(1) == Some(&b':') {
        return Err("不允许盘符".to_string());
    }
    if path.contains('\\') {
        return Err("必须使用正斜杠".to_string());
    }
    if path.contains('\0') {
        return Err("不允许空字符".to_string());
    }
    if path
        .split('/')
        .any(|segment| segment == ".." || segment == "." || segment.is_empty())
    {
        return Err("不允许 . 或 .. 路径段".to_string());
    }
    Ok(())
}

/// Case-insensitive extension gate. A file with no extension is accepted (the
/// spec allows bare names) but never executed.
pub fn check_extension(path: &str) -> Result<(), String> {
    let name = path.rsplit('/').next().unwrap_or(path);
    let extension = match name.rsplit_once('.') {
        Some((_, tail)) => tail.to_ascii_lowercase(),
        None => return Ok(()),
    };
    if FORBIDDEN.contains(&extension.as_str()) {
        return Err(format!("不允许可执行或脚本文件（.{extension}）"));
    }
    if !ALLOWED.contains(&extension.as_str()) {
        return Err(format!("不支持的文件类型（.{extension}）"));
    }
    Ok(())
}

/// Joins a validated package path onto `root` and proves the result stays
/// inside it. The canonicalise step is what catches a symlink pointing out.
pub fn safe_join(root: &Path, relative: &str) -> Result<PathBuf, String> {
    check_package_path(relative)?;
    let joined = root.join(relative);

    let parent = joined.parent().unwrap_or(root);
    let canonical_root = root
        .canonicalize()
        .map_err(|error| format!("无法解析安装目录：{error}"))?;
    let canonical_parent = parent.canonicalize().map_err(|error| {
        format!("无法解析 {relative} 的上级目录：{error}")
    })?;
    if !canonical_parent.starts_with(&canonical_root) {
        return Err(format!("{relative} 指向安装目录之外"));
    }
    Ok(canonical_parent.join(joined.file_name().unwrap_or_default()))
}

/// Rejects a package whose entry point is a symbolic link: the importer copies
/// real bytes, so a link would be silently produced as a regular file anyway,
/// but reporting it is more honest than pretending it worked.
#[cfg(unix)]
pub fn is_symlink(path: &Path) -> bool {
    std::fs::symlink_metadata(path)
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false)
}

#[cfg(not(unix))]
pub fn is_symlink(_path: &Path) -> bool {
    false
}

/// Applies the path and extension rules to a whole archive listing. Collecting
/// every failure means the install dialog can show the complete list.
pub fn check_archive_entries(names: &[String]) -> Vec<String> {
    let mut errors = Vec::new();
    for name in names {
        if let Err(message) = check_package_path(name) {
            errors.push(format!("{name}：{message}"));
            continue;
        }
        if let Err(message) = check_extension(name) {
            errors.push(format!("{name}：{message}"));
        }
    }
    errors
}

#[cfg(test)]
mod tests {
    use super::{check_archive_entries, check_extension, check_package_path, safe_join};

    #[test]
    fn traversal_and_absolute_paths_are_refused() {
        assert!(check_package_path("knowledge/index.yaml").is_ok());
        assert!(check_package_path("../escape.md").is_err());
        assert!(check_package_path("knowledge/../../escape.md").is_err());
        assert!(check_package_path("/etc/passwd").is_err());
        assert!(check_package_path("C:/windows/system32").is_err());
        assert!(check_package_path("knowledge\\index.yaml").is_err());
    }

    #[test]
    fn executables_are_refused_but_content_is_not() {
        assert!(check_extension("manifest.yaml").is_ok());
        assert!(check_extension("media/covers/cover.png").is_ok());
        assert!(check_extension("install.ps1").is_err());
        assert!(check_extension("payload.EXE").is_err());
        assert!(check_extension("notes.bin").is_err());
        assert!(check_extension("LICENSE").is_ok());
    }

    #[test]
    fn a_whole_listing_reports_every_problem() {
        let names = vec![
            "manifest.yaml".to_string(),
            "run.bat".to_string(),
            "../outside.md".to_string(),
        ];
        assert_eq!(check_archive_entries(&names).len(), 2);
    }

    #[test]
    fn safe_join_stays_under_the_root() {
        let root = std::env::temp_dir().join("morrow-safe-join");
        std::fs::create_dir_all(root.join("knowledge")).expect("temp dir");
        let joined = safe_join(&root, "knowledge/index.yaml").expect("join");
        assert!(joined.starts_with(root.canonicalize().expect("canonical")));
        assert!(safe_join(&root, "../escape.yaml").is_err());
        let _ = std::fs::remove_dir_all(root);
    }
}
