import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const schemaDir = join(projectRoot, "schemas");

const KNOWLEDGE_SCHEMA = "knowledge-point.schema.json";
const QUESTION_SCHEMA = "question.schema.json";
const EXAM_SOURCE_SCHEMA = "exam-source.schema.json";
const CONTENT_IMAGE_SCHEMA = "content-image.schema.json";

function loadSchema(name) {
  return JSON.parse(readFileSync(join(schemaDir, name), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
// The content-image schema is referenced by both knowledge points and questions,
// so it has to be registered before either of them compiles.
ajv.addSchema(loadSchema(CONTENT_IMAGE_SCHEMA));
const validateKnowledgePoint = ajv.compile(loadSchema(KNOWLEDGE_SCHEMA));
const validateQuestion = ajv.compile(loadSchema(QUESTION_SCHEMA));
const validateExamSource = ajv.compile(loadSchema(EXAM_SOURCE_SCHEMA));

function fail(message) {
  console.error(`\u2717 ${message}`);
  return 1;
}

function collectYamlFiles(target) {
  const stats = statSync(target);
  if (stats.isFile()) return [target];

  const files = [];
  for (const entry of readdirSync(target)) {
    const full = join(target, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectYamlFiles(full));
    } else if (/\.ya?ml$/i.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function formatAjvErrors(errors) {
  return (errors ?? [])
    .map((error) => {
      const at = error.instancePath || "(root)";
      return `    ${at} ${error.message}`;
    })
    .join("\n");
}

function readDocument(file) {
  const text = readFileSync(file, "utf8");
  try {
    return parseYaml(text);
  } catch (error) {
    throw new Error(`${file} YAML 解析失败：${error.message}`);
  }
}

function validateKnowledgePoints(doc, file, report) {
  const chapter = doc.chapter;
  if (!chapter || !Array.isArray(chapter.knowledge_points)) {
    throw new Error(`${file} 缺少 chapter.knowledge_points 数组`);
  }

  for (const point of chapter.knowledge_points) {
    const label = point?.id ?? "(缺少 id)";
    if (!validateKnowledgePoint(point)) {
      throw new Error(
        `${file} 知识点 ${label} 未通过 Schema 校验：\n${formatAjvErrors(
          validateKnowledgePoint.errors,
        )}`,
      );
    }

    if (report.knowledgePoints.has(point.id)) {
      throw new Error(
        `${file} 知识点 ID 重复：${point.id}（已出现在 ${report.knowledgePoints.get(point.id)}）`,
      );
    }

    if (point.chapter_id !== chapter.id) {
      throw new Error(
        `${file} 知识点 ${point.id} 的 chapter_id 与所在章节 ${chapter.id} 不一致`,
      );
    }

    report.knowledgePoints.set(point.id, file);
    report.pendingPrerequisites.push(
      ...(point.prerequisites ?? []).map((id) => ({ id, owner: point.id, file })),
    );
    report.pendingRelated.push(
      ...(point.related_points ?? []).map((id) => ({ id, owner: point.id, file })),
    );
  }
}

function validateExamSources(doc, file, report) {
  if (!Array.isArray(doc.exam_sources)) {
    throw new Error(`${file} 缺少 exam_sources 数组`);
  }

  for (const source of doc.exam_sources) {
    const label = source?.id ?? "(缺少 id)";
    if (!validateExamSource(source)) {
      throw new Error(
        `${file} 真题登记 ${label} 未通过 Schema 校验：\n${formatAjvErrors(
          validateExamSource.errors,
        )}`,
      );
    }

    if (report.examSources.has(source.id)) {
      throw new Error(
        `${file} 真题登记 ID 重复：${source.id}（已出现在 ${report.examSources.get(source.id)}）`,
      );
    }

    report.examSources.set(source.id, { file, license: source.license });
  }
}

function validateQuestions(doc, file, report) {
  if (!Array.isArray(doc.questions)) {
    throw new Error(`${file} 缺少 questions 数组`);
  }

  for (const question of doc.questions) {
    const label = question?.id ?? "(缺少 id)";
    if (!validateQuestion(question)) {
      throw new Error(
        `${file} 题 ${label} 未通过 Schema 校验：\n${formatAjvErrors(
          validateQuestion.errors,
        )}`,
      );
    }

    if (report.questions.has(question.id)) {
      throw new Error(
        `${file} 题 ID 重复：${question.id}（已出现在 ${report.questions.get(question.id)}）`,
      );
    }

    report.questions.set(question.id, file);
    report.pendingTags.push(
      ...question.knowledge_tags.map((id) => ({ id, owner: question.id, file })),
    );

    if (question.source_exam_id) {
      report.pendingExamSources.push({
        id: question.source_exam_id,
        owner: question.id,
        file,
        sourceType: question.source_type,
      });
    }

    const keys = (question.options ?? []).map((option) => option.key);
    if (new Set(keys).size !== keys.length) {
      throw new Error(`${file} 题 ${question.id} 的选项 key 重复`);
    }

    if (question.options) {
      const answerKeys = question.answer.split("").sort().join("");
      const sortedKeys = [...keys].sort().join("");
      const missing = answerKeys.split("").filter((key) => !sortedKeys.includes(key));
      if (missing.length > 0) {
        throw new Error(
          `${file} 题 ${question.id} 的答案 ${question.answer} 引用了不存在的选项`,
        );
      }
    }

    // A position pointing at a missing option would silently drop the image at
    // render time, so it is rejected at the source instead.
    for (const image of question.images ?? []) {
      const position = image.position ?? "stem";
      if (position.startsWith("option:")) {
        const key = position.slice("option:".length);
        if (!keys.includes(key)) {
          throw new Error(
            `${file} 题 ${question.id} 的图片挂载点 ${position} 指向不存在的选项`,
          );
        }
      }
    }
  }
}

function resolveReferences(report) {
  const errors = [];

  for (const ref of report.pendingTags) {
    if (!report.knowledgePoints.has(ref.id)) {
      errors.push(
        `${ref.file} 题 ${ref.owner} 引用了未知知识点 ${ref.id}`,
      );
    }
  }

  for (const ref of [...report.pendingPrerequisites, ...report.pendingRelated]) {
    if (!report.knowledgePoints.has(ref.id)) {
      errors.push(
        `${ref.file} 知识点 ${ref.owner} 引用了未知知识点 ${ref.id}`,
      );
    }
  }

  // A question may only point at a registered exam source. Only `real_exam`
  // quotes paper text, so only it needs a cleared license: an `adapted_exam`
  // stem is self-written and merely cites the registry entry for provenance.
  for (const ref of report.pendingExamSources) {
    const source = report.examSources.get(ref.id);

    if (!source) {
      errors.push(`${ref.file} 题 ${ref.owner} 引用了未登记的真题 ${ref.id}`);
      continue;
    }

    if (ref.sourceType === "real_exam" && source.license !== "public_domain") {
      errors.push(
        `${ref.file} 题 ${ref.owner} 以 real_exam 引用了真题 ${ref.id}，但其 license 为 ${source.license}，不得收录题干原文`,
      );
    }
  }

  return errors;
}

/**
 * A prerequisite cycle makes every point in the loop unlearnable: each one
 * waits for the next. The reference check above already rejects unknown ids,
 * so the graph here is guaranteed to be closed and DFS is enough.
 */
function findPrerequisiteCycles(report) {
  const edges = new Map();
  for (const ref of report.pendingPrerequisites) {
    if (!edges.has(ref.owner)) edges.set(ref.owner, []);
    edges.get(ref.owner).push(ref);
  }

  const state = new Map();
  const errors = [];
  const reported = new Set();

  const visit = (id) => {
    state.set(id, "open");
    for (const edge of edges.get(id) ?? []) {
      const next = state.get(edge.id);
      if (next === "open") {
        const pair = [edge.owner, edge.id].sort().join(" -> ");
        if (!reported.has(pair)) {
          reported.add(pair);
          errors.push(
            `${edge.file} 知识点 ${edge.owner} 与 ${edge.id} 互为前置，形成循环`,
          );
        }
        continue;
      }
      if (!next) visit(edge.id);
    }
    state.set(id, "done");
  };

  for (const id of edges.keys()) {
    if (!state.has(id)) visit(id);
  }

  return errors;
}

/**
 * Where the YAML sources live.
 *
 * `data/yaml` is the current convention, but the directory is gitignored and a
 * fresh clone has none of it. Falling back to the older `knowledge/` root keeps
 * an existing checkout working, and the error below says what to do when
 * neither exists, rather than reporting a missing path as if it were a typo.
 */
function defaultRoot() {
  for (const candidate of ["data/yaml", "knowledge"]) {
    const full = join(projectRoot, candidate);
    try {
      if (statSync(full).isDirectory()) return full;
    } catch {
      // Not there; try the next one.
    }
  }
  return null;
}

function main() {
  const targets = process.argv.slice(2);
  const fallback = defaultRoot();
  if (targets.length === 0 && !fallback) {
    return fail(
      "没有知识库源目录：请把 YAML 放进 data/yaml/（约定见 prompts/conventions.md），或把目录作为参数传入",
    );
  }
  const roots = targets.length > 0 ? targets : [fallback];

  let files = [];
  for (const root of roots) {
    try {
      files.push(...collectYamlFiles(resolve(root)));
    } catch {
      return fail(`路径不存在或不可读：${root}`);
    }
  }

  if (files.length === 0) {
    return fail("没有找到任何 YAML 文件");
  }

  const report = {
    knowledgePoints: new Map(),
    questions: new Map(),
    examSources: new Map(),
    pendingPrerequisites: [],
    pendingRelated: [],
    pendingTags: [],
    pendingExamSources: [],
  };

  try {
    for (const file of files) {
      const doc = readDocument(file);
      const shown = relative(projectRoot, file);

      if (doc && doc.chapter) {
        validateKnowledgePoints(doc, shown, report);
      } else if (doc && Array.isArray(doc.questions)) {
        validateQuestions(doc, shown, report);
      } else if (doc && Array.isArray(doc.exam_sources)) {
        validateExamSources(doc, shown, report);
      } else {
        throw new Error(
          `${shown} 无法识别：需要 chapter、questions 或 exam_sources 顶层键`,
        );
      }
    }
  } catch (error) {
    return fail(error.message);
  }

  const referenceErrors = [
    ...resolveReferences(report),
    ...findPrerequisiteCycles(report),
  ];
  if (referenceErrors.length > 0) {
    for (const message of referenceErrors) console.error(`\u2717 ${message}`);
    return 1;
  }

  console.log(
    `\u2713 校验通过：${files.length} 个文件，${report.knowledgePoints.size} 个知识点，${report.questions.size} 道题，${report.examSources.size} 条真题登记`,
  );
  return 0;
}

process.exit(main());
