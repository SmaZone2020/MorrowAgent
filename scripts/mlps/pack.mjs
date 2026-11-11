/**
 * Packs a learning package directory into a `.morrow` archive.
 *
 * The archive is a plain 7z container whose entries sit at the root, because the
 * importer reads `manifest.yaml` from the top level before it extracts anything.
 * Checksums are written first: a package packed from a stale checksum file is
 * rejected at install time, and finding that out here is far cheaper.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

/** The 7z binary, wherever this machine keeps it. */
const SEVEN_ZIP = process.env.SEVEN_ZIP ?? "7z.exe";

function usage() {
  console.error("用法：node scripts/mlps/pack.mjs <学习包目录> [输出文件.morrow]");
  process.exit(2);
}

function main() {
  const [source, target] = process.argv.slice(2);
  if (!source) usage();

  const root = resolve(projectRoot, source);
  if (!existsSync(join(root, "manifest.yaml"))) {
    console.error(`✗ ${source} 不是学习包：缺少 manifest.yaml`);
    process.exit(1);
  }

  const out = target
    ? resolve(projectRoot, target)
    : resolve(
        projectRoot,
        "dist-packages",
        `${root.split(/[\\/]/).pop()}.morrow`,
      );

  console.log("· 重算校验和");
  execFileSync(process.execPath, [join(projectRoot, "scripts", "writeChecksums.mjs"), root], {
    stdio: "inherit",
  });

  console.log("· 校验学习包");
  execFileSync(process.execPath, [join(projectRoot, "scripts", "validatePackage.mjs"), root], {
    stdio: "inherit",
  });

  mkdirSync(dirname(out), { recursive: true });
  if (existsSync(out)) rmSync(out);

  // Run inside the package so entries land at the archive root; `-mx=9` because
  // the text and images here compress well and the file is meant to be moved.
  execFileSync(SEVEN_ZIP, ["a", "-t7z", "-mx=9", "-y", out, "*", "-r"], {
    cwd: root,
    stdio: "inherit",
  });

  const size = statSync(out).size;
  console.log(
    `✓ ${out}（${(size / 1048576).toFixed(2)} MB）`,
  );
}

main();
