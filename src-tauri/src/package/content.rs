use std::collections::BTreeMap;
use std::path::Path;

use serde::{Deserialize, Serialize};

use super::manifest::{PackageManifest, PackageSummary};
use super::paths::check_package_path;

/// Everything the app reads out of one installed package, as a single payload.
/// A package is small (a few hundred KB of YAML), so loading it whole keeps a
/// workspace self-contained and switching packages never leaves half of the
/// previous one behind.
#[derive(Debug, Clone, Serialize)]
pub struct PackageContent {
    #[serde(rename = "manifest")]
    pub Manifest: PackageSummary,
    #[serde(rename = "chapters")]
    pub Chapters: Vec<Chapter>,
    #[serde(rename = "points")]
    pub Points: Vec<Point>,
    #[serde(rename = "questions")]
    pub Questions: Vec<Question>,
    #[serde(rename = "solutions")]
    pub Solutions: Vec<Solution>,
    #[serde(rename = "relations")]
    pub Relations: Vec<Relation>,
    #[serde(rename = "tags")]
    pub Tags: Vec<Tag>,
    #[serde(rename = "sources")]
    pub Sources: Vec<SourceRef>,
    #[serde(rename = "stats")]
    pub Stats: ContentStats,
}

#[derive(Debug, Clone, Serialize)]
pub struct ContentStats {
    #[serde(rename = "chapters")]
    pub Chapters: usize,
    #[serde(rename = "points")]
    pub Points: usize,
    #[serde(rename = "questions")]
    pub Questions: usize,
    #[serde(rename = "relations")]
    pub Relations: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct Chapter {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "summary")]
    pub Summary: String,
    #[serde(rename = "order")]
    pub Order: i64,
    #[serde(rename = "pointIds")]
    pub PointIds: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Point {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "name")]
    pub Name: String,
    #[serde(rename = "chapterId")]
    pub ChapterId: String,
    #[serde(rename = "summary")]
    pub Summary: String,
    /// The Markdown body, with the front matter stripped.
    #[serde(rename = "body")]
    pub Body: String,
    #[serde(rename = "difficulty")]
    pub Difficulty: i64,
    #[serde(rename = "examImportance")]
    pub ExamImportance: String,
    #[serde(rename = "objectives")]
    pub Objectives: Vec<String>,
    #[serde(rename = "prerequisites")]
    pub Prerequisites: Vec<String>,
    #[serde(rename = "tags")]
    pub Tags: Vec<String>,
    #[serde(rename = "sources")]
    pub Sources: Vec<String>,
    #[serde(rename = "commonErrors")]
    pub CommonErrors: Vec<String>,
    #[serde(rename = "images")]
    pub Images: Vec<ContentImage>,
}

/// One authored figure. `kind` decides how `content` is read, so the front end
/// never has to guess between a package path, a data URI and inline markup.
#[derive(Debug, Clone, Serialize)]
pub struct ContentImage {
    #[serde(rename = "type")]
    pub Type: String,
    #[serde(rename = "kind")]
    pub Kind: String,
    #[serde(rename = "content")]
    pub Content: String,
    #[serde(rename = "position")]
    pub Position: String,
    #[serde(rename = "caption")]
    pub Caption: Option<String>,
    #[serde(rename = "alt")]
    pub Alt: Option<String>,
    #[serde(rename = "width")]
    pub Width: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Question {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "type")]
    pub Kind: String,
    #[serde(rename = "content")]
    pub Content: String,
    #[serde(rename = "options")]
    pub Options: Vec<QuestionOption>,
    #[serde(rename = "answerType")]
    pub AnswerType: String,
    #[serde(rename = "answer")]
    pub Answer: Vec<String>,
    #[serde(rename = "knowledgePoints")]
    pub KnowledgePoints: Vec<String>,
    #[serde(rename = "tags")]
    pub Tags: Vec<String>,
    #[serde(rename = "difficulty")]
    pub Difficulty: i64,
    #[serde(rename = "status")]
    pub Status: String,
    #[serde(rename = "sourceType")]
    pub SourceType: String,
    #[serde(rename = "sourceId")]
    pub SourceId: Option<String>,
    #[serde(rename = "estimatedMinutes")]
    pub EstimatedMinutes: Option<i64>,
    #[serde(rename = "images")]
    pub Images: Vec<ContentImage>,
}

#[derive(Debug, Clone, Serialize)]
pub struct QuestionOption {
    #[serde(rename = "key")]
    pub Key: String,
    #[serde(rename = "content")]
    pub Content: String,
}

