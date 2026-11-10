import { existsSync } from "node:fs";
import { join } from "node:path";
import { readYaml } from "../documents.mjs";
import { formatErrors } from "../schemas.mjs";

/**
 * Tags and error types are the shared vocabulary: a point or question may only
 * use a tag that is registered here, and a package's own `package.tags` must be
 * a subset of it. That keeps the shelf filter from offering a tag with nothing
 * behind it.
 */
export function validateTaxonomy(ctx) {
  const { root, validators, manifest } = ctx;

  const tagPath = manifest.contents.taxonomy.tags;
  const errorPath = manifest.contents.taxonomy.error_types;

  for (const path of [tagPath, errorPath]) {
    if (!existsSync(join(root, path))) ctx.error(`${path} 不存在`);
  }
  if (!existsSync(join(root, tagPath)) || !existsSync(join(root, errorPath))) return;

  const tags = readYaml(join(root, tagPath), tagPath);
  if (!validators.taxonomy(tags)) {
    ctx.error(`${tagPath} 未通过 Schema 校验`, formatErrors(validators.taxonomy.errors));
    return;
  }

  const errors = readYaml(join(root, errorPath), errorPath);
  if (!validators.errorTypes(errors)) {
    ctx.error(
      `${errorPath} 未通过 Schema 校验`,
      formatErrors(validators.errorTypes.errors),
    );
    return;
  }

  const tagIds = new Set();
  for (const tag of tags.tags) {
    if (tagIds.has(tag.id)) ctx.error(`${tagPath} 标签 ID 重复：${tag.id}`);
    tagIds.add(tag.id);
  }

  const errorIds = new Set();
  for (const type of errors.error_types) {
    if (errorIds.has(type.id)) ctx.error(`${errorPath} 错误类型 ID 重复：${type.id}`);
    errorIds.add(type.id);
  }

  for (const tag of manifest.package.tags ?? []) {
    if (!tagIds.has(tag)) {
      ctx.error(`manifest 的 package.tags 引用了未登记的标签 ${tag}`);
    }
  }
  for (const tag of manifest.package.targets ?? []) {
    if (!tagIds.has(tag)) {
      ctx.error(`manifest 的 package.targets 引用了未登记的标签 ${tag}`);
    }
  }

  ctx.tagIds = tagIds;
  ctx.errorTypeIds = errorIds;
  ctx.stats.tags = tagIds.size;
}
