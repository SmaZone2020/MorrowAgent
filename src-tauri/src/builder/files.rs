use serde::Serialize;
use std::path::Path;

use super::paths;

/// One file read may return this many bytes; the model pages with `offset`.
const READ_MAX_BYTES: usize = 32 * 1024;
/// A directory listing this big is a tree, not a folder: stop and say so.
const LIST_MAX_ENTRIES: usize = 500;

#[derive(Debug, Clone, Serialize)]
pub struct FileSlice {
    #[serde(rename = "path")]
    pub Path: String,
    /// The text, already cut to the requested window.
    #[serde(rename = "content")]
    pub Content: String,
    /// 1-based line of the first line in `content`.
    #[serde(rename = "startLine")]
    pub StartLine: u32,
    #[serde(rename = "totalLines")]
    pub TotalLines: u32,
    /// True when the window stopped before the end of the file.
    #[serde(rename = "truncated")]
    pub Truncated: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DirEntryInfo {
    #[serde(rename = "path")]
    pub Path: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "directory")]
    pub Directory: bool,
    #[serde(rename = "size")]
    pub Size: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DirListing {
    #[serde(rename = "path")]
    pub Path: String,
    #[serde(rename = "entries")]
    pub Entries: Vec<DirEntryInfo>,
    #[serde(rename = "truncated")]
    pub Truncated: bool,
}

/// Reads one text file, at most `limit` lines from `offset`.
pub fn read(
    root: &Path,
    relative: &str,
    offset: u32,
    limit: u32,
) -> Result<FileSlice, String> {
    let full = paths::resolve(root, relative, false)?;
    let bytes = std::fs::read(&full).map_err(|error| format!("无法读取 {relative}：{error}"))?;

    // A NUL byte inside the first block is the practical definition of binary
    // for this tool; the model gets a sentence instead of mojibake.
    let probe = &bytes[..bytes.len().min(4096)];
    if probe.contains(&0) {
        return Err(format!("{relative} 是二进制文件，请用 file2md 转换"));
    }
    let text = String::from_utf8_lossy(&bytes).to_string();
    let lines: Vec<&str> = text.lines().collect();
    let total = lines.len() as u32;

    let start = offset.saturating_sub(1) as usize;
    if start >= lines.len().max(1) && total > 0 {
        return Err(format!("offset {offset} 超出 {relative} 的 {total} 行"));
    }

    let wanted = limit.max(1) as usize;
    let mut end = start.saturating_add(wanted).min(lines.len());
    // The byte cap is the second limit: forty short lines may be one long one.
    let mut used = 0;
    let mut cut = start;
    while cut < end {
        used += lines[cut].len() + 1;
        if used > READ_MAX_BYTES && cut > start {
            end = cut;
            break;
        }
        cut += 1;
    }

    let body = lines
        .get(start..end)
        .unwrap_or_default()
        .join("\n");

    Ok(FileSlice {
        Path: paths::display(root, &full),
        Content: body,
        StartLine: if total == 0 { 0 } else { start as u32 + 1 },
        TotalLines: total,
        Truncated: end < lines.len(),
    })
}

/// Writes a file, creating parent directories as needed.
pub fn write(root: &Path, relative: &str, content: &str) -> Result<String, String> {
    let full = paths::resolve(root, relative, true)?;
    std::fs::write(&full, content.as_bytes())
        .map_err(|error| format!("无法写入 {relative}：{error}"))?;
    Ok(format!(
        "已写入 {}（{} 字节）",
        paths::display(root, &full),
        content.len()
    ))
}

/// Replaces `old` with `new` in one file.
///
/// The replacement is exact: a model that guesses the surrounding text gets
/// an error naming the miss instead of a silently mangled file.
pub fn edit(
    root: &Path,
    relative: &str,
    old: &str,
    new: &str,
    replace_all: bool,
) -> Result<String, String> {
    if old.is_empty() {
        return Err("oldString 不能为空".to_string());
    }
    let full = paths::resolve(root, relative, false)?;
    let bytes = std::fs::read(&full).map_err(|error| format!("无法读取 {relative}：{error}"))?;
    let text = String::from_utf8_lossy(&bytes).to_string();

    let hits = text.matches(old).count();
    if hits == 0 {
        return Err(format!("{relative} 里没有找到 oldString，请先 file_read 确认原文"));
    }
    if hits > 1 && !replace_all {
        return Err(format!(
            "oldString 在 {relative} 里出现了 {hits} 次，请补充上下文，或把 replaceAll 设为 true"
        ));
    }

    let updated = if replace_all {
        text.replace(old, new)
    } else {
        text.replacen(old, new, 1)
    };
    std::fs::write(&full, updated.as_bytes())
        .map_err(|error| format!("无法写入 {relative}：{error}"))?;
    Ok(format!(
        "已修改 {}（替换 {}{} 处）",
        paths::display(root, &full),
        if replace_all { hits } else { 1 },
        if hits > 1 { "中的" } else { "" }
    ))
}

