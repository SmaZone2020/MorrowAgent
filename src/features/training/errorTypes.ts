/**
 * The vocabulary a wrong answer is filed under.
 *
 * The list comes from the diagnostic strategy document, not from the UI: it is
 * how a mistake is *named*, so it must stay short enough to pick from and
 * precise enough to act on. "计算失误" and "概念理解" imply two different
 * remedies, and that is the only reason to ask at all.
 */
export const ERROR_TYPES = [
  "concept",
  "formula",
  "calculation",
  "logic",
  "method",
  "reading",
  "transfer",
  "expression",
] as const;

export type ErrorType = (typeof ERROR_TYPES)[number];

export const ERROR_TYPE_LABEL: Record<ErrorType, string> = {
  concept: "概念理解",
  formula: "公式定理使用",
  calculation: "计算失误",
  logic: "逻辑推理",
  method: "方法选择",
  reading: "审题理解",
  transfer: "知识迁移",
  expression: "表达不完整",
};

/** Narrow an arbitrary stored string; anything unknown reads as unclassified. */
export function asErrorType(value: string): ErrorType | null {
  return (ERROR_TYPES as readonly string[]).includes(value)
    ? (value as ErrorType)
    : null;
}

/**
 * The label for a stored value. An unclassified attempt is not an error state:
 * the learner simply has not said why yet, so it reads as an invitation.
 */
export function errorTypeLabel(value: string): string {
  const known = asErrorType(value);
  return known ? ERROR_TYPE_LABEL[known] : "未标注原因";
}
