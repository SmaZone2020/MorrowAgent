/**
 * Asserts that every place carrying the app version agrees.
 *
 * The version is written by hand in five files, because each toolchain reads its
 * own: npm for the frontend, Cargo for the crate, the Tauri config for the
 * bundle, and two display strings. A release that ships 0.2.0 while the window
 * says 0.1.0 is a bug users see, so the check runs before the installer is built.
 *
 *   node scripts/checkVersion.mjs            # all five must agree
 *   node scripts/checkVersion.mjs --tag v0.2.0   # and must match the release tag
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

/** Reads a file and returns the version it declares, or `undefined`. */
function versionIn(file, extract) {
  let text;
  try {
    text = readFileSync(join(projectRoot, file), "utf8");
  } catch {
    return undefined;
  }
  return extract(text);
}

/** The `[package]` block of a Cargo.toml, without the table header. */
function cargoPackage(text) {
  return text
    .split(/^\[/m)
    .find((part) => part.startsWith("package]"))
    ?.slice("package]".length);
}

const sources = [
  {
    file: "package.json",
    label: "package.json",
    read: (text) => JSON.parse(text).version,
  },
  {
    file: "src-tauri/Cargo.toml",
    label: "src-tauri/Cargo.toml [package]",
    read: (text) => cargoPackage(text)?.match(/^version\s*=\s*"([^"]+)"/m)?.[1],
  },
  {
    file: "src-tauri/tauri.conf.json",
    label: "src-tauri/tauri.conf.json",
    read: (text) => JSON.parse(text).version,
  },
  {
    file: "src/app/config.ts",
    label: "src/app/config.ts appConfig.version",
    read: (text) => /version:\s*"([^"]+)"/.exec(text)?.[1],
  },
  {
    file: "src-tauri/src/package/mod.rs",
    label: "src-tauri/src/package/mod.rs APP_VERSION",
    read: (text) => /APP_VERSION:\s*&str\s*=\s*"([^"]+)"/.exec(text)?.[1],
  },
];

const found = sources.map((source) => ({
  label: source.label,
  version: versionIn(source.file, source.read),
}));

let failed = false;
for (const { label, version } of found) {
  if (!version) {
    console.error(`\u2717 ${label}：读不到版本号`);
    failed = true;
  }
}

const distinct = [...new Set(found.map((entry) => entry.version).filter(Boolean))];
if (distinct.length > 1) {
  console.error(`\u2717 版本号不一致：${distinct.join(" / ")}`);
  for (const { label, version } of found) {
    console.error(`  ${label}: ${version ?? "(缺失)"}`);
  }
  failed = true;
}

const version = distinct[0];

const tagIndex = process.argv.indexOf("--tag");
if (tagIndex !== -1) {
  const tag = process.argv[tagIndex + 1];
  if (!tag) {
    console.error("\u2717 --tag 需要一个值，例如 --tag v0.1.0");
    failed = true;
  } else if (tag.replace(/^v/, "") !== version) {
    console.error(`\u2717 发布标签 ${tag} 与版本号 ${version} 不符`);
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`\u2713 版本号一致：${version}（${found.length} 处声明）`);
}
