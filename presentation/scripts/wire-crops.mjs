// Point the five screenshot slots at the cropped 5:4 content crops.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../slides.js", import.meta.url);
let src = readFileSync(file, "utf8");

const map = {
  "lumi-chat-shot.png": "lumi-chat.png",
  "zhenduan-shot.png": "diag.png",
  "xuexihuaxiang-shot.png": "profile.png",
  "cuotiben.png": "train.png",
  "moni-kaoshi.png": "exam.png",
};

let n = 0;
for (const [from, to] of Object.entries(map)) {
  const needle = `"${from}"`;
  while (src.includes(needle)) {
    src = src.replace(needle, `"${to}"`);
    n++;
  }
}
writeFileSync(file, src);
console.log("rewired:", n);
