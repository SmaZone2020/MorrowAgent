/**
 * Compiles the YAML knowledge base into one JSON module.
 *
 * The app never parses YAML at runtime: the files are the source of truth for
 * authors, and this script is the only bridge. Run through `predev` / `prebuild`
 * so a stale bundle is impossible to ship by accident.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const knowledgeRoot = join(projectRoot, "data", "yaml");
const outFile = join(projectRoot, "data", "json", "knowledge.json");

function collectYamlFiles(target) {
  const stats = statSync(target);
  if (stats.isFile()) return /\.ya?ml$/i.test(target) ? [target] : [];

  return readdirSync(target).flatMap((entry) => {
    const full = join(target, entry);
    return statSync(full).isDirectory() ? collectYamlFiles(full) : /\.ya?ml$/i.test(entry) ? [full] : [];
  });
}

function readDocument(file) {
  try {
    return parseYaml(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${relative(projectRoot, file)} 解析失败：${error.message}`);
  }
}

/**
 * Only the fields the UI actually renders survive this pass. Keeping the whole
 * node would leak authoring-only detail into the bundle and make the output
 * schema drift every time the source grows a field.
 */
function pickImage(image) {
  return {
    type: image.type,
    kind: image.kind ?? defaultKind(image),
    content: image.content,
    position: image.position ?? "stem",
    caption: image.caption,
    alt: image.alt,
    width: image.width,
  };
}

// Authors are not required to spell out `kind`; the mime sniff below keeps the
// renderer from guessing wrong when they omit it.
function defaultKind(image) {
  if (image.type === "formula") return "latex";
  if (/^<\s*(svg|\?xml)/i.test(image.content)) return "svg";
  if (image.content.startsWith("data:")) return "data_uri";
  if (/^https?:\/\//i.test(image.content)) return "url";
  return "path";
}

function pickKnowledgePoint(point) {
  return {
    id: point.id,
    name: point.name,
    chapterId: point.chapter_id,
    description: point.description,
    objectives: point.learning_objectives ?? [],
    prerequisites: point.prerequisites ?? [],
    related: point.related_points ?? [],
    difficulty: point.difficulty,
    difficultyBasis: point.difficulty_basis ?? "",
    examImportance: point.exam_importance,
    examLevels: point.exam_levels ?? [],
    commonErrors: point.common_errors ?? [],
    images: (point.images ?? []).map(pickImage),
  };
}

function pickQuestion(question) {
  return {
    id: question.id,
    content: question.content,
    questionType: question.question_type,
    difficulty: question.difficulty,
    difficultyBasis: question.difficulty_basis ?? "",
    examLevel: question.exam_level,
    options: (question.options ?? []).map((option) => ({
      key: option.key,
      content: option.content,
    })),
    answer: question.answer,
    explanation: question.explanation,
    images: (question.images ?? []).map(pickImage),
    knowledgeTags: question.knowledge_tags ?? [],
    solutionMethods: question.solution_methods ?? [],
    commonErrors: (question.common_errors ?? []).map((error) => ({
      errorType: error.error_type,
      description: error.description,
    })),
    estimatedMinutes: question.estimated_minutes,
    sourceType: question.source_type,
    sourceReference: question.source_reference,
    version: question.version ?? "",
  };
}

function main() {
  if (!existsSync(knowledgeRoot)) {
    console.error(
      `\u2717 没有知识库源目录：${relative(projectRoot, knowledgeRoot)}（YAML 源文件统一放在 data/yaml/）`,
    );
    process.exitCode = 1;
    return;
  }

  const files = collectYamlFiles(knowledgeRoot);
  const chapters = new Map();
  const questions = [];

  for (const file of files) {
    const doc = readDocument(file);

    if (doc?.chapter) {
      const chapter = doc.chapter;
      const existing = chapters.get(chapter.id);
      if (existing) {
        existing.points.push(...chapter.knowledge_points.map(pickKnowledgePoint));
      } else {
        chapters.set(chapter.id, {
          id: chapter.id,
          name: chapter.name,
          subjectId: chapter.subject_id,
          version: chapter.version,
          points: chapter.knowledge_points.map(pickKnowledgePoint),
        });
      }
      continue;
    }

    if (Array.isArray(doc?.questions)) {
      questions.push(...doc.questions.map(pickQuestion));
      continue;
    }

    // Exam registrations are source bookkeeping, not drillable content, so they
    // deliberately stay out of the runtime bundle.
    if (Array.isArray(doc?.exam_sources)) continue;

    throw new Error(`${relative(projectRoot, file)} 无法识别：需要 chapter、questions 或 exam_sources 顶层键`);
  }

  // No timestamp: the bundle is a pure function of the YAML, so regenerating it
  // without source changes must not produce a diff or a rebuild.
  const payload = {
    chapters: [...chapters.values()],
    questions,
  };

  const next = `${JSON.stringify(payload, null, 2)}\n`;
  mkdirSync(join(outFile, ".."), { recursive: true });

  const previous = existsSync(outFile) ? readFileSync(outFile, "utf8") : "";
  if (previous !== next) writeFileSync(outFile, next, "utf8");

  console.log(
    `\u2713 知识包已生成：${chapters.size} 章，${[...chapters.values()].reduce((sum, chapter) => sum + chapter.points.length, 0)} 个知识点，${questions.length} 道题 -> ${relative(projectRoot, outFile)}`,
  );
}

main();
