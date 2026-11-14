// Quick smoke test: build the deck's slide HTML in Node and print the order,
// so a broken template or a stray quote fails before the browser does.
import { readFileSync } from "node:fs";

globalThis.window = globalThis;
globalThis.document = { createElement: () => ({}) };
globalThis.KATEX_PRE = {};

const load = (file) => {
  const code = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  new Function("window", code)(globalThis);
};

load("icons.js");
window.LUMI_SVG = () => "";
load("slides.js");

const slides = window.buildSlides();
console.log("slides:", slides.length);
slides.forEach((html, i) => {
  const key = (html.match(/data-k="([a-z]+)"/) || [])[1];
  const num = (html.match(/class="num a d1">(\d+)</) || [])[1];
  const title = (html.match(/class="slide-title[^"]*">([^<]*)/) || [])[1] || "";
  console.log(String(i + 1).padStart(2), key?.padEnd(10), "label:", num ?? "-", title);
});
