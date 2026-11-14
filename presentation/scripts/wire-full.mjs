// Point the screenshot slots back at the full-size captures: the 3:2 box in
// CSS matches them exactly, so nothing gets cropped away.
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../slides.js", import.meta.url);
let src = readFileSync(file, "utf8");

const map = {
  "lumi-chat.png": "lumi-chat-shot.png",
  "diag.png": "zhenduan-shot.png",
  "profile.png": "xuexihuaxiang-shot.png",
  "train.png": "cuotiben.png",
  "exam.png": "moni-kaoshi.png",
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
