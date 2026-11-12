import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "packages/cn.morrow.calculus.shaanxi-upgrade";

function readYamlPoints(path) {
  const text = readFileSync(path, "utf8");
  const chapters = [];
  let chapter = null;
  for (const line of text.split(/\r?\n/)) {
    const c = /^  - id: (\S+)$/.exec(line);
    if (c) {
      chapter = { id: c[1], points: [] };
      chapters.push(chapter);
      continue;
    }
    const p = /^      - id: (\S+)$/.exec(line);
    if (p && chapter) chapter.points.push(p[1]);
  }
  return chapters;
}

function collectQuestions(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectQuestions(full));
    else if (entry.name.endsWith(".json") && entry.name !== "index.yaml") {
      const doc = JSON.parse(readFileSync(full, "utf8"));
      for (const q of doc.questions ?? []) out.push({ ...q, file: full });
    }
  }
  return out;
}

const chapters = readYamlPoints(join(root, "knowledge/index.yaml"));
const questions = collectQuestions(join(root, "questions"));
const counts = new Map();
for (const q of questions) {
  for (const id of q.knowledge_points ?? []) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
}

const all = chapters.flatMap((c) => c.points.map((p) => ({ chapter: c.id, point: p })));
console.log(`chapters ${chapters.length}  points ${all.length}  questions ${questions.length}`);
const empty = all.filter((p) => !counts.has(p.point));
console.log(`points with 0 questions: ${empty.length}`);
const thin = all.filter((p) => (counts.get(p.point) ?? 0) === 1);
console.log(`points with 1 question: ${thin.length}`);
const ok = all.filter((p) => (counts.get(p.point) ?? 0) >= 2);
console.log(`points with >=2: ${ok.length}`);
console.log("");
for (const chapter of chapters) {
  const rows = chapter.points.map((p) => `${p.split(".").slice(-1)[0]}=${counts.get(p) ?? 0}`);
  console.log(`${chapter.id}  ${rows.join("  ")}`);
}
