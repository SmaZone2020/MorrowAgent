// Wire screenshot slots to the real files the user dropped in assets/shots.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const here = new URL("../", import.meta.url);
const file = new URL("../slides.js", import.meta.url);
const shots = readdirSync(new URL("../assets/shots", import.meta.url));

const map = {
  "ws.png": "lumi-chat-shot.png",
  "diag.png": "zhenduan-shot.png",
  "profile.png": "xuexihuaxiang-shot.png",
  "train.png": "cuotiben.png",
  "exam.png": "moni-kaoshi.png",
};

let src = readFileSync(file, "utf8");
let changed = 0;
for (const [from, to] of Object.entries(map)) {
  if (!shots.includes(to)) {
    console.log("missing asset:", to);
    continue;
  }
  const needle = `"${from}"`;
  while (src.includes(needle)) {
    src = src.replace(needle, `"${to}"`);
    changed++;
  }
}
writeFileSync(file, src);
console.log("rewired:", changed, "available:", shots.join(", "));
