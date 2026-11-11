import { totalmem } from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readYaml } from "../documents.mjs";
import { formatErrors } from "../schemas.mjs";

/**
 * Decompression guard (MLPS §15.1 item 13). A tiny archive can expand into
 * gigabytes, so the ratio is bounded before anything is unpacked: the checks
 * run against the extracted tree here, and the installer reuses the same limits.
 */
const MAX_FILES = 20000;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const MAX_RATIO = 200;

/**
 * Licenses that clear a quoted exam paper. `public_domain` and `licensed`/
 * `open_license` cover redistribution; `local_only` covers the user's own copy
 * of a paper they already hold, which may live in a locally installed pack but
 * never in a published one.
 */
const IMPORTABLE = new Set(["public_domain", "open_license", "licensed", "local_only"]);

export function validateLimits(ctx, files) {
  const paths = Object.keys(files);
  if (paths.length > MAX_FILES) {
    ctx.error(`文件数量 ${paths.length} 超过上限 ${MAX_FILES}`);
  }

  const total = Object.values(files).reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    ctx.error(`解压后总大小 ${(total / 1048576).toFixed(1)} MB 超过上限 512 MB`);
  }
  if (ctx.archiveBytes && total / ctx.archiveBytes > MAX_RATIO) {
    ctx.warn(
      `压缩比 ${(total / ctx.archiveBytes).toFixed(0)} 倍偏高，安装前应再次检查`,
    );
  }

  // A file larger than available memory cannot be read into a buffer at install.
  if (total > totalmem() / 4) {
    ctx.error("解压后总大小超过可用内存的四分之一，拒绝安装");
  }

  ctx.stats.totalBytes = total;
}

export function validateSources(ctx) {
  const { root, validators, manifest } = ctx;
  const path = manifest.contents.citations.sources;

  if (!existsSync(join(root, path))) {
    ctx.error(`${path} 不存在`);
    return;
  }

  const doc = readYaml(join(root, path), path);
  if (!validators.sources(doc)) {
    ctx.error(`${path} 未通过 Schema 校验`, formatErrors(validators.sources.errors));
    return;
  }

  const sources = new Map();
  for (const source of doc.sources) {
    if (sources.has(source.id)) ctx.error(`${path} 来源 ID 重复：${source.id}`);
    sources.set(source.id, source);
  }

  const localOnly = [];
  for (const ref of ctx.pendingSourceRefs) {
    const source = sources.get(ref.id);
    if (!source) {
      ctx.error(`${ref.file} ${ref.owner} 引用了未登记的来源 ${ref.id}`);
      continue;
    }
    // Quoted paper text needs a cleared license; an unknown license is not
    // permission to redistribute (MLPS §14). `local_only` clears local use
    // only, so the pack must never be published.
    if (ref.type === "imported" && !IMPORTABLE.has(source.license)) {
      ctx.error(
        `${ref.file} ${ref.owner} 引用了真题原文，但来源 ${ref.id} 的 license 是 ${source.license}`,
      );
    }
    if (source.license === "local_only" && !localOnly.includes(source.id)) {
      localOnly.push(source.id);
    }
  }

  if (localOnly.length > 0) {
    ctx.warn(
      `包含 ${localOnly.length} 条 local_only 来源，本学习包仅限本机使用，不得公开分发`,
    );
  }

  ctx.stats.sources = sources.size;
  ctx.stats.localOnlySources = localOnly.length;
  ctx.sourceIds = new Set(sources.keys());
}

export function validateTagRefs(ctx) {
  for (const ref of ctx.pendingTagRefs) {
    if (!ctx.tagIds.has(ref.id)) {
      ctx.error(`${ref.file} ${ref.owner} 引用了未登记的标签 ${ref.id}`);
    }
  }
}
