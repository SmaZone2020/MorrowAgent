import { existsSync } from "node:fs";
import { join } from "node:path";
import { readYaml } from "../documents.mjs";
import { formatErrors } from "../schemas.mjs";

/** Files the spec calls mandatory, checked before anything else is read. */
export const REQUIRED_FILES = [
  "manifest.yaml",
  "README.md",
  "knowledge/index.yaml",
  "knowledge/relations.yaml",
  "questions/index.yaml",
  "taxonomy/tags.yaml",
  "taxonomy/error-types.yaml",
  "citations/sources.yaml",
  "checksums.sha256",
];

export const SUPPORTED_FORMAT_VERSION = "1.0";
/** The app version this build reports to a package's compatibility check. */
export const APP_VERSION = "0.1.0";

function versionParts(version) {
  return version.split(".").map((part) => Number.parseInt(part, 10));
}

export function compareVersions(a, b) {
  const left = versionParts(a);
  const right = versionParts(b);
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function validateStructure(ctx) {
  for (const path of REQUIRED_FILES) {
    if (!existsSync(join(ctx.root, path))) ctx.error(`缺少必需文件 ${path}`);
  }
}

export function validateManifest(ctx) {
  const { root, validators } = ctx;
  const path = "manifest.yaml";

  if (!existsSync(join(root, path))) return;

  const manifest = readYaml(join(root, path), path);
  if (!validators.manifest(manifest)) {
    ctx.error(
      `${path} 未通过 Schema 校验`,
      formatErrors(validators.manifest.errors),
    );
    return;
  }

  if (manifest.format.version !== SUPPORTED_FORMAT_VERSION) {
    ctx.error(
      `format.version 是 ${manifest.format.version}，本客户端只支持 ${SUPPORTED_FORMAT_VERSION}`,
    );
  }

  const compared = compareVersions(APP_VERSION, manifest.compatibility.min_app_version);
  if (compared < 0) {
    ctx.error(
      `学习包要求客户端至少 ${manifest.compatibility.min_app_version}，当前为 ${APP_VERSION}`,
    );
  }

  ctx.manifest = manifest;
  ctx.stats.packageId = manifest.package.id;
  ctx.stats.packageVersion = manifest.package.version;
}

/**
 * The cover is optional, but a declared one must exist and stay inside the
 * package: it is rendered straight into the shelf, so an escaping path would be
 * a file read of the user's choosing.
 */
export function validateCover(ctx) {
  const cover = ctx.manifest?.package.cover;
  if (!cover) return;

  if (!cover.file) {
    ctx.warn("学习包没有封面文件，书架会用 accent 生成一张纯色封面");
    return;
  }
  if (!existsSync(join(ctx.root, cover.file))) {
    ctx.error(`封面文件不存在：${cover.file}`);
  }
  if (!cover.accent) {
    ctx.warn("封面缺少 accent，缺省配色会回落到主题色");
  }
}

export function validateDependencies(ctx, installedPackages = new Map()) {
  for (const dependency of ctx.manifest?.dependencies ?? []) {
    const installed = installedPackages.get(dependency.id);
    if (!installed) {
      if (!dependency.optional) {
        ctx.error(`缺少必需依赖 ${dependency.id}@${dependency.version}`);
      }
      continue;
    }
    if (compareVersions(installed, dependency.version) < 0) {
      ctx.error(
        `依赖 ${dependency.id} 需要至少 ${dependency.version}，已安装 ${installed}`,
      );
    }
  }
}
