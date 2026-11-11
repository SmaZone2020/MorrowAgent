#!/usr/bin/env node
/**
 * Turns the source notes into learning-package knowledge documents.
 *
 * `data/高数2` is a CC BY-SA 4.0 textbook transcription: one Markdown file per
 * section, figures under `assets/<chapter>/`. `data/高数` is the user's own
 * notes. Neither is shipped as-is — the package carries one file per knowledge
 * point, ASCII paths, and figures copied under `media/`, so a package never
 * points at a path outside itself.
 *
 * The script is idempotent: re-running it rewrites the generated chapters and
 * leaves the hand-written concepts in `knowledge/concepts` untouched.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const source = join(root, "data", "高数2");
const notes = join(root, "data", "高数");
const pkg = join(root, "packages", "cn.morrow.calculus.shaanxi-upgrade");

/** Chapter titles and the metadata every section in them inherits. */
const CHAPTERS = [
  ["ch01", "第一章 函数与极限", "limits", 2, "high"],
  ["ch02", "第二章 导数与微分", "derivative", 3, "high"],
  ["ch03", "第三章 微分中值定理及其应用", "mean-value", 4, "high"],
  ["ch04", "第四章 不定积分", "indefinite-integral", 3, "high"],
  ["ch05", "第五章 定积分及其应用", "definite-integral", 4, "high"],
  ["ch06", "第六章 微分方程", "ode", 3, "medium"],
  ["ch07", "第七章 无穷级数", "series", 4, "high"],
  ["ch08", "第八章 多元函数微分法及其应用", "multivariable", 3, "high"],
  ["ch09", "第九章 重积分", "multiple-integral", 4, "high"],
  ["ch10", "第十章 曲线积分与曲面积分", "line-surface-integral", 5, "medium"],
];

/**
 * Section slug per source file. IDs are part of the public contract, so they
 * are written out rather than derived from the Chinese filename.
 */
const SECTIONS = {
  1.1: "function", 1.2: "sequence-limit", 1.3: "function-limit", 1.4: "infinitesimal",
  1.5: "limit-computation", 1.6: "limit-criteria", 1.7: "infinitesimal-comparison",
  1.8: "continuity", 1.9: "closed-interval-continuity",
  2.1: "derivative-concept", 2.2: "derivative-rules", 2.3: "higher-derivative",
  2.4: "implicit-derivative", 2.5: "differential",
  3.1: "mean-value-theorem", 3.2: "taylor", 3.3: "indeterminate-form",
  3.4: "monotonicity-extremum", 3.5: "concavity-curve",
  4.1: "indefinite-integral", 4.2: "substitution-parts", 4.3: "rational-integral",
  5.1: "definite-integral", 5.2: "fundamental-theorem", 5.3: "improper-integral",
  5.4: "definite-integral-application",
  6.1: "ode-basics", 6.2: "separable-ode", 6.3: "homogeneous-ode",
  6.4: "first-order-linear-ode", 6.5: "reducible-ode", 6.6: "higher-linear-ode",
  6.7: "constant-coefficient-homogeneous", 6.8: "constant-coefficient-nonhomogeneous",
  6.9: "euler-equation",
  7.1: "series-concepts", 7.2: "series-tests", 7.3: "power-series",
  7.4: "power-series-expansion", 7.5: "fourier-series",
  8.1: "multivariable-basics", 8.2: "partial-derivative", 8.3: "total-differential",
  8.4: "composite-derivative", 8.5: "implicit-multivariable", 8.6: "geometric-application",
  8.7: "directional-derivative", 8.8: "multivariable-extremum",
  9.1: "double-integral", 9.2: "double-integral-computation", 9.3: "triple-integral",
  9.4: "multiple-integral-application",
  10.1: "line-integral-first", 10.2: "line-integral-second", 10.3: "green-formula",
  10.4: "surface-integral-first", 10.5: "surface-integral-second", 10.6: "gauss-formula",
  10.7: "stokes-formula",
};

/** Sections the exam leans on hardest get a critical badge in the tree. */
const CRITICAL = new Set(["1.5", "2.2", "3.4", "4.2", "5.2", "6.4", "7.2", "9.2"]);

/** Cross-chapter links; within a chapter the order already implies the chain. */
const CROSS_LINKS = [
  ["1.6", "7.2"], ["2.1", "3.1"], ["4.2", "5.2"], ["5.2", "8.4"],
  ["8.2", "9.1"], ["9.1", "10.2"], ["10.3", "10.6"],
];

