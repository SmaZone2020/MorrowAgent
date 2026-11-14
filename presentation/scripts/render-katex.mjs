// One-off: pre-render KaTeX snippets used by the deck into HTML strings.
import katex from "katex";
import { writeFileSync } from "node:fs";

const exprs = {
  derivative:
    "\\lim_{x \\to x_0} \\dfrac{f(x) - f(x_0)}{x - x_0} = f'(x_0)",
  integral: "\\int_a^b f(x)\\,dx = F(b) - F(a)",
  chain: "\\left( \\dfrac{dy}{dx} \\right)_{\\! x_0} = f'\\!(x_0)",
  epsilon:
    "\\forall \\varepsilon > 0,\\ \\exists \\delta > 0,\\ 0 < |x - x_0| < \\delta \\Rightarrow |f(x) - A| < \\varepsilon",
  variation: "\\lim_{x \\to 0} \\dfrac{\\sin 2x}{\\tan 3x} = \\ ?",
  law: "\\lim_{x \\to x_0} f(x) = A \\iff \\lim_{x \\to x_0^-} f(x) = \\lim_{x \\to x_0^+} f(x) = A",
};

const out = {};
for (const [key, tex] of Object.entries(exprs)) {
  out[key] = katex.renderToString(tex, { displayMode: true, output: "html" });
}
writeFileSync(
  new URL("../assets/katex-pre.json", import.meta.url),
  JSON.stringify(out),
);
console.log("ok:", Object.keys(out).join(", "));
