import { useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/vendor/beui/components/motion/card";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { SectionTitle } from "@/components/SectionTitle";
import { MathText } from "@/components/MathText";
import type { Question } from "@/features/knowledge";

type Phase = "answering" | "submitted";

export interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  onNext?: () => void;
  /** Fires once when the answer is submitted, with the choice and its verdict. */
  onAnswered?: (answer: string, isCorrect: boolean) => void;
}

/**
 * One question, answered in place. The card owns only its own answer state;
 * scoring across a set belongs to the page that renders the list.
 */
export function QuestionCard({
  question,
  index,
  total,
  onNext,
  onAnswered,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");

  const isChoice = question.options.length > 0;
  const correct = selected === question.answer;

  const submit = () => {
    if (!selected || phase === "submitted") return;
    setPhase("submitted");
    onAnswered?.(selected, selected === question.answer);
  };

  return (
    <Card
      variant="outlined"
      size="compact"
      className="border-transparent bg-card shadow-surface"
    >
      <CardHeader>
        <CardTitle as="h2">
          <SectionTitle
            title={`第 ${index} / ${total} 题`}
            action={
              <AnimatedBadge
                status={
                  phase === "answering"
                    ? "neutral"
                    : correct
                      ? "success"
                      : "danger"
                }
                size="sm"
                contentKey={phase === "answering" ? "answering" : correct ? "right" : "wrong"}
              >
                {phase === "answering" ? "未作答" : correct ? "正确" : "错误"}
              </AnimatedBadge>
            }
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <MathText className="block text-sm leading-7 text-foreground">
          {question.content}
        </MathText>

        {isChoice ? (
          <div className="flex flex-col gap-2" role="radiogroup">
            {question.options.map((option) => {
              const chosen = selected === option.key;
              const reveal = phase === "submitted";
              const isAnswer = option.key === question.answer;
              return (
                <Button
                  key={option.key}
                  role="radio"
                  aria-checked={chosen}
                  variant={chosen ? "secondary" : "ghost"}
                  className={`h-auto w-full justify-start rounded-xl px-4 py-2.5 text-left ${
                    reveal && isAnswer ? "ring-1 ring-primary/40" : ""
                  } ${reveal && chosen && !isAnswer ? "opacity-55" : ""}`}
                  onClick={() => {
                    // After submitting the choice is frozen, but keeping the
                    // button enabled preserves the revealed state's contrast;
                    // a disabled button would wash the right answer out.
                    if (phase === "submitted") return;
                    setSelected(option.key);
                  }}
                >
                  <span className="mr-2 shrink-0 font-medium tabular-nums">
                    {option.key}
                  </span>
                  <MathText className="min-w-0 whitespace-normal">
                    {option.content}
                  </MathText>
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">在画板上作答</p>
        )}

        {phase === "submitted" ? (
          <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">正确答案</span>
              <MathText className="font-medium text-foreground">
                {question.answer}
              </MathText>
            </div>
            <MathText className="text-sm leading-6 text-muted-foreground">
              {question.explanation}
            </MathText>
            {question.commonErrors.length > 0 ? (
              <ul className="flex flex-col gap-1 pt-1">
                {question.commonErrors.map((error) => (
                  <li
                    key={error.description}
                    className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"
                  >
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent-foreground/40" />
                    <span>{error.description}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          {phase === "answering" ? (
            <Button size="sm" disabled={!selected} onClick={submit}>
              提交
            </Button>
          ) : onNext ? (
            <Button size="sm" variant="secondary" onClick={onNext}>
              下一题
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
