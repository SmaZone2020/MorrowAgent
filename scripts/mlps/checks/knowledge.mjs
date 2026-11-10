import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFrontMatter, readYaml } from "../documents.mjs";
import { checkPackagePath } from "../paths.mjs";
import { formatErrors } from "../schemas.mjs";

/**
 * Prerequisite edges come from two places on purpose: the front matter reads as
 * a sentence about the point, the graph reads as edges. Merging them means an
 * author never has to write the same relation twice, while a contradiction
 * between the two still fails the build.
 */
export function collectPrerequisiteEdges(relations, frontMatter) {
  const edges = [];

  for (const relation of relations) {
    if (relation.type === "prerequisite") {
      edges.push({ from: relation.from, to: relation.to, origin: "relations.yaml" });
    }
  }
  for (const [id, entry] of frontMatter) {
    for (const prerequisite of entry.prerequisites ?? []) {
      edges.push({ from: id, to: prerequisite, origin: `${id} 的 prerequisites` });
    }
  }

  return edges;
}

/** A cycle makes every point in the loop unlearnable, so it is always an error. */
export function findCycles(edges) {
  const outgoing = new Map();
  for (const edge of edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from).push(edge);
  }

  const state = new Map();
  const cycles = [];
  const reported = new Set();

  const visit = (id, trail) => {
    state.set(id, "open");
    for (const edge of outgoing.get(id) ?? []) {
      const next = state.get(edge.to);
      if (next === "open") {
        const path = [...trail, id, edge.to];
        const key = [...path].sort().join("|");
        if (!reported.has(key)) {
          reported.add(key);
          cycles.push(path.join(" → "));
        }
        continue;
      }
      if (!next) visit(edge.to, [...trail, id]);
    }
    state.set(id, "done");
  };

  for (const id of outgoing.keys()) {
    if (!state.has(id)) visit(id, []);
  }

  return cycles;
}

export function validateKnowledge(ctx) {
  const { root, validators, manifest } = ctx;
  const indexPath = manifest.contents.knowledge.index;

  if (!existsSync(join(root, indexPath))) {
    ctx.error(`${indexPath} 不存在`);
    return;
  }

  const index = readYaml(join(root, indexPath), indexPath);
  if (!validators.knowledgeIndex(index)) {
    ctx.error(`${indexPath} 未通过 Schema 校验`, formatErrors(validators.knowledgeIndex.errors));
    return;
  }

  const chapters = new Set();
  const points = new Map();
  const frontMatter = new Map();

  for (const chapter of index.chapters) {
    if (chapters.has(chapter.id)) ctx.error(`${indexPath} 章节 ID 重复：${chapter.id}`);
    chapters.add(chapter.id);

    for (const entry of chapter.points ?? []) {
      const pathError = checkPackagePath(entry.file);
      if (pathError) {
        ctx.error(`知识点 ${entry.id} 的文件路径 ${entry.file}：${pathError}`);
        continue;
      }
      if (points.has(entry.id)) {
        ctx.error(`${indexPath} 知识点 ID 重复：${entry.id}`);
        continue;
      }

      const file = join(root, entry.file);
      if (!existsSync(file)) {
        ctx.error(`知识点 ${entry.id} 引用的文件不存在：${entry.file}`);
        continue;
      }

      const document = readFrontMatter(file);
      if (!document) {
        ctx.error(`${entry.file} 缺少 front matter`);
        continue;
      }
      if (!validators.knowledge(document.data)) {
        ctx.error(
          `${entry.file} 未通过 Schema 校验`,
          formatErrors(validators.knowledge.errors),
        );
        continue;
      }
      if (document.data.id !== entry.id) {
        ctx.error(
          `${entry.file} 的 id 是 ${document.data.id}，但 ${indexPath} 登记的 id 是 ${entry.id}`,
        );
        continue;
      }
      if (document.data.chapter !== chapter.id) {
        ctx.error(
          `${entry.file} 的 chapter 是 ${document.data.chapter}，但挂在章节 ${chapter.id} 下`,
        );
      }
      if (document.body.trim().length < 20) {
        ctx.error(`${entry.file} 的正文为空或过短，知识点必须有可阅读内容`);
      }

      points.set(entry.id, { file: entry.file, chapterId: chapter.id, data: document.data });
      frontMatter.set(entry.id, document.data);

      for (const image of document.data.images ?? []) {
        if (!existsSync(join(root, image.path))) {
          ctx.error(`知识点 ${entry.id} 引用的图片不存在：${image.path}`);
        }
        if (!image.path.startsWith("media/")) {
          ctx.warn(`知识点 ${entry.id} 的图片 ${image.path} 不在 media/ 下，打包时容易漏掉`);
        }
      }

      for (const sourceId of document.data.sources ?? []) {
        ctx.pendingSourceRefs.push({ id: sourceId, owner: entry.id, file: entry.file });
      }
    }
  }

  ctx.stats.chapters = chapters.size;
  ctx.stats.points = points.size;
  ctx.conceptIds = new Set(points.keys());
  ctx.conceptData = points;

  validateRelations(ctx, points, frontMatter);
}

function validateRelations(ctx, points, frontMatter) {
  const { root, validators, manifest } = ctx;
  const path = manifest.contents.relations.index;

  if (!existsSync(join(root, path))) {
    ctx.error(`${path} 不存在`);
    return;
  }

  const doc = readYaml(join(root, path), path);
  if (!Array.isArray(doc?.relations)) {
    ctx.error(`${path} 缺少 relations 数组`);
    return;
  }

  const ids = new Set();
  const relations = [];

  for (const relation of doc.relations) {
    if (!validators.relation(relation)) {
      ctx.error(
        `${path} 关系 ${relation?.id ?? "(缺少 id)"} 未通过 Schema 校验`,
        formatErrors(validators.relation.errors),
      );
      continue;
    }
    if (ids.has(relation.id)) ctx.error(`${path} 关系 ID 重复：${relation.id}`);
    ids.add(relation.id);

    for (const end of [relation.from, relation.to]) {
      if (!points.has(end)) {
        ctx.error(`${path} 关系 ${relation.id} 指向未定义的知识点 ${end}`);
      }
    }

    relations.push(relation);
  }

  const edges = collectPrerequisiteEdges(relations, frontMatter);

  for (const cycle of findCycles(edges)) {
    ctx.error(`${path} 存在前置循环：${cycle}`);
  }

  // A pair declared as prerequisite in one place and as something else in the
  // other would give the client two answers, so it is rejected.
  const kinds = new Map();
  for (const relation of relations) {
    const pair = [relation.from, relation.to].sort().join("|");
    if (!kinds.has(pair)) kinds.set(pair, new Set());
    kinds.get(pair).add(relation.type);
  }
  for (const [pair, set] of kinds) {
    if (set.has("prerequisite") && set.size > 1) {
      ctx.error(`${path} 对 ${pair.replace("|", " / ")} 同时声明了 prerequisite 与其他关系类型`);
    }
  }

  ctx.stats.relations = relations.length;
  ctx.relations = relations;
}
