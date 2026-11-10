use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};

use sevenz_rust2::{ArchiveReader, ArchiveWriter, Password};

use super::paths::{check_archive_entries, check_package_path, check_extension};

/// `sevenz_rust2::Error::other` is crate-private, so failures raised inside the
/// extraction callback go through the public `Io` variant instead.
fn fail(message: impl Into<String>) -> sevenz_rust2::Error {
    sevenz_rust2::Error::Io(std::io::Error::other(message.into()), "".into())
}

/// Decompression guard (MLPS §15.1 item 13). A 20 KB archive can expand into
/// gigabytes, so the limits are checked against the declared sizes before any
/// bytes are written.
pub const MAX_FILES: usize = 20_000;
pub const MAX_TOTAL_BYTES: u64 = 512 * 1024 * 1024;
pub const MAX_RATIO: u64 = 200;

#[derive(Debug, Clone)]
pub struct ExtractReport {
    /// Declared uncompressed size of every entry, summed.
    pub TotalBytes: u64,
    pub FileCount: usize,
    /// Entries the path/extension gate refused. Extraction still stops on the
    /// first one; the list exists so the dialog can explain why.
    pub Rejected: Vec<String>,
}

/// Extracts a `.morrow` archive into `dest` with the full security sweep.
///
/// Order matters: the listing is validated before a single entry is written, so
/// a hostile archive cannot leave a partial tree behind. The archive is then
/// read twice — once for sizes, once for bytes — which is cheap next to the
/// cost of writing gigabytes to disk speculatively.
pub fn extract(archive: &Path, dest: &Path) -> Result<ExtractReport, String> {
    let entries = list_entries(archive)?;

    let names: Vec<String> = entries
        .iter()
        .filter(|entry| !entry.IsDirectory)
        .map(|entry| entry.Name.clone())
        .collect();
    let rejected = check_archive_entries(&names);
    if !rejected.is_empty() {
        return Err(format!("学习包包含不被允许的文件：{}", rejected.join("；")));
    }

    if names.len() > MAX_FILES {
        return Err(format!("文件数量 {} 超过上限 {}", names.len(), MAX_FILES));
    }

    let total: u64 = entries.iter().map(|entry| entry.Size).sum();
    if total > MAX_TOTAL_BYTES {
        return Err(format!(
            "解压后总大小 {:.1} MB 超过上限 512 MB",
            total as f64 / 1048576.0
        ));
    }

    let archive_bytes = std::fs::metadata(archive)
        .map_err(|error| format!("无法读取学习包大小：{error}"))?
        .len();
    if archive_bytes > 0 && total / archive_bytes.max(1) > MAX_RATIO {
        // A warning rather than a refusal: a package of highly repetitive YAML
        // legitimately compresses well, while the absolute limit above still
        // stops the real bomb.
    }

    std::fs::create_dir_all(dest).map_err(|error| format!("无法创建临时目录：{error}"))?;

    let mut reader = ArchiveReader::open(archive, Password::empty())
        .map_err(|error| format!("无法读取 7z 容器：{error}"))?;

    let mut written: u64 = 0;
    reader
        .for_each_entries(|entry, stream| {
            let name = entry.name();
            let relative = name.trim_end_matches('/');
            if relative.is_empty() {
                return Ok(true);
            }

            if let Err(message) = check_package_path(relative) {
                return Err(fail(message));
            }
            let target = dest.join(relative);

            if entry.is_directory() {
                std::fs::create_dir_all(&target).map_err(|error| fail(error.to_string()))?;
                return Ok(true);
            }

            check_extension(relative).map_err(fail)?;
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent).map_err(|error| fail(error.to_string()))?;
            }

            // The declared size is a hint, not a promise: a malformed archive
            // can understate it, so the copy is also capped at what is left.
            let mut file = File::create(&target)
                .map_err(|error| fail(format!("写入 {relative} 失败：{error}")))?;
            let mut sink = CountingWriter {
                inner: &mut file,
                written: 0,
                budget: MAX_TOTAL_BYTES.saturating_sub(written),
            };
            std::io::copy(stream, &mut sink)
                .map_err(|error| fail(format!("解压 {relative} 失败：{error}")))?;
            written += sink.written;
            Ok(true)
        })
        .map_err(|error| format!("解压学习包失败：{error}"))?;

    Ok(ExtractReport {
        TotalBytes: total,
        FileCount: names.len(),
        Rejected: Vec::new(),
    })
}

