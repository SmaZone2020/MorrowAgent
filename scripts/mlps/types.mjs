import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "packages/cn.morrow.calculus.shaanxi-upgrade";

function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (entry.name.endsWith(".json")) {
      const doc = JSON.parse(readFileSync(full, "utf8"));
      for (const q of doc.questions ?? []) out.push({ ...q, file: full });
    }
  }
  return out;
}

const questions = collect(join(root, "questions"));
const types = new Map();
for (const q of questions) types.set(q.type, (types.get(q.type) ?? 0) + 1);
console.log("by type:", [...types].map(([k, v]) => `${k}=${v}`).join("  "));

const perFile = new Map();
for (const q of questions) {
  const key = q.file.replace(/\\/g, "/").replace(`${root}/`, "");
  perFile.set(key, (perFile.get(key) ?? 0) + 1);
}
console.log("by file:", [...perFile].map(([k, v]) => `${k}=${v}`).join("  "));
