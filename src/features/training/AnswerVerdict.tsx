import { CircleCheck, CircleXmark, CircleQuestion } from "@gravity-ui/icons";

export type Verdict = "correct" | "wrong" | "revealed";

const TONE: Record<
  Verdict,
  { icon: typeof CircleCheck; label: string; color: string }
> = {
  correct: { icon: CircleCheck, label: "正确", color: "var(--success)" },
  wrong: { icon: CircleXmark, label: "错误", color: "var(--destructive)" },
  revealed: { icon: CircleQuestion, label: "已看答案", color: "var(--info)" },
};

/**
 * Marks the answer card without a badge: a low-saturation ring sits half over
 * the card's right edge, so the state reads at a glance and stays out of the
 * text flow. The label is announced to assistive tech even though it is drawn
 * as a shape.
 */
export function AnswerVerdict({ verdict }: { verdict: Verdict }) {
  const { icon: Icon, label, color } = TONE[verdict];

  return (
    <span
      role="img"
      aria-label={label}
      className="pointer-events-none absolute top-4/5 right-6 flex -translate-y-1/2 translate-x-1/2 rotate-[-10deg] items-center justify-center"
      style={{ color }}
    >
      <span
        className="flex size-24 items-center justify-center rounded-full opacity-70"
        style={{ borderColor: "currentColor" }}
      >
        <Icon className="size-[250px]" />
      </span>
    </span>
  );
}
