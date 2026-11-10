// The question body is laid out at `text-sm` when the scale is 1. Anything that
// carries the reader's scale has to own its font-size: a hard-coded `text-sm`
// on a descendant wins over the inherited size and silently drops the scale.
const QUESTION_BASE_REM = 0.875;

export function scaledText(scale: number) {
  return { fontSize: `calc(${scale} * ${QUESTION_BASE_REM}rem)` };
}
