import { existsSync } from "node:fs";
import { join } from "node:path";
import { readJson, readYaml } from "../documents.mjs";
import { checkPackagePath } from "../paths.mjs";
import { formatErrors } from "../schemas.mjs";

/**
 * Questions are validated per file so one broken JSON does not hide the rest,
 * and cross-file checks (duplicate ids, dangling knowledge tags) run after.
 */
export function validateQuestions(ctx) {
  const { root, validators, manifest } = ctx;
  const indexPath = manifest.contents.questions.index;

  if (!existsSync(join(root, indexPath))) {
    ctx.error(`${indexPath} 不存在`);
    return;
  }

  const index = readYaml(join(root, indexPath), indexPath);
  if (!validators.questionIndex(index)) {
    ctx.error(
      `${indexPath} 未通过 Schema 校验`,
      formatErrors(validators.questionIndex.errors),
    );
    return;
  }

  const seen = new Map();
  let total = 0;

  for (const file of index.files) {
    const pathError = checkPackagePath(file.path);
    if (pathError) {
      ctx.error(`题目文件 ${file.path}：${pathError}`);
      continue;
    }

    const full = join(root, file.path);
    if (!existsSync(full)) {
      ctx.error(`${indexPath} 登记的题目文件不存在：${file.path}`);
      continue;
    }

    const doc = readJson(full, file.path);
    if (!Array.isArray(doc?.questions)) {
      ctx.error(`${file.path} 缺少 questions 数组`);
      continue;
    }

    for (const question of doc.questions) {
      const label = question?.id ?? "(缺少 id)";
      if (!validators.question(question)) {
        ctx.error(
          `${file.path} 题 ${label} 未通过 Schema 校验`,
          formatErrors(validators.question.errors),
        );
        continue;
      }

      if (seen.has(question.id)) {
        ctx.error(`${file.path} 题 ID 重复：${question.id}（已在 ${seen.get(question.id)}）`);
        continue;
      }
      seen.set(question.id, file.path);
      ctx.questionIds.add(question.id);
      total += 1;

      for (const pointId of question.knowledge_points) {
        if (!ctx.conceptIds.has(pointId)) {
          ctx.error(`${file.path} 题 ${question.id} 引用了未定义的知识点 ${pointId}`);
        }
      }
      for (const tag of question.tags) {
        ctx.pendingTagRefs.push({ id: tag, owner: question.id, file: file.path });
      }
      if (question.source.source_id) {
        ctx.pendingSourceRefs.push({
          id: question.source.source_id,
          owner: question.id,
          file: file.path,
          type: question.source.type,
        });
      }

      validateAnswer(ctx, question, file.path);
      validateImages(ctx, question, file.path);
    }

    if (typeof file.count === "number" && file.count !== doc.questions.length) {
      ctx.error(
        `${indexPath} 宣称 ${file.path} 有 ${file.count} 道题，实际为 ${doc.questions.length}`,
      );
    }
  }

  ctx.stats.questions = total;
}

/** An answer key that names a missing option would mark every attempt wrong. */
function validateAnswer(ctx, question, file) {
  const keys = (question.options ?? []).map((option) => option.id);

  if (keys.length > 0 && new Set(keys).size !== keys.length) {
    ctx.error(`${file} 题 ${question.id} 的选项 id 重复`);
  }

  if (question.answer.type === "boolean") {
    const [value] = question.answer.value;
    if (!["true", "false"].includes(value)) {
      ctx.error(`${file} 题 ${question.id} 的布尔答案必须是 true 或 false`);
    }
    return;
  }

  if (question.answer.type === "text") return;

  const missing = question.answer.value.filter((key) => !keys.includes(key));
  if (missing.length > 0) {
    ctx.error(
      `${file} 题 ${question.id} 的答案引用了不存在的选项：${missing.join("、")}`,
    );
  }

  if (question.answer.type === "single" && question.answer.value.length !== 1) {
    ctx.error(`${file} 题 ${question.id} 是单选题，答案必须恰好一个`);
  }

  if (question.type === "single_choice" && question.answer.type !== "single") {
    ctx.error(`${file} 题 ${question.id} 是单选题型，但答案类型是 ${question.answer.type}`);
  }
}

function validateImages(ctx, question, file) {
  const keys = (question.options ?? []).map((option) => option.id);

  for (const image of question.images ?? []) {
    const position = image.position ?? "stem";
    if (position.startsWith("option:") && !keys.includes(position.slice(7))) {
      ctx.error(`${file} 题 ${question.id} 的图片挂载点 ${position} 指向不存在的选项`);
    }
    if (!existsSync(join(ctx.root, image.path))) {
      ctx.error(`${file} 题 ${question.id} 引用的图片不存在：${image.path}`);
    }
  }
}
