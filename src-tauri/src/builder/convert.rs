use serde::Serialize;
use std::path::Path;

use super::paths;

/// A converted document never comes back larger than this: the model reads
/// Markdown as context, and a 300-page PDF would crowd out the conversation.
const CONVERT_MAX_BYTES: usize = 120 * 1024;

#[derive(Debug, Clone, Serialize)]
pub struct ConvertedDocument {
    #[serde(rename = "path")]
    pub Path: String,
    /// The document's own title, when the format carries one.
    #[serde(rename = "title")]
    pub Title: Option<String>,
    #[serde(rename = "markdown")]
    pub Markdown: String,
    #[serde(rename = "truncated")]
    pub Truncated: bool,
}

/// Converts one document to Markdown with markitdown's own converters.
///
/// The result is tool output only: nothing is written back to the workspace,
/// because a conversion is a read, and a stray `.md` next to the source would
/// end up inside the package.
pub fn convert(root: &Path, relative: &str) -> Result<ConvertedDocument, String> {
    let full = paths::resolve(root, relative, false)?;
    if full.is_dir() {
        return Err(format!("{relative} 是文件夹，不是文档"));
    }

    let bytes = std::fs::read(&full).map_err(|error| format!("无法读取 {relative}：{error}"))?;
    let info = markitdown_core::StreamInfo::from_path(&full.to_string_lossy());
    let document = markitdown_core::convert_document(&bytes, &info, &Default::default())
        .map_err(|error| format!("无法转换 {relative}：{error}"))?;

    let markdown = document.markdown;
    let truncated = markdown.len() > CONVERT_MAX_BYTES;
    let body = if truncated {
        let mut cut = CONVERT_MAX_BYTES;
        while cut > 0 && !markdown.is_char_boundary(cut) {
            cut -= 1;
        }
        format!(
            "{}\n\n（转换结果过长，后面约 {} KB 已省略。建议先用 shell 把它拆分，或只转换需要的部分。）",
            &markdown[..cut],
            (markdown.len() - cut) / 1024
        )
    } else {
        markdown
    };

    Ok(ConvertedDocument {
        Path: paths::display(root, &full),
        Title: document.title,
        Markdown: body,
        Truncated: truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::convert;

    #[test]
    fn a_plain_text_file_converts() {
        let root = std::env::temp_dir().join("morrow-builder-convert");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).expect("temp dir");
        std::fs::write(root.join("notes.txt"), "hello builder").expect("write");
        let canonical = root.canonicalize().expect("canonical");

        let result = convert(&canonical, "notes.txt").expect("convert");
        assert!(result.Markdown.contains("hello builder"));
        assert!(!result.Truncated);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn traversal_is_refused() {
        let root = std::env::temp_dir().join("morrow-builder-convert-guard");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).expect("temp dir");
        let canonical = root.canonicalize().expect("canonical");
        assert!(convert(&canonical, "../anything.txt").is_err());
        let _ = std::fs::remove_dir_all(&root);
    }
}
