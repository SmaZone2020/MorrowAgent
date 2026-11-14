// Bundle the deck into one self-contained HTML file.
//
// The source deck is authored as many small files and loads its serif from
// ../src/assets over http. That is fine on a dev server but useless when the
// deck has to travel on a USB stick, so this script folds everything — CSS, JS,
// fonts, screenshots and the demo video — into a single .html that opens from
// file:// with no network and no sibling folders.
//
// Fonts are subset to the glyphs the deck actually renders (11 MB of OTFs would
// otherwise dominate the file); screenshots are re-encoded to WebP.
//
// Usage: node presentation/scripts/build-single.mjs
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const DECK = resolve(import.meta.dirname, "..");
const PROJECT = resolve(DECK, "..");
const OUT = resolve(DECK, "deck.html");
const WORK = join(tmpdir(), "morrow-deck-build");

// Order matters: it mirrors the <script> tags in index.html.
const SCRIPTS = [
  "assets/katex-pre.js",
  "icons.js",
  "lumi.js",
  "assets/lumi/geometry-data.js",
  "assets/lumi/math.js",
  "assets/lumi/tables.js",
  "assets/lumi/pose.js",
  "assets/lumi/tricks.js",
  "assets/lumi/fx.js",
  "assets/lumi/eyes.js",
  "assets/lumi/character.js",
  "squircle.js",
  "slides.js",
  "lumi-play.js",
  "main.js",
];

// Screenshots the slides ask for. `slides.js` builds these paths at runtime, so
// the map is handed to the page and applied by window.resolveAssets().
const IMAGES = [
  "assets/morrow-mark.png",
  "assets/shots/cuotiben.png",
  "assets/shots/lumi-chat-shot.png",
  "assets/shots/moni-kaoshi.png",
  "assets/shots/xuexihuaxiang-shot.png",
  "assets/shots/zhenduan-shot.png",
];

const pickPython = () => {
  for (const candidate of [process.env.PYTHON, "py", "python3", "python"]) {
    if (!candidate) continue;
    const probe = spawnSync(candidate, ["-c", "import fontTools, brotli"], { encoding: "utf8" });
    if (probe.status === 0) return candidate;
  }
  throw new Error("fontTools + brotli are required: pip install fonttools brotli");
};

const run = (cmd, args, label) => {
  const res = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (res.status !== 0) throw new Error(`${label} failed:\n${res.stderr || res.stdout}`);
  return res.stdout;
};

const dataUri = (mime, bytes) => `data:${mime};base64,${bytes.toString("base64")}`;

await rm(WORK, { recursive: true, force: true });
await mkdir(WORK, { recursive: true });

/* ---------- 1 · glyph inventory ---------- */
// Everything that can appear on screen, plus the Latin/punctuation ranges the
// deck mixes in. Subsetting to this keeps the serif under ~400 KB per weight.
const sources = await Promise.all(
  ["index.html", "styles.css", ...SCRIPTS].map((f) => readFile(join(DECK, f), "utf8")),
);
const chars = new Set();
for (const text of sources) for (const ch of text) chars.add(ch);
for (let c = 0x20; c < 0x7f; c += 1) chars.add(String.fromCharCode(c));
for (const ch of "　、。，．·—–…“”‘’「」『』《》〈〉（）【】〔〕：；！？·／×÷±≤≥≠≈→←↑↓↔·•™©®°№§¶†‡") chars.add(ch);
const glyphText = [...chars].join("");
const glyphFile = join(WORK, "glyphs.txt");
await writeFile(glyphFile, glyphText, "utf8");

/* ---------- 2 · serif faces (subset → woff2) ---------- */
const FONTS = [
  ["MorrowSerif", 400, "SourceHanSerifCN-Regular-1.otf"],
  ["MorrowSerif", 600, "SourceHanSerifCN-SemiBold-7.otf"],
  ["MorrowSerif", 900, "SourceHanSerifCN-Heavy-4.otf"],
];

const python = pickPython();
const faces = [];
for (const [family, weight, file] of FONTS) {
  const src = join(PROJECT, "src", "assets", "SiYuanSongTiRegular", file);
  const dest = join(WORK, file.replace(/\.otf$/, ".subset.woff2"));
  run(
    python,
    [
      "-m", "fontTools.subset", src,
      `--text-file=${glyphFile}`,
      "--flavor=woff2",
      "--layout-features=*",
      "--name-IDs=*",
      "--notdef-outline",
      "--no-hinting",
      "--desubroutinize",
      `--output-file=${dest}`,
    ],
    `subset ${file}`,
  );
  faces.push({ family, weight, uri: dataUri("font/woff2", await readFile(dest)) });
  console.log(`font ${file} → ${(await readFile(dest)).length} bytes`);
}

