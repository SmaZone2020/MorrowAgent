import { useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/vendor/beui/components/motion/card";
import { SectionTitle } from "@/components/SectionTitle";
import { MathText } from "@/components/MathText";
import { ContentFigures } from "@/components/ContentFigure";
import { AnswerVerdict, type Verdict } from "@/features/training/AnswerVerdict";
import { AnswerOptions } from "@/features/training/AnswerOptions";
import { imagesAt, type Question } from "@/features/knowledge";
import { scaledText } from "@/features/training/textScale";
import { usePreferences } from "@/features/settings/preferencesStore";

type Phase = "answering" | "submitted";

export interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  onNext?: () => void;
  /** Fires once when the answer is submitted, with the choice and its verdict. */
  onAnswered?: (answer: string, isCorrect: boolean) => void;
  /** Fires when a board-only question reveals its answer without a score. */
  onRevealed?: () => void;
  /** A choice already made in this run, so a reload shows it as submitted. */
  initialAnswer?: string | null;
  /** A board question whose answer was already revealed in this run. */
  initialRevealed?: boolean;
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
  onRevealed,
  initialAnswer = null,
  initialRevealed = false,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(initialAnswer);
  const [phase, setPhase] = useState<Phase>(
    initialAnswer ? "submitted" : "answering",
  );
  // Questions that need a board have nothing to submit yet, so they can only
  // reveal the worked answer.
  const [showExplanation, setShowExplanation] = useState(initialRevealed);
  // Only the question body follows the reader's text scale; the surrounding
  // chrome keeps its size so the page does not reflow wholesale.
  const scale = usePreferences((state) => state.questionScale);

  const isChoice = question.options.length > 0;
  const correct = selected === question.answer;
  const revealExplanation = phase === "submitted" || showExplanation;
  const stemImages = imagesAt(question.images, "stem");
  const explanationImages = imagesAt(question.images, "explanation");

  const submit = () => {
    if (!selected || phase === "submitted") return;
    setPhase("submitted");
    onAnswered?.(selected, selected === question.answer);
  };

  // The verdict is drawn as a watermark inside the answer card, which only
  // renders once the answer is out, so it never has to describe "unanswered".
  const verdict: Verdict = isChoice
    ? correct
      ? "correct"
      : "wrong"
    : "revealed";

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
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <MathText
            className="block leading-[2] text-foreground"
            style={scaledText(scale)}
          >
            {question.content}
          </MathText>
          <ContentFigures images={stemImages} />
        </div>

        {isChoice ? (
          <AnswerOptions
            question={question}
            selected={selected}
            locked={phase === "submitted"}
            reveal={revealExplanation}
            scale={scale}
            onSelect={setSelected}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            这道题需要画板作答，画板还没做。
          </p>
        )}

        {revealExplanation ? (
          <div className="relative overflow-hidden rounded-xl bg-muted/50">
            <AnswerVerdict verdict={verdict} />
            <div className="relative flex flex-col gap-2 p-3 pr-16">
              <div className="flex items-center gap-2">
                <span className="text-base text-muted-foreground">正确答案</span>
                <MathText
                  className="font-medium text-foreground"
                  style={scaledText(scale)}
                >
                  {question.answer}
                </MathText>
              </div>
              <div className="flex flex-col gap-2">
                <MathText
                  className="leading-[1.8] text-muted-foreground"
                  style={scaledText(scale)}
                >
                  {question.explanation}
                </MathText>
                <ContentFigures images={explanationImages} />
              </div>
              {question.commonErrors.length > 0 ? (
                <ul className="flex flex-col gap-1 pt-1">
                  {question.commonErrors.map((error) => (
                    <li
                      key={error.description}
                      className="flex items-start gap-2 leading-5 text-muted-foreground"
                      style={scaledText(scale)}
                    >
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent-foreground/40" />
                      <MathText className="min-w-0">{error.description}</MathText>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          {isChoice && phase === "answering" ? (
            <Button size="sm" disabled={!selected} onClick={submit} className="px-6">
              提交
            </Button>
          ) : null}
          {!isChoice && !showExplanation ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowExplanation(true);
                onRevealed?.();
              }}
            >
              看答案
            </Button>
          ) : null}
          {phase === "submitted" || showExplanation ? (
            onNext ? (
              <Button size="sm" variant="secondary" onClick={onNext}>
                下一题
              </Button>
            ) : null
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
