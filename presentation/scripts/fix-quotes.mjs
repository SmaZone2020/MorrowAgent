// One-shot typography pass: straight ASCII quotes used as Chinese quotation
// marks inside HTML text become “ ”. JS string delimiters, HTML attribute
// quotes and `${...}` interpolations are deliberately left alone:
//   - the opening quote must follow CJK text, `“《` or a tag's `>`
//   - the quoted run may not contain tags or interpolation braces
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../slides.js", import.meta.url);
const src = readFileSync(file, "utf8");

const CJK = "\\u4e00-\\u9fa5";
const OPEN_PREV = `[${CJK}>《：（]`;
const CLOSE_NEXT = `[${CJK}<，。；：、）！？…》」—]`;
const BODY = `[^"<>{}()\\r\\n]*?[${CJK}][^"<>{}()\\r\\n]*?`;

const re = new RegExp(`(?<=${OPEN_PREV})"(${BODY})"(?=${CLOSE_NEXT})`, "g");

let count = 0;
const out = src.replace(re, (_, body) => {
  count++;
  return `\u201c${body}\u201d`;
});

writeFileSync(file, out);
console.log("converted quote pairs:", count);