/// One worked solution, keyed by the question it explains (MLPS §9).
///
/// Solutions live apart from questions on purpose: a question must stay
/// readable without one, and a later revision may add or improve a solution
/// without touching the question file or its checksum.
#[derive(Debug, Clone, Serialize)]
pub struct Solution {
    #[serde(rename = "questionId")]
    pub QuestionId: String,
    #[serde(rename = "summary")]
    pub Summary: String,
    #[serde(rename = "steps")]
    pub Steps: Vec<SolutionStep>,
    #[serde(rename = "finalAnswer")]
    pub FinalAnswer: String,
    #[serde(rename = "alternatives")]
    pub Alternatives: Vec<String>,
    #[serde(rename = "commonErrors")]
    pub CommonErrors: Vec<String>,
    #[serde(rename = "knowledgePoints")]
    pub KnowledgePoints: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SolutionStep {
    #[serde(rename = "index")]
    pub Index: i64,
    #[serde(rename = "content")]
    pub Content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Relation {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "from")]
    pub From: String,
    #[serde(rename = "to")]
    pub To: String,
    #[serde(rename = "type")]
    pub Kind: String,
    #[serde(rename = "strength")]
    pub Strength: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct Tag {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "name")]
    pub Name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SourceRef {
    #[serde(rename = "id")]
    pub Id: String,
    #[serde(rename = "title")]
    pub Title: String,
    #[serde(rename = "license")]
    pub License: String,
}

// --- wire shapes -----------------------------------------------------------

#[derive(Deserialize)]
struct IndexFile {
    chapters: Vec<IndexChapter>,
}

#[derive(Deserialize)]
struct IndexChapter {
    id: String,
    name: String,
    #[serde(default)]
    order: i64,
    #[serde(default)]
    summary: String,
    #[serde(default)]
    points: Vec<IndexPoint>,
}

#[derive(Deserialize)]
struct IndexPoint {
    id: String,
    file: String,
}

#[derive(Deserialize)]
struct FrontMatter {
    id: String,
    name: String,
    chapter: String,
    #[serde(default)]
    summary: String,
    #[serde(default)]
    difficulty: i64,
    #[serde(default)]
    exam_importance: String,
    #[serde(default)]
    learning_objectives: Vec<String>,
    #[serde(default)]
    prerequisites: Vec<String>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    sources: Vec<String>,
    #[serde(default)]
    common_errors: Vec<String>,
    #[serde(default)]
    images: Vec<RawImage>,
}

/// The wire shape of a figure; `position` is the only field the UI may assume,
/// so it defaults rather than turning a missing key into a lost image.
#[derive(Deserialize)]
struct RawImage {
    #[serde(rename = "type")]
    kind_type: String,
    #[serde(default)]
    kind: String,
    content: String,
    #[serde(default)]
    position: Option<String>,
    #[serde(default)]
    caption: Option<String>,
    #[serde(default)]
    alt: Option<String>,
    #[serde(default)]
    width: Option<i64>,
}

impl RawImage {
    fn into_image(self) -> ContentImage {
        ContentImage {
            Type: self.kind_type,
            // An author who omits `kind` almost certainly means a package path:
            // that is how a Markdown body references a figure too.
            Kind: if self.kind.is_empty() {
                "path".to_string()
            } else {
                self.kind
            },
            Content: self.content,
            Position: self.position.unwrap_or_else(|| "stem".to_string()),
            Caption: self.caption,
            Alt: self.alt,
            Width: self.width,
        }
    }
}

#[derive(Deserialize)]
struct QuestionIndexFile {
    files: Vec<QuestionIndexEntry>,
}

#[derive(Deserialize)]
struct QuestionIndexEntry {
    path: String,
    #[serde(default)]
    count: Option<usize>,
}

#[derive(Deserialize)]
struct QuestionFile {
    #[serde(default)]
    questions: Vec<RawQuestion>,
}

#[derive(Deserialize)]
struct RawQuestion {
    id: String,
    #[serde(rename = "type")]
    kind: String,
    content: String,
    #[serde(default)]
    options: Vec<RawOption>,
    answer: RawAnswer,
    #[serde(default)]
    knowledge_points: Vec<String>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    difficulty: i64,
    #[serde(default)]
    status: String,
    source: RawSource,
    #[serde(default)]
    estimated_minutes: Option<i64>,
    #[serde(default)]
    images: Vec<RawImage>,
}

#[derive(Deserialize)]
struct RawOption {
    id: String,
    content: String,
}