/// Lists a folder. `recursive` walks the whole subtree up to the entry cap.
pub fn list(root: &Path, relative: &str, recursive: bool) -> Result<DirListing, String> {
    let base = if relative.trim().is_empty() {
        root.to_path_buf()
    } else {
        paths::resolve(root, relative, false)?
    };
    if !base.is_dir() {
        return Err(format!("{relative} 不是文件夹"));
    }

    let mut entries = Vec::new();
    let mut truncated = false;
    collect(root, &base, recursive, &mut entries, &mut truncated)?;

    entries.sort_by(|left, right| {
        right
            .Directory
            .cmp(&left.Directory)
            .then_with(|| left.Path.cmp(&right.Path))
    });

    Ok(DirListing {
        Path: if relative.trim().is_empty() {
            ".".to_string()
        } else {
            paths::display(root, &base)
        },
        Entries: entries,
        Truncated: truncated,
    })
}

fn collect(
    root: &Path,
    folder: &Path,
    recursive: bool,
    out: &mut Vec<DirEntryInfo>,
    truncated: &mut bool,
) -> Result<(), String> {
    let reader = std::fs::read_dir(folder)
        .map_err(|error| format!("无法读取文件夹 {}：{error}", folder.display()))?;

    for item in reader {
        if out.len() >= LIST_MAX_ENTRIES {
            *truncated = true;
            return Ok(());
        }
        let item = match item {
            Ok(item) => item,
            Err(_) => continue,
        };
        let path = item.path();
        let metadata = match item.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        // `.git` and other dot directories are noise in a package listing, but
        // they are still the user's files, so only the walk is skipped.
        let name = item.file_name().to_string_lossy().to_string();
        out.push(DirEntryInfo {
            Path: paths::display(root, &path),
            Name: name.clone(),
            Directory: metadata.is_dir(),
            Size: metadata.len(),
        });
        if recursive && metadata.is_dir() && !name.starts_with('.') {
            collect(root, &path, recursive, out, truncated)?;
            if *truncated {
                return Ok(());
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{edit, list, read, write};

    fn workspace(tag: &str) -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!("morrow-builder-{tag}"));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).expect("temp dir");
        root.canonicalize().expect("canonical")
    }

    #[test]
    fn reading_pages_through_a_file() {
        let root = workspace("read");
        write(&root, "notes/a.md", "one\ntwo\nthree\nfour").expect("write");

        let first = read(&root, "notes/a.md", 1, 2).expect("read");
        assert_eq!(first.Content, "one\ntwo");
        assert_eq!(first.StartLine, 1);
        assert_eq!(first.TotalLines, 4);
        assert!(first.Truncated);

        let rest = read(&root, "notes/a.md", 3, 10).expect("read");
        assert_eq!(rest.Content, "three\nfour");
        assert!(!rest.Truncated);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn editing_needs_an_exact_and_unique_match() {
        let root = workspace("edit");
        write(&root, "a.md", "alpha beta alpha").expect("write");

        assert!(edit(&root, "a.md", "alpha", "gamma", false).is_err());
        assert!(edit(&root, "a.md", "missing", "x", false).is_err());
        edit(&root, "a.md", "alpha", "gamma", true).expect("replace all");
        assert_eq!(read(&root, "a.md", 1, 10).expect("read").Content, "gamma beta gamma");

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn listing_walks_a_subtree() {
        let root = workspace("list");
        write(&root, "knowledge/index.yaml", "chapters: []").expect("write");
        write(&root, "questions/generated/ch01.json", "{}").expect("write");

        let flat = list(&root, "", false).expect("list");
        assert_eq!(flat.Entries.len(), 2);
        assert!(flat.Entries[0].Directory);

        let deep = list(&root, "", true).expect("list");
        assert!(deep.Entries.iter().any(|entry| entry.Path.ends_with("ch01.json")));

        let _ = std::fs::remove_dir_all(&root);
    }
}