/** Mermaid has no renderer in the app, so the one diagram becomes prose. */
const DIAGRAM_AS_TEXT = `判断 $z=f(x,y)$ 是否可微，按下面的顺序逐条排除：

1. 函数在该点不连续，则必不可微；
2. 函数在该点连续但偏导数不存在，则必不可微；
3. 偏导数存在且连续，则一定可微；
4. 偏导数存在但不连续，还要检验全增量与线性主部之差是否为 $\\rho$ 的高阶无穷小。`;

/** KaTeX understands `\\sqrt[n]{x}` but not the plain-TeX root macro. */
function fixMath(body) {
  return body.replace(/\\root\s*(\S+)\s*\\of\s*\{([^{}]*)\}/g, "\\sqrt[$1]{$2}");
}

function asciiSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "figure";
}

/** `# $\S1.1$ 函数` → `1.1 函数`; the section number keeps the tree scannable. */
function titleOf(line) {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^\$[^$]*\$\s*/, "")
    .trim();
}

function headingList(body) {
  return [...body.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((text) => !/^(例题|证明|习题|引例)$/.test(text));
}

function summaryOf(body) {
  const paragraphs = body.split(/\n{2,}/);
  for (const paragraph of paragraphs) {
    const text = paragraph.trim();
    if (!text) continue;
    if (/^(#|>|\||!\[|```|\$\$|[-*+]\s|\d+[.)]\s)/.test(text)) continue;
    const flat = text.replace(/\s+/g, " ");
    return flat.length > 200 ? `${flat.slice(0, 199)}…` : flat;
  }
  return "";
}

/** Copies one figure and returns the package-relative path the body should use. */
function copyFigure(chapterDir, original, taken) {
  const cleaned = original.replace(/\/(\d+)\.\//g, "/$1/");
  const absolute = resolve(join(source, "notes"), cleaned);
  if (!existsSync(absolute)) return null;

  const base = cleaned.split("/").pop();
  const stem = asciiSlug(base.replace(/\.[^.]+$/, ""));
  const extension = (/\.(png|jpe?g|webp)$/i.exec(base) ?? [".png"])[0].toLowerCase();
  let name = `${stem}${extension}`;
  for (let index = 2; taken.has(name); index += 1) name = `${stem}-${index}${extension}`;
  taken.add(name);

  const relative = `media/figures/${chapterDir}/${name}`;
  mkdirSync(join(pkg, "media", "figures", chapterDir), { recursive: true });
  copyFileSync(absolute, join(pkg, relative));
  return relative;
}

function rewriteBody(body, chapterDir, taken) {
  const withoutTitle = body.replace(/^#\s+.*(?:\r?\n)+/, "");
  const withFigures = withoutTitle.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (whole, alt, target) => {
      if (/^(https?:|data:)/i.test(target)) return whole;
      const copied = copyFigure(chapterDir, target, taken);
      return copied ? `![${alt}](${copied})` : "";
    },
  );
  const withDiagram = withFigures.includes("```mermaid")
    ? withFigures.replace(/```mermaid[\s\S]*?```/, DIAGRAM_AS_TEXT)
    : withFigures;
  return fixMath(withDiagram).replace(/\n{3,}/g, "\n\n").trim();
}

function writePoint(file, data, body) {
  const front = [
    "---",
    `id: ${data.id}`,
    `name: ${JSON.stringify(data.name)}`,
    `chapter: ${data.chapter}`,
    "tags:",
    ...data.tags.map((tag) => `  - ${tag}`),
    `difficulty: ${data.difficulty}`,
    `exam_importance: ${data.examImportance}`,
    "learning_objectives:",
    ...data.objectives.map((item) => `  - ${JSON.stringify(item)}`),
    ...(data.prerequisites.length
      ? ["prerequisites:", ...data.prerequisites.map((id) => `  - ${id}`)]
      : []),
    ...(data.summary ? [`summary: ${JSON.stringify(data.summary)}`] : []),
    "sources:",
    ...data.sources.map((id) => `  - ${id}`),
    "version: 1.0.0",
    "---",
    "",
  ].join("\n");
  writeFileSync(join(pkg, file), `${front}${body}\n`, "utf8");
}

const chapterPoints = new Map();
const generated = [];

for (const [dir, title, tag, difficulty, importance] of CHAPTERS) {
  const chapterId = `calculus.book.${dir}`;
  chapterPoints.set(chapterId, { title, tag, order: CHAPTERS.findIndex((c) => c[0] === dir), points: [] });

  const files = readdirSync(join(source, "notes")).filter((name) => name.startsWith(`${Number(dir.slice(2))}.`));
  files.sort((a, b) => Number(a.split(" ")[0].split(".")[1]) - Number(b.split(" ")[0].split(".")[1]));

  const taken = new Set();
  let previous = null;

  for (const name of files) {
    const section = name.split(" ")[0];
    const slug = SECTIONS[section];
    if (!slug) throw new Error(`没有为 ${name} 定义 ID`);

    const raw = readFileSync(join(source, "notes", name), "utf8");
    const body = rewriteBody(raw, dir, taken);
    const pointId = `calculus.book.${dir}.${slug}`;
    const headings = headingList(body);

    writePoint(`knowledge/concepts/${dir}-${section.replace(".", "")}-${slug}.md`, {
      id: pointId,
      name: `${section} ${titleOf(raw.split(/\r?\n/).find((line) => line.startsWith("# ")) ?? "")}`.trim(),
      chapter: chapterId,
      tags: [tag, "textbook"],
      difficulty,
      examImportance: CRITICAL.has(section) ? "critical" : importance,
      objectives: headings.length
        ? headings.slice(0, 4).map((heading) => `掌握本节「${heading}」的结论并能套用`)
        : ["能复述本节的定理与公式，并用于计算"],
      prerequisites: previous ? [previous] : [],
      summary: summaryOf(body),
      sources: ["source.textbook.bupt-calculus"],
    }, body);

    chapterPoints.get(chapterId).points.push({
      id: pointId,
      file: `knowledge/concepts/${dir}-${section.replace(".", "")}-${slug}.md`,
    });
    generated.push({ section, id: pointId, chapter: chapterId });
    previous = pointId;
  }
}

/** The appendix: revision sheets and the two chapters the textbook omits. */
function appendReference() {
  const chapterId = "calculus.book.reference";
  const entries = [
    ["formulas", "公式速查", join(notes, "公式.md"), "公式按章节汇总，适合考前通读与做题时回查。", "high"],
    ["exam-points", "考点总结", join(notes, "考点总结.md"), "选择题与计算题的常考题型清单，配解题切入点。", "critical"],
    ["series-convergence", "无穷级数的敛散性", join(notes, "无穷级数的敛散性.md"), "正项级数、交错级数与幂级数的判别法汇总。", "high"],
  ];
  const points = [];

  for (const [slug, name, file, summary, importance] of entries) {
    if (!existsSync(file)) continue;
    const body = fixMath(
      readFileSync(file, "utf8")
        .replace(/^---[\s\S]*?\n---\r?\n/, "")
        .replace(/<!-- more -->/g, "")
        .replace(/^#\s+目录[\s\S]*?(?=^#\s)/m, "")
        .trim(),
    );
    writePoint(`knowledge/concepts/reference-${slug}.md`, {
      id: `calculus.book.reference.${slug}`,
      name,
      chapter: chapterId,
      tags: ["reference", "notes"],
      difficulty: 3,
      examImportance: importance,
      objectives: ["能把本节结论直接用于真题中的对应题型"],
      prerequisites: [],
      summary,
      sources: ["source.notes.personal"],
    }, body);
    points.push({ id: `calculus.book.reference.${slug}`, file: `knowledge/concepts/reference-${slug}.md` });
  }

  // The textbook has no vector-algebra chapter, but the syllabus does.
  const noteText = readFileSync(join(notes, "笔记.md"), "utf8");
  const chapters = [...noteText.matchAll(/^##\s+(\d+)\.(.+)$/gm)];
  for (const [index, match] of chapters.entries()) {
    const number = Number(match[1]);
    if (number !== 12 && number !== 13) continue;
    const start = match.index;
    const end = chapters[index + 1]?.index ?? noteText.length;
    const body = fixMath(noteText.slice(start, end).replace(/^##\s+\d+\..*$/m, "").trim());
    const slug = number === 12 ? "vector-algebra" : "analytic-geometry";
    const name = match[2].trim();

    writePoint(`knowledge/concepts/reference-${slug}.md`, {
      id: `calculus.book.reference.${slug}`,
      name,
      chapter: chapterId,
      tags: ["geometry", "notes"],
      difficulty: 3,
      examImportance: "high",
      objectives: ["能写出空间平面与直线的方程，并判断位置关系"],
      prerequisites: [],
      summary: number === 12
        ? "向量的线性运算、数量积与向量积，是空间解析几何与曲面积分的计算基础。"
        : "由向量代数推出平面方程、直线方程与二次曲面，是空间问题的坐标化工具。",
      sources: ["source.notes.personal"],
    }, body);
    points.push({ id: `calculus.book.reference.${slug}`, file: `knowledge/concepts/reference-${slug}.md` });
  }

  chapterPoints.set(chapterId, { title: "附录 公式与考点", tag: "reference", order: 12, points });
}

appendReference();

/** index.yaml — the two hand-written chapters stay, ordered after the book. */
const handWritten = [
  {
    id: "calculus.chapter.function-and-limit",
    name: "精讲 · 函数与极限",
    order: 10,
    summary: "从函数概念出发，建立极限的直观与判定方法。",
    points: [
      ["calculus.function", "knowledge/concepts/function.md"],
      ["calculus.limit.one-sided", "knowledge/concepts/limit-one-sided.md"],
      ["calculus.limit", "knowledge/concepts/limit.md"],
    ],
  },
  {
    id: "calculus.chapter.derivative",
    name: "精讲 · 导数与微分",
    order: 11,
    summary: "从差商的极限定义出发，建立求导与微分的计算体系。",
    points: [
      ["calculus.derivative", "knowledge/concepts/derivative.md"],
      ["calculus.derivative.one-sided", "knowledge/concepts/derivative-one-sided.md"],
      ["calculus.derivative.rules", "knowledge/concepts/derivative-rules.md"],
      ["calculus.differential", "knowledge/concepts/differential.md"],
      ["calculus.derivative.high-order", "knowledge/concepts/derivative-high-order.md"],
    ],
  },
];

const indexLines = ["chapters:"];
const merged = [
  ...[...chapterPoints.entries()].map(([id, chapter]) => [id, chapter]),
  ...handWritten.map((chapter) => [
    chapter.id,
    {
      ...chapter,
      title: chapter.name,
      points: chapter.points.map(([id, file]) => ({ id, file })),
    },
  ]),
];

for (const [id, chapter] of merged) {
  indexLines.push(`  - id: ${id}`);
  indexLines.push(`    name: ${JSON.stringify(chapter.title ?? chapter.name)}`);
  indexLines.push(`    order: ${chapter.order}`);
  if (chapter.summary) indexLines.push(`    summary: ${JSON.stringify(chapter.summary)}`);
  indexLines.push("    points:");
  for (const point of chapter.points) {
    indexLines.push(`      - id: ${point.id}`);
    indexLines.push(`        file: ${point.file}`);
  }
}
writeFileSync(join(pkg, "knowledge", "index.yaml"), `${indexLines.join("\n")}\n`, "utf8");

/** relations.yaml — keep the authored edges, add the cross-chapter ones. */
const relationLines = ["relations:"];
const authored = readFileSync(join(pkg, "knowledge", "relations.yaml"), "utf8");
for (const match of authored.matchAll(/- id: (relation\.[\w.-]+)\n\s+from: ([\w.-]+)\n\s+to: ([\w.-]+)\n\s+type: (\w+)\n\s+strength: ([\d.]+)/g)) {
  // The cross-chapter edges are regenerated below; re-reading them would
  // duplicate them on the second run.
  if (match[1].startsWith("relation.book.")) continue;
  relationLines.push(`  - id: ${match[1]}`, `    from: ${match[2]}`, `    to: ${match[3]}`);
  relationLines.push(`    type: ${match[4]}`, `    strength: ${match[5]}`);
}
for (const [from, to] of CROSS_LINKS) {
  const left = generated.find((entry) => entry.section === from);
  const right = generated.find((entry) => entry.section === to);
  if (!left || !right) continue;
  relationLines.push(`  - id: relation.book.${from.replace(".", "-")}-${to.replace(".", "-")}`);
  relationLines.push(`    from: ${left.id}`, `    to: ${right.id}`, "    type: related", "    strength: 0.7");
}
writeFileSync(join(pkg, "knowledge", "relations.yaml"), `${relationLines.join("\n")}\n`, "utf8");

const total = [...chapterPoints.values()].reduce((sum, chapter) => sum + chapter.points.length, 0) + 8;
console.log(`已生成 ${total} 个知识点，覆盖 ${chapterPoints.size + handWritten.length} 个章节`);