#[derive(Deserialize)]
struct RawAnswer {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    value: Vec<String>,
}

#[derive(Deserialize)]
struct RawSource {
    #[serde(rename = "type")]
    kind: String,
    #[serde(default)]
    source_id: Option<String>,
}

// --- solutions ------------------------------------------------------------

#[derive(Deserialize)]
struct SolutionIndexFile {
    #[serde(default)]
    files: Vec<SolutionIndexEntry>,
}

#[derive(Deserialize)]
struct SolutionIndexEntry {
    path: String,
    #[serde(default)]
    count: Option<usize>,
}

#[derive(Deserialize)]
struct SolutionFile {
    #[serde(default)]
    solutions: Vec<RawSolution>,
}

#[derive(Deserialize)]
struct RawSolution {
    question_id: String,
    explanation: RawExplanation,
    #[serde(default)]
    common_errors: Vec<String>,
    #[serde(default)]
    knowledge_points: Vec<String>,
}

#[derive(Deserialize)]
struct RawExplanation {
    #[serde(default)]
    summary: String,
    #[serde(default)]
    steps: Vec<RawStep>,
    #[serde(default)]
    final_answer: String,
    #[serde(default)]
    alternatives: Vec<String>,
}

#[derive(Deserialize)]
struct RawStep {
    #[serde(default)]
    index: i64,
    content: String,
}

#[derive(Deserialize)]
struct RelationsFile {
    #[serde(default)]
    relations: Vec<RawRelation>,
}#[derive(Deserialize)]
struct RawRelation {
    id: String,
    from: String,
    to: String,
    #[serde(rename = "type")]
    kind: String,
    #[serde(default = "one")]
    strength: f32,
}

fn one() -> f32 {
    1.0
}

#[derive(Deserialize)]
struct TagsFile {
    #[serde(default)]
    tags: Vec<RawTag>,
}

#[derive(Deserialize)]
struct RawTag {
    id: String,
    name: String,
}

#[derive(Deserialize)]
struct SourcesFile {
    #[serde(default)]
    sources: Vec<RawSourceEntry>,
}

#[derive(Deserialize)]
struct RawSourceEntry {
    id: String,
    title: String,
    #[serde(default)]
    license: String,
}

/// Reads one extracted package. Every declared path is re-checked against the
/// traversal rules here: the manifest came out of the archive, so it is as
/// untrusted as the content it points at.
pub fn load(root: &Path, manifest: PackageManifest) -> Result<PackageContent, String> {
    let read = |path: &str| -> Result<String, String> {
        check_package_path(path)?;
        std::fs::read_to_string(root.join(path))
            .map_err(|error| format!("无法读取 {path}：{error}"))
    };

    let (chapters, files) = load_chapters(&read(&manifest.Contents.Knowledge.Index)?)?;

    let mut points = Vec::new();
    for (point_id, file) in &files {
        let chapter_id = chapters
            .iter()
            .find(|chapter| chapter.PointIds.contains(point_id))
            .map(|chapter| chapter.Id.as_str())
            .ok_or_else(|| format!("知识点 {point_id} 没有所属章节"))?;
        points.push(load_point(&read(file)?, file, chapter_id)?);
    }

    let questions = load_questions(&read(&manifest.Contents.Questions.Index)?, &read)?;
    let solutions = match &manifest.Contents.Solutions {
        Some(index) => load_solutions(&read(&index.Index)?, &read)?,
        // A package without solutions is valid; the card simply shows no steps.
        None => Vec::new(),
    };
    let relations = load_relations(&read(&manifest.Contents.Relations.Index)?);

    Ok(PackageContent {
        Stats: ContentStats {
            Chapters: chapters.len(),
            Points: points.len(),
            Questions: questions.len(),
            Relations: relations.len(),
        },
        Manifest: manifest.Summary(),
        Chapters: chapters,
        Points: points,
        Questions: questions,
        Solutions: solutions,
        Relations: relations,
        Tags: load_tags(&read(&manifest.Contents.Taxonomy.Tags)?),
        Sources: load_sources(&read(&manifest.Contents.Citations.Sources)?),
    })
}