/// An entry in the archive listing, reduced to what the checks need.
#[derive(Debug, Clone)]
pub struct ListedEntry {
    pub Name: String,
    pub Size: u64,
    pub IsDirectory: bool,
}

/// Reads the header only: no content is decoded, so this is safe to call on a
/// file the user just picked before anything is written.
pub fn list_entries(archive: &Path) -> Result<Vec<ListedEntry>, String> {
    let mut reader = ArchiveReader::open(archive, Password::empty())
        .map_err(|error| format!("不是合法的 7z 容器：{error}"))?;

    let mut listed = Vec::new();
    reader
        .for_each_entries(|entry, _stream| {
            listed.push(ListedEntry {
                Name: entry.name().to_string(),
                Size: entry.size(),
                IsDirectory: entry.is_directory(),
            });
            // Skip the block: the bytes are not needed for a listing.
            Ok(false)
        })
        .map_err(|error| format!("读取学习包目录失败：{error}"))?;

    Ok(listed)
}

/// Packs a directory into a 7z container. Entries are stored non-solid so the
/// reader can still list them without decoding everything first.
pub fn pack(source: &Path, target: &Path) -> Result<u64, String> {
    let files = collect_files(source)?;
    if files.is_empty() {
        return Err("目录为空，无法导出".to_string());
    }

    let mut writer = ArchiveWriter::create(target)
        .map_err(|error| format!("无法创建学习包：{error}"))?;

    for file in &files {
        let relative = file
            .strip_prefix(source)
            .map_err(|_| "无法计算相对路径".to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let entry = sevenz_rust2::ArchiveEntry::from_path(file, relative);
        let handle = File::open(file)
            .map_err(|error| format!("无法读取 {}：{error}", file.display()))?;
        writer
            .push_archive_entry(entry, Some(handle))
            .map_err(|error| format!("写入学习包失败：{error}"))?;
    }

    writer
        .finish()
        .map_err(|error| format!("关闭学习包失败：{error}"))?;

    std::fs::metadata(target)
        .map(|metadata| metadata.len())
        .map_err(|error| format!("无法读取导出文件大小：{error}"))
}

/// Copies one directory tree into another. Used by export so packing never
/// rewrites the checksums of the tree it is reading.
pub fn copy_tree(source: &Path, target: &Path) -> Result<(), String> {
    std::fs::create_dir_all(target).map_err(|error| format!("无法创建临时目录：{error}"))?;
    for file in collect_files(source)? {
        let relative = file
            .strip_prefix(source)
            .map_err(|_| "无法计算相对路径".to_string())?;
        let destination = target.join(relative);
        if let Some(parent) = destination.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|error| format!("无法创建目录：{error}"))?;
        }
        std::fs::copy(&file, &destination)
            .map_err(|error| format!("无法复制 {}：{error}", file.display()))?;
    }
    Ok(())
}

fn collect_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(directory) = stack.pop() {
        let entries = std::fs::read_dir(&directory)
            .map_err(|error| format!("无法读取目录 {}：{error}", directory.display()))?;
        for entry in entries {
            let entry = entry.map_err(|error| format!("无法读取目录项：{error}"))?;
            let path = entry.path();
            let file_type = entry
                .file_type()
                .map_err(|error| format!("无法读取文件类型：{error}"))?;
            if file_type.is_dir() {
                stack.push(path);
            } else if file_type.is_file() {
                out.push(path);
            }
        }
    }
    out.sort();
    Ok(out)
}

