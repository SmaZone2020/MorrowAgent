/**
 * Comparing a typed answer with the authored one.
 *
 * The stored answer is LaTeX (`$\frac{3}{2}$`, `$(1,5)\cup(5,+\infty)$`) while
 * the user types plain text, so an exact string comparison would mark correct
 * work wrong. Normalising folds the notation both sides disagree on and nothing
 * else; a mismatch still means "not verifiable", never "wrong" on its own.
 */
const SYMBOLS: Record<string, string> = {
  "\\infty": "∞",
  "\\cup": "∪",
  "\\cap": "∩",
  "\\pi": "π",
  "\\alpha": "α",
  "\\beta": "β",
  "\\theta": "θ",
  "\\times": "×",
  "\\div": "÷",
  "\\cdot": "·",
  "\\le": "≤",
  "\\leq": "≤",
  "\\ge": "≥",
  "\\geq": "≥",
  "\\ne": "≠",
  "\\neq": "≠",
  "\\to": "→",
  "\\pm": "±",
};

/** Expands the few commands that appear in the answer keys of this package. */
function expandLatex(value: string): string {
  return value
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2")
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
    .replace(
      /\\(infty|cup|cap|pi|alpha|beta|theta|times|div|cdot|le|leq|ge|geq|ne|neq|to|pm)\b/g,
      (match) => SYMBOLS[match] ?? match,
    );
}

export function normalizeAnswer(value: string): string {
  return expandLatex(value)
    .replace(/\$/g, "")
    .replace(/[，、]/g, ",")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[：]/g, ":")
    .replace(/[；]/g, ";")
    .replace(/[－−–]/g, "-")
    .replace(/[。]/g, "")
    .replace(/\s+/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

/** True when the typed answer matches the authored one after normalising. */
export function answersMatch(typed: string, expected: string): boolean {
  const left = normalizeAnswer(typed);
  const right = normalizeAnswer(expected);
  if (!left || !right) return false;
  return left === right;
}