/// Returns the chapter list plus the id → file map the point loop needs, since
/// the file lives in the index while the metadata lives in the Markdown.
fn load_chapters(raw: &str) -> Result<(Vec<Chapter>, BTreeMap<String, String>), String> {
    let index: IndexFile = serde_yaml::from_str(raw)
        .map_err(|error| format!("knowledge/index.yaml 解析失败：{error}"))?;

    let mut files = BTreeMap::new();
    let mut chapters = Vec::new();

    for chapter in index.chapters {
        let mut point_ids = Vec::new();
        for point in &chapter.points {
            check_package_path(&point.file)?;
            files.insert(point.id.clone(), point.file.clone());
            point_ids.push(point.id.clone());
        }
        chapters.push(Chapter {
            Id: chapter.id,
            Name: chapter.name,
            Summary: chapter.summary,
            Order: chapter.order,
            PointIds: point_ids,
        });
    }
    chapters.sort_by_key(|chapter| chapter.Order);
    Ok((chapters, files))
}

fn load_point(raw: &str, path: &str, chapter_id: &str) -> Result<Point, String> {
    let (front, body) = split_front_matter(raw).ok_or_else(|| format!("{path} 缺少 front matter"))?;
    let data: FrontMatter = serde_yaml::from_str(front)
        .map_err(|error| format!("{path} front matter 解析失败：{error}"))?;

    if data.chapter != chapter_id {
        return Err(format!(
            "{path} 声明属于 {}，却挂在 {chapter_id} 下",
            data.chapter
        ));
    }

    Ok(Point {
        Id: data.id,
        Name: data.name,
        ChapterId: chapter_id.to_string(),
        Summary: data.summary,
        Body: body.trim().to_string(),
        Difficulty: data.difficulty,
        ExamImportance: data.exam_importance,
        Objectives: data.learning_objectives,
        Prerequisites: data.prerequisites,
        Tags: data.tags,
        Sources: data.sources,
        CommonErrors: data.common_errors,
        Images: data.images.into_iter().map(RawImage::into_image).collect(),
    })
}

fn load_questions(
    raw: &str,
    read: &impl Fn(&str) -> Result<String, String>,
) -> Result<Vec<Question>, String> {
    let index: QuestionIndexFile = serde_yaml::from_str(raw)
        .map_err(|error| format!("questions/index.yaml 解析失败：{error}"))?;

    let mut questions = Vec::new();
    for entry in index.files {
        check_package_path(&entry.path)?;
        let file: QuestionFile = serde_json::from_str(&read(&entry.path)?)
            .map_err(|error| format!("{} 解析失败：{error}", entry.path))?;
        if let Some(count) = entry.count {
            if count != file.questions.len() {
                return Err(format!(
                    "questions/index.yaml 宣称 {} 有 {count} 道题，实际为 {}",
                    entry.path,
                    file.questions.len()
                ));
            }
        }
        for question in file.questions {
            questions.push(Question {
                Id: question.id,
                Kind: question.kind,
                Content: question.content,
                Options: question
                    .options
                    .into_iter()
                    .map(|option| QuestionOption {
                        Key: option.id,
                        Content: option.content,
                    })
                    .collect(),
                AnswerType: question.answer.kind,
                Answer: question.answer.value,
                KnowledgePoints: question.knowledge_points,
                Tags: question.tags,
                Difficulty: question.difficulty,
                Status: question.status,
                SourceType: question.source.kind,
                SourceId: question.source.source_id,
                EstimatedMinutes: question.estimated_minutes,
                Images: question
                    .images
                    .into_iter()
                    .map(RawImage::into_image)
                    .collect(),
            });
        }
    }
    Ok(questions)
}

/// Reads every declared solution file.
///
/// A solution names its question rather than living under it, so nothing here
/// can fail because a question is missing; a stale solution is simply never
/// looked up. The count in the index is still checked, because a mismatch means
/// the index and the content have drifted apart.
fn load_solutions(
    raw: &str,
    read: &impl Fn(&str) -> Result<String, String>,
) -> Result<Vec<Solution>, String> {
    let index: SolutionIndexFile = serde_yaml::from_str(raw)
        .map_err(|error| format!("solutions/index.yaml 解析失败：{error}"))?;

    let mut solutions = Vec::new();
    for entry in index.files {
        check_package_path(&entry.path)?;
        let file: SolutionFile = serde_json::from_str(&read(&entry.path)?)
            .map_err(|error| format!("{} 解析失败：{error}", entry.path))?;
        if let Some(count) = entry.count {
            if count != file.solutions.len() {
                return Err(format!(
                    "solutions/index.yaml 宣称 {} 有 {count} 份解析，实际为 {}",
                    entry.path,
                    file.solutions.len()
                ));
            }
        }
        for solution in file.solutions {
            solutions.push(Solution {
                QuestionId: solution.question_id,
                Summary: solution.explanation.summary,
                Steps: solution
                    .explanation
                    .steps
                    .into_iter()
                    .map(|step| SolutionStep {
                        Index: step.index,
                        Content: step.content,
                    })
                    .collect(),
                FinalAnswer: solution.explanation.final_answer,
                Alternatives: solution.explanation.alternatives,
                CommonErrors: solution.common_errors,
                KnowledgePoints: solution.knowledge_points,
            });
        }
    }
    Ok(solutions)
}

