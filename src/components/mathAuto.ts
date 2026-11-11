/**
 * Turns a formula-shaped plain string into `$...$` LaTeX.
 *
 * Plot titles and curve labels arrive from the model as text like
 * `y = e^(-k·x²) 钟形`: the maths and a Chinese tail sit in one string, and only
 * the maths part should be typeset. Authors who already wrote `$...$` keep full
 * control — this only fills in the missing delimiters around each math run.
 */

const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
};

/** Characters that are fair game inside a formula run. */
const MATH_CHAR =
  /[A-Za-z0-9\s+\-*/^_=<>()[\]{}|.,!:;·×÷√π∞∑∏∫≤≥≠±→⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/;
const CJK = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/;

function normalizeRun(run: string): string {
  return run
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (block) => {
      const digits = [...block].map((char) => SUPERSCRIPT[char] ?? char).join("");
      return `^{${digits}}`;
    })
    // `e^(-k·x)` reads better as `e^{-k\cdot x}`: a bare group after `^` would
    // otherwise superscript only the opening parenthesis.
    .replace(/\^\(([^()]*)\)/g, "^{$1}")
    .replace(/·/g, "\\cdot ")
    .replace(/×/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A run only worth typesetting when it carries an operator or a command. */
function isMathish(run: string): boolean {
  return /[\^_=]|\\[a-z]/i.test(run);
}

/**
 * Splits on CJK characters, then wraps each math-looking run. A run without an
 * operator is left alone: a bare "x" reads better as plain text.
 */
export function autoMath(text: string): string {
  if (text.includes("$")) return text;

  const parts: string[] = [];
  let buffer = "";
  for (const char of text) {
    if (CJK.test(char) || !MATH_CHAR.test(char)) {
      if (buffer) parts.push(buffer);
      parts.push(char);
      buffer = "";
      continue;
    }
    buffer += char;
  }
  if (buffer) parts.push(buffer);

  return parts
    .map((part) => {
      if (CJK.test(part) || !part.trim()) return part;
      const run = normalizeRun(part);
      if (!run || !isMathish(run)) return part;
      // Keep the surrounding spaces outside the delimiters so the line still
      // breaks like prose rather than like one long inline formula.
      const lead = part.startsWith(" ") ? " " : "";
      const trail = part.endsWith(" ") ? " " : "";
      return `${lead}$${run}$${trail}`;
    })
    .join("");
}
