#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { collectFiles, sha256, toPackagePath } from "./mlps/paths.mjs";

/**
 * Regenerates `checksums.sha256` for one extracted package.
 *
 * The file itself is excluded: a list cannot contain its own digest. Entries are
 * sorted so re-running the command on unchanged content produces an identical
 * file, which keeps package diffs readable.
 */
const target = process.argv[2];
if (!target) {
  console.error("用法：node scripts/writeChecksums.mjs <学习包目录>");
  process.exit(2);
}

const root = resolve(target);
const lines = collectFiles(root)
  .map((file) => ({ path: toPackagePath(root, file), hash: sha256(file) }))
  .filter((entry) => entry.path !== "checksums.sha256")
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  .map((entry) => `${entry.hash}  ${entry.path}`);

writeFileSync(join(root, "checksums.sha256"), `${lines.join("\n")}\n`, "utf8");
console.log(`已写入 ${lines.length} 条校验记录`);