/* ---------- 3 · KaTeX stylesheet, fonts inlined ---------- */
let katexCss = await readFile(join(DECK, "assets/katex/katex.min.css"), "utf8");
const katexUris = new Map();
for (const [, name] of katexCss.matchAll(/url\(fonts\/([^)]+?\.woff2)\)/g)) {
  if (katexUris.has(name)) continue;
  const bytes = await readFile(join(DECK, "assets/katex/fonts", name));
  katexUris.set(name, dataUri("font/woff2", bytes));
}
// Keep only the woff2 source; woff/ttf fallbacks are dead weight once inlined.
katexCss = katexCss
  .replace(/src:url\(fonts\/[^)]+?\.woff2\) format\("woff2"\),url\(fonts\/[^)]+?\.woff\) format\("woff"\),url\(fonts\/[^)]+?\.ttf\) format\("truetype"\)/g, (m) => {
    const name = m.match(/fonts\/([^)]+?\.woff2)/)[1];
    return `src:url(${katexUris.get(name)}) format("woff2")`;
  });
if (/url\(fonts\//.test(katexCss)) throw new Error("unresolved KaTeX font reference");

/* ---------- 4 · deck stylesheet ---------- */
let css = await readFile(join(DECK, "styles.css"), "utf8");
const fontCss = faces
  .map(
    (f) =>
      `@font-face{font-family:"${f.family}";src:url(${f.uri}) format("woff2");font-weight:${f.weight};font-display:swap}`,
  )
  .join("\n");
css = css.replace(/@font-face\{[^}]*\}\n?/g, (block) =>
  /SymbolsNerdFont|\.ttf|\.otf/.test(block) ? "" : block,
);
if (/\.(otf|ttf)/.test(css)) throw new Error("unresolved stylesheet font reference");

/* ---------- 5 · screenshots → WebP ---------- */
const assets = {};
for (const rel of IMAGES) {
  const src = join(DECK, rel);
  const dest = join(WORK, rel.replace(/\.png$/, ".webp").replace(/[\\/]/g, "_"));
  run(
    "ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", "-i", src, "-vf", "scale='min(1600,iw)':-2", "-c:v", "libwebp", "-quality", "84", dest],
    `webp ${rel}`,
  );
  const bytes = await readFile(dest);
  assets[rel] = dataUri("image/webp", bytes);
  console.log(`img  ${rel} → ${bytes.length} bytes`);
}

// The one video the deck plays (slide 7). It is already a small, web-ready H.264
// clip, so it goes in untouched — re-encoding only adds generation loss.
const videoRel = "assets/shots/theme.mp4";
const videoBytes = await readFile(join(DECK, videoRel));
assets[videoRel] = dataUri("video/mp4", videoBytes);
console.log(`vid  ${videoRel} → ${videoBytes.length} bytes`);

/* ---------- 6 · assemble ---------- */
const scriptTags = [];
for (const rel of SCRIPTS) {
  const code = await readFile(join(DECK, rel), "utf8");
  if (code.includes("</script")) throw new Error(`${rel} would close the inline <script> tag`);
  scriptTags.push(`<script>/* ${rel} */\n${code}\n</script>`);
}

const bootstrap = `<script>
  window.__DECK_ASSETS = ${JSON.stringify(assets)};
  window.resolveAssets = (html) =>
    html.replace(/assets\\/[A-Za-z0-9._\\/-]+/g, (path) => window.__DECK_ASSETS[path] || path);
</script>`;

const page = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Morrow Agent · 汉中市第八届职业院校技能大赛</title>
<style>
${fontCss}
${katexCss}
${css}
</style>
</head>
<body>
<div id="progress"></div>
<div id="stage"></div>
<div id="counter"></div>
<div id="hint"></div>

${bootstrap}
${scriptTags.join("\n")}
<script>
  // Slides mount first, then the deck binds navigation and plays slide 1.
  window.KATEX_PRE = window.KATEX_PRE || {};
  const stage = document.getElementById("stage");
  window.buildSlides().forEach((html) => {
    if (window.resolveAssets) html = window.resolveAssets(html);
    const box = document.createElement("div");
    box.innerHTML = html.trim();
    stage.appendChild(box.firstElementChild);
  });
  window.deckInit();
  window.Squircle.applyAll();
  window.LumiPlay.init();
</script>
</body>
</html>
`;

await writeFile(OUT, page, "utf8");
console.log(`\ndeck.html → ${OUT} (${(page.length / 1048576).toFixed(2)} MB)`);
if (!existsSync(OUT)) throw new Error("output missing");