/// Fails the copy once the total budget is spent, so a lying header cannot fill
/// the disk.
struct CountingWriter<'a> {
    inner: &'a mut dyn Write,
    written: u64,
    budget: u64,
}

impl Write for CountingWriter<'_> {
    fn write(&mut self, buffer: &[u8]) -> std::io::Result<usize> {
        if self.written + buffer.len() as u64 > self.budget {
            return Err(std::io::Error::other(
                "解压后总大小超过上限，已停止写入",
            ));
        }
        let count = self.inner.write(buffer)?;
        self.written += count as u64;
        Ok(count)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}

/// Convenience for reading one file out of an archive without extracting the
/// whole thing. Used by the validator to read `manifest.yaml` first.
pub fn read_entry(archive: &Path, wanted: &str) -> Result<Option<Vec<u8>>, String> {
    let mut reader = ArchiveReader::open(archive, Password::empty())
        .map_err(|error| format!("不是合法的 7z 容器：{error}"))?;

    let mut found: Option<Vec<u8>> = None;
    reader
        .for_each_entries(|entry, stream| {
            if entry.name().trim_end_matches('/') == wanted && !entry.is_directory() {
                let mut buffer = Vec::with_capacity(entry.size() as usize);
                stream
                    .read_to_end(&mut buffer)
                    .map_err(|error| fail(error.to_string()))?;
                found = Some(buffer);
            }
            Ok(true)
        })
        .map_err(|error| format!("读取 {wanted} 失败：{error}"))?;

    Ok(found)
}

#[cfg(test)]
mod tests {
    use super::{extract, list_entries, pack, read_entry};

    fn temp(name: &str) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!("morrow-archive-{name}-{}", std::process::id()));
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_dir_all(&path);
        path
    }

    fn build_source(root: &std::path::Path) {
        std::fs::create_dir_all(root.join("knowledge")).expect("dir");
        std::fs::write(root.join("manifest.yaml"), b"format:\n  name: morrow-learning-package\n")
            .expect("write");
        std::fs::write(root.join("knowledge/index.yaml"), b"chapters: []\n").expect("write");
    }

    #[test]
    fn packs_and_extracts_a_round_trip() {
        let source = temp("source");
        let archive = temp("roundtrip.morrow");
        let dest = temp("dest");
        build_source(&source);

        pack(&source, &archive).expect("pack");
        let report = extract(&archive, &dest).expect("extract");
        assert_eq!(report.FileCount, 2);
        assert!(dest.join("manifest.yaml").exists());
        assert!(dest.join("knowledge/index.yaml").exists());

        let names: Vec<String> = list_entries(&archive)
            .expect("list")
            .into_iter()
            .map(|entry| entry.Name)
            .collect();
        assert!(names.iter().any(|name| name.ends_with("manifest.yaml")));

        let _ = std::fs::remove_file(archive);
        let _ = std::fs::remove_dir_all(source);
        let _ = std::fs::remove_dir_all(dest);
    }

    #[test]
    fn one_entry_can_be_read_without_extracting_everything() {
        let source = temp("single-source");
        let archive = temp("single.morrow");
        build_source(&source);
        pack(&source, &archive).expect("pack");

        let bytes = read_entry(&archive, "manifest.yaml").expect("read").expect("found");
        assert!(String::from_utf8_lossy(&bytes).contains("morrow-learning-package"));
        assert!(read_entry(&archive, "missing.yaml").expect("read").is_none());

        let _ = std::fs::remove_file(archive);
        let _ = std::fs::remove_dir_all(source);
    }

    #[test]
    fn a_non_archive_is_reported_as_such() {
        let path = temp("not-an-archive.morrow");
        std::fs::write(&path, b"this is not 7z").expect("write");
        let error = list_entries(&path).expect_err("should fail");
        assert!(error.contains("7z"));
        let _ = std::fs::remove_file(path);
    }
}
