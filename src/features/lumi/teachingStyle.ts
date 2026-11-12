/**
 * How Lumi is allowed to teach.
 *
 * This is a preference, not a prompt detail: a learner who is revising for an
 * exam wants the answer, and one who is learning wants to be asked. The prompt
 * registry reads it, the settings page writes it, and nothing else needs to know.
 */
export const TEACHING_STYLES = ["guided", "direct", "socratic"] as const;

export type TeachingStyle = (typeof TEACHING_STYLES)[number];

export const TEACHING_STYLE_LABEL: Record<TeachingStyle, string> = {
  guided: "先问后讲",
  direct: "直接讲解",
  socratic: "只提问",
};

export const TEACHING_STYLE_HINT: Record<TeachingStyle, string> = {
  guided: "先确认你卡在哪一步，再给出这一步的解法。",
  direct: "直接给结论和完整过程，不反问。",
  socratic: "不直接给答案，用问题一步步把你带到结论。",
};

export function asTeachingStyle(value: string): TeachingStyle {
  return (TEACHING_STYLES as readonly string[]).includes(value)
    ? (value as TeachingStyle)
    : "guided";
}
