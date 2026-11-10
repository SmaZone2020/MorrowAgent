import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";

/** Extensions a learning package may carry. Anything executable is rejected. */
const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".yaml",
  ".yml",
  ".json",
  ".sha256",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".mp4",
  ".webm",
  "",
]);

const FORBIDDEN_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bat",
  ".cmd",
  ".ps1",
  ".sh",
  ".msi",
  ".com",
  ".scr",
  ".js",
  ".mjs",
  ".cjs",
  ".vbs",
  ".jar",
  ".py",
]);

/**
 * Every path inside a package is POSIX-relative. Absolute paths, drive letters,
 * backslashes and `..` are the three shapes a Zip Slip needs, so all of them are
 * rejected before the file is ever opened (MLPS §15.1).
 */
export function checkPackagePath(path) {
  if (path.startsWith("/")) return "不允许绝对路径";
  if (/^[A-Za-z]:/.test(path)) return "不允许盘符";
  if (path.includes("\\")) return "必须使用正斜杠";
  if (path.includes("\0")) return "不允许空字符";
  if (path.split("/").some((segment) => segment === ".." || segment === ".")) {
    return "不允许 . 或 .. 路径段";
  }
  return null;
}

export function collectFiles(root) {
  const out = [];

  const walk = (directory) => {
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry);
      const stats = statSync(full);
      if (stats.isDirectory()) walk(full);
      else out.push(full);
    }
  };

  walk(root);
  return out;
}

export function toPackagePath(root, file) {
  return relative(root, file).split(sep).join("/");
}

export function checkExtension(path) {
  const dot = path.lastIndexOf(".");
  const extension = dot === -1 ? "" : path.slice(dot).toLowerCase();
  if (FORBIDDEN_EXTENSIONS.has(extension)) {
    return `不允许可执行或脚本文件（${extension}）`;
  }
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return `不支持的文件类型（${extension || "无扩展名"}）`;
  }
  return null;
}

export function checkDirectoryPaths(root) {
  const errors = [];

  for (const file of collectFiles(root)) {
    const path = toPackagePath(root, file);
    const pathError = checkPackagePath(path);
    if (pathError) {
      errors.push(`${path}：${pathError}`);
      continue;
    }
    const extensionError = checkExtension(path);
    if (extensionError) errors.push(`${path}：${extensionError}`);
  }

  return errors;
}

export function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/**
 * `checksums.sha256` is the only integrity record, and it must cover every
 * content file. Entries for files that do not exist are rejected too: a stale
 * line would let a later install skip a file silently.
 */
export function verifyChecksums(root, declared, files) {
  const errors = [];
  const listed = new Map();

  for (const line of declared.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([0-9a-f]{64})\s+(.+)$/i);
    if (!match) {
      errors.push(`checksums.sha256 行格式错误：${trimmed}`);
      continue;
    }

    const [, hash, rawPath] = match;
    const path = rawPath.replace(/^\*/, "").trim();
    const pathError = checkPackagePath(path);
    if (pathError) {
      errors.push(`checksums.sha256 中的路径 ${path}：${pathError}`);
      continue;
    }
    if (listed.has(path)) errors.push(`checksums.sha256 重复登记 ${path}`);
    listed.set(path, hash.toLowerCase());
  }

  const covered = new Set([...Object.keys(files), ...listed.keys()]);

  for (const path of covered) {
    if (path === "checksums.sha256") continue;
    if (!listed.has(path)) {
      errors.push(`checksums.sha256 未登记 ${path}`);
      continue;
    }
    if (!files[path]) {
      errors.push(`checksums.sha256 登记了不存在的文件 ${path}`);
      continue;
    }
    if (files[path].hash !== listed.get(path)) {
      errors.push(
        `${path} 的 SHA-256 不一致：登记 ${listed.get(path)}，实际 ${files[path].hash}`,
      );
    }
  }

  return errors;
}

/** Hashes every file once; both the checksum pass and the report reuse it. */
export function hashFiles(root) {
  const files = {};
  for (const file of collectFiles(root)) {
    const path = toPackagePath(root, file);
    files[path] = {
      size: statSync(file).size,
      hash: sha256(file),
    };
  }
  return files;
}

export function normalizeRelative(path) {
  return posix.normalize(path);
}
