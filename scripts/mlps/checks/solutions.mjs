import { existsSync } from "node:fs";
import { join } from "node:path";
import { readJson, readYaml } from "../documents.mjs";
import { checkPackagePath } from "../paths.mjs";
import { formatErrors } from "../schemas.mjs";

/**
 * Solutions are optional (MLPS §9): a package may ship questions only. When an
 * index is declared, every file it lists must exist and every solution must
 * point at a question the package actually contains, because a solution whose
 * question was renamed is silently unreachable and nobody would notice.
 */
export function validateSolutions(ctx) {
  const { root, validators, manifest } = ctx;
  const indexPath = manifest.contents.solutions?.index;
  if (!indexPath) {
    ctx.stats.solutions = 0;
    return;
  }

  if (!existsSync(join(root, indexPath))) {
    ctx.error(`${indexPath} 不存在`);
    return;
  }

  const index = readYaml(join(root, indexPath), indexPath);
  if (!validators.solutionIndex(index)) {
    ctx.error(
      `${indexPath} 未通过 Schema 校验`,
      formatErrors(validators.solutionIndex.errors),
    );
    return;
  }

  const seen = new Set();
  let total = 0;

  for (const file of index.files) {
    const pathError = checkPackagePath(file.path);
    if (pathError) {
      ctx.error(`解析文件 ${file.path}：${pathError}`);
      continue;
    }

    const full = join(root, file.path);
    if (!existsSync(full)) {
      ctx.error(`${indexPath} 登记的解析文件不存在：${file.path}`);
      continue;
    }

    const doc = readJson(full, file.path);
    if (!Array.isArray(doc?.solutions)) {
      ctx.error(`${file.path} 缺少 solutions 数组`);
      continue;
    }

    for (const solution of doc.solutions) {
      const label = solution?.question_id ?? "(缺少 question_id)";
      if (!validators.solution(solution)) {
        ctx.error(
          `${file.path} 解析 ${label} 未通过 Schema 校验`,
          formatErrors(validators.solution.errors),
        );
        continue;
      }

      if (seen.has(solution.question_id)) {
        ctx.error(`${file.path} 解析重复：${solution.question_id}`);
        continue;
      }
      seen.add(solution.question_id);
      total += 1;

      if (!ctx.questionIds.has(solution.question_id)) {
        ctx.error(
          `${file.path} 解析指向不存在的题目 ${solution.question_id}`,
        );
      }
    }

    if (typeof file.count === "number" && file.count !== doc.solutions.length) {
      ctx.error(
        `${indexPath} 宣称 ${file.path} 有 ${file.count} 份解析，实际为 ${doc.solutions.length}`,
      );
    }
  }

  ctx.stats.solutions = total;
}
