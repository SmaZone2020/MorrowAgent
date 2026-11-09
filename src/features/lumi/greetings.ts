/**
 * Time-of-day greeting shown under Lumi on the empty state. Daytime slots nudge
 * the user toward studying; the late-night slots only tell them to rest, since
 * pushing someone to grind at 3am is not encouragement.
 */
interface GreetingSlot {
  /** First hour of the slot (inclusive), 0-23. */
  from: number;
  /** Last hour of the slot (exclusive), or 24 for the slot that ends the day. */
  to: number;
  text: string;
}

const GREETINGS: GreetingSlot[] = [
  { from: 0, to: 5, text: "凌晨好，先去睡一觉，明天再学。" },
  { from: 5, to: 11, text: "早上好，今天从一小步开始。" },
  { from: 11, to: 13, text: "中午好，吃过饭再接着来。" },
  { from: 13, to: 17, text: "下午好，趁状态还在推进一点。" },
  { from: 17, to: 19, text: "傍晚好，把今天的内容收个尾。" },
  { from: 19, to: 23, text: "晚上好，慢慢来也来得及。" },
  { from: 23, to: 24, text: "午夜好，别熬太晚，早点休息。" },
];

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  const slot = GREETINGS.find((entry) => hour >= entry.from && hour < entry.to);
  return slot?.text ?? GREETINGS[1]!.text;
}
