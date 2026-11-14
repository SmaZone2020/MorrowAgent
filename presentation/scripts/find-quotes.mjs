// Report remaining straight ASCII quotes that sit directly against CJK text.
// Those are Chinese quotation marks typed as " and should be “ ”.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../slides.js", import.meta.url), "utf8");
const lines = src.split(/\r?\n/);
const cjk = /[\u4e00-\u9fa5]/;

lines.forEach((line, i) => {
  for (let j = 0; j < line.length; j++) {
    if (line[j] !== '"') continue;
    const prev = line[j - 1] ?? "";
    const next = line[j + 1] ?? "";
    if (cjk.test(prev) && !cjk.test(next) && /[,;\]\)]/.test(next)) continue; // JS delimiter
    if (!cjk.test(prev) && !cjk.test(next)) continue;
    if (cjk.test(prev) && /[\s,;\]\)]/.test(next)) continue;
    console.log(`${i + 1}: ...${line.slice(Math.max(0, j - 26), j + 26)}`);
    break;
  }
});
