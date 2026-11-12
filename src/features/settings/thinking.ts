/**
 * The thinking switch, in one place.
 *
 * DeepSeek can think before answering, and the effort is worth exposing: a
 * quick definition does not need the same depth as a proof. The levels here are
 * the ones the endpoint actually distinguishes — its own mapping table folds
 * `minimal`, `low` and `medium` onto `low`/`high`, so offering seven names would
 * only repeat the same three behaviours under different labels.
 */
export type ThinkingLevel = "off" | "low" | "high" | "max";

export const THINKING_LEVELS: ThinkingLevel[] = ["off", "low", "high", "max"];

const LABEL: Record<ThinkingLevel, string> = {
  off: "不思考",
  low: "快速",
  high: "深入",
  max: "最深",
};

const HINT: Record<ThinkingLevel, string> = {
  off: "直接回答，最省时间。",
  low: "先想一小步再答，适合查定义、对答案。",
  high: "默认深度，推理与讲解都顾得上。",
  max: "想得最久，难题与证明题再开。",
};

export function thinkingLabel(level: ThinkingLevel): string {
  return LABEL[level];
}

export function thinkingHint(level: ThinkingLevel): string {
  return HINT[level];
}

/** A stored preference is a string; anything unknown becomes the default. */
export function asThinkingLevel(value: string): ThinkingLevel {
  return THINKING_LEVELS.includes(value as ThinkingLevel)
    ? (value as ThinkingLevel)
    : "high";
}

/**
 * Whether a provider gets the switch at all.
 *
 * Only the builtin DeepSeek provider does: it is the one endpoint documented to
 * accept `thinking`, and sending the field to anything else risks a 400 from a
 * strict OpenAI-compatible server. A hand-added provider pointed at DeepSeek's
 * URL could think too, but guessing from a URL is how the app would start
 * breaking other people's gateways.
 */
export function supportsThinking(provider: { id: string; builtin?: boolean }): boolean {
  return provider.builtin === true || provider.id === "deepseek";
}

/**
 * The request fields for one level.
 *
 * `off` is sent explicitly rather than omitted: DeepSeek's own default is on, so
 * a missing field would mean the opposite of what the user chose.
 */
export function thinkingPayload(level: ThinkingLevel): {
  thinking: { type: "enabled" | "disabled"; effort?: string };
  reasoningEffort?: string;
} {
  if (level === "off") return { thinking: { type: "disabled" } };
  return {
    thinking: { type: "enabled", effort: level },
    reasoningEffort: level,
  };
}
