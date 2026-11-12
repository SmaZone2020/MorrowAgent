/**
 * How long an answer is allowed to run, phrased as an outcome.
 *
 * A token ceiling is the one generation setting with a visible effect on the
 * reader — a cut-off derivation is obviously worse than a complete one — so it
 * is the only one left on the page. The temperature comes along for the ride
 * because a terse answer and a random one are opposites: the longer the reply,
 * the more room there is for invention.
 */
export const REPLY_LENGTHS = [
  {
    value: "brief",
    label: "简短",
    detail: "一两段，直接给结论",
    maxTokens: 2048,
    temperature: 0.3,
  },
  {
    value: "balanced",
    label: "适中",
    detail: "默认，够讲清一个方法",
    maxTokens: 8192,
    temperature: 0.6,
  },
  {
    value: "detailed",
    label: "详尽",
    detail: "完整推导与举例",
    maxTokens: 16384,
    temperature: 0.4,
  },
] as const;

export type ReplyLength = (typeof REPLY_LENGTHS)[number]["value"];
