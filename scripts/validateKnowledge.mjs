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

function loadSchema(name) {
  return JSON.parse(readFileSync(join(schemaDir, name), "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
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

  // A question may only point at a registered exam source. The license check
  // is the enforcement point for "unlicensed papers stay metadata-only": if a
  // question quotes a paper whose license was never cleared, the bundle would
  // ship text we have no right to redistribute.
  for (const ref of report.pendingExamSources) {
    const source = report.examSources.get(ref.id);

    if (!source) {
      errors.push(`${ref.file} 题 ${ref.owner} 引用了未登记的真题 ${ref.id}`);
      continue;
    }

    if (source.license !== "public_domain") {
      errors.push(
        `${ref.file} 题 ${ref.owner} 引用了真题 ${ref.id}，但其 license 为 ${source.license}，不得引用题干`,
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

function main() {
  const targets = process.argv.slice(2);
  const roots = targets.length > 0 ? targets : [join(projectRoot, "knowledge")];

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
