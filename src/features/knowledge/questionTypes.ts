/**
 * Question types as a reader names them.
 *
 * The package stores `single_choice`, `fill_blank` and so on. A page that shows
 * a question has to say which kind it is, and the wording has to match in the
 * preview dialog and in a list of references, so it lives here instead of being
 * spelled out per component.
 */
const TYPE_LABEL: Record<string, string> = {
  single_choice: "选择题",
  multiple_choice: "多选题",
  fill_blank: "填空题",
  calculation: "计算题",
  proof: "证明题",
  true_false: "判断题",
  short_answer: "简答题",
  application: "应用题",
  ordering: "排序题",
};

/** An unknown type still reads as a question rather than as a raw enum value. */
export function questionTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? "题目";
}