fn load_relations(raw: &str) -> Vec<Relation> {
    let file: RelationsFile = serde_yaml::from_str(raw).unwrap_or(RelationsFile {
        relations: Vec::new(),
    });
    file.relations
        .into_iter()
        .map(|relation| Relation {
            Id: relation.id,
            From: relation.from,
            To: relation.to,
            Kind: relation.kind,
            Strength: relation.strength,
        })
        .collect()
}

fn load_tags(raw: &str) -> Vec<Tag> {
    let file: TagsFile = serde_yaml::from_str(raw).unwrap_or(TagsFile { tags: Vec::new() });
    file.tags
        .into_iter()
        .map(|tag| Tag {
            Id: tag.id,
            Name: tag.name,
        })
        .collect()
}

fn load_sources(raw: &str) -> Vec<SourceRef> {
    let file: SourcesFile = serde_yaml::from_str(raw).unwrap_or(SourcesFile {
        sources: Vec::new(),
    });
    file.sources
        .into_iter()
        .map(|source| SourceRef {
            Id: source.id,
            Title: source.title,
            License: source.license,
        })
        .collect()
}

/// Splits `---\n…\n---\nbody`. Returns `None` when there is no front matter.
pub fn split_front_matter(raw: &str) -> Option<(&str, &str)> {
    let trimmed = raw.strip_prefix('\u{feff}').unwrap_or(raw);
    let rest = trimmed.strip_prefix("---")?;
    let rest = rest
        .strip_prefix("\r\n")
        .or_else(|| rest.strip_prefix('\n'))?;

    let mut offset = 0;
    for line in rest.split_inclusive('\n') {
        if line.trim_end() == "---" {
            return Some((&rest[..offset], &rest[offset + line.len()..]));
        }
        offset += line.len();
    }
    None
}

#[cfg(test)]
mod tests {
    use super::{load, split_front_matter};

    #[test]
    fn front_matter_is_split_from_the_body() {
        let raw = "---\nid: a.b\nname: 名字\n---\n\n# 标题\n正文";
        let (front, body) = split_front_matter(raw).expect("front matter");
        assert!(front.contains("id: a.b"));
        assert!(body.trim_start().starts_with("# 标题"));
    }

    #[test]
    fn a_document_without_front_matter_is_rejected() {
        assert!(split_front_matter("# 只有正文").is_none());
    }

    #[test]
    fn a_point_keeps_the_common_errors_and_figures_it_declares() {
        let raw = r#"---
id: a.b
name: 名字
chapter: c.one
difficulty: 2
exam_importance: high
common_errors:
  - 漏掉左右导数
images:
  - type: figure
    kind: path
    content: media/figures/a.png
    caption: 图
---

正文"#;
        let point = super::load_point(raw, "a.md", "c.one").expect("point");
        assert_eq!(point.CommonErrors, vec!["漏掉左右导数".to_string()]);
        assert_eq!(point.Images.len(), 1);
        assert_eq!(point.Images[0].Content, "media/figures/a.png");
        // An author who omits the anchor means the stem.
        assert_eq!(point.Images[0].Position, "stem");
    }

    #[test]
    fn the_sample_package_loads_end_to_end() {
        let Some(root) = crate::package::sample_package() else {
            eprintln!("skipped: no sample package in packages/");
            return;
        };

        let manifest: crate::package::manifest::PackageManifest = serde_yaml::from_str(
            &std::fs::read_to_string(root.join("manifest.yaml")).expect("manifest"),
        )
        .expect("parse");

        let content = load(&root, manifest).expect("content loads");
        // 10 textbook chapters, a reference appendix and 2 hand-written ones.
        assert_eq!(content.Stats.Chapters, 13);
        assert_eq!(content.Stats.Points, 72);
        assert_eq!(content.Stats.Questions, 153);
        assert!(content.Points.iter().all(|point| !point.Body.is_empty()));
        assert!(content
            .Questions
            .iter()
            .all(|question| !question.KnowledgePoints.is_empty()));
    }
}
