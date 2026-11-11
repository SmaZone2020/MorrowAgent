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
import { AnswerInput } from "@/features/training/AnswerInput";
import { answersMatch } from "@/features/training/answerMatch";
import { imagesAt, type Question } from "@/features/knowledge";
import { ScratchpadPanel } from "@/features/scratchpad/Scratchpad";
import { scaledText } from "@/features/training/textScale";
import { usePreferences } from "@/features/settings/preferencesStore";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { workspaceScope } from "@/features/uiState/scope";

type Phase = "answering" | "submitted";

/**
 * Question types whose answer cannot be compared as text: a correct integral
 * may be written three ways. Those are marked by the reader once the worked
 * answer is on screen, which is honest about what the app can verify.
 */
const SELF_ASSESSED = new Set([
  "calculation",
  "proof",
  "short_answer",
  "application",
]);

export interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  onNext?: () => void;
  /** Fires once when the answer is submitted, with the answer and its verdict. */
  onAnswered?: (answer: string, isCorrect: boolean) => void;
  /** Fires when a question reveals its answer without a score. */
  onRevealed?: () => void;
  /** An answer already given in this run, so a reload shows it as submitted. */
  initialAnswer?: string | null;
  /** The verdict recorded for this question in this run, if any. */
  initialVerdict?: Verdict | null;
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
  initialVerdict = null,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(initialAnswer);
  const [phase, setPhase] = useState<Phase>(
    initialAnswer ? "submitted" : "answering",
  );
  // Questions that need a board have nothing to submit yet, so they can only
  // reveal the worked answer.
  const [showExplanation, setShowExplanation] = useState(
    initialVerdict === "revealed",
  );
  // Only a self-assessed question reaches a verdict after the answer is out.
  const [selfVerdict, setSelfVerdict] = useState<Verdict | null>(
    initialVerdict === "correct" || initialVerdict === "wrong"
      ? initialVerdict
      : null,
  );
  // Only the question body follows the reader's text scale; the surrounding
  // chrome keeps its size so the page does not reflow wholesale.
  const scale = usePreferences((state) => state.questionScale);
  const workspaceId = useWorkspaceId();

  const isChoice = question.options.length > 0;
  const typed = !isChoice;
  const selfAssessed = typed && SELF_ASSESSED.has(question.questionType);
  const answer = selected ?? "";
  const revealExplanation = phase === "submitted" || showExplanation;
  const stemImages = imagesAt(question.images, "stem");
  const explanationImages = imagesAt(question.images, "explanation");
  const steps = question.solution?.steps ?? [];

  const submit = () => {
    if (!answer.trim() || phase === "submitted") return;
    setPhase("submitted");
    // A self-assessed question has no verdict yet: the reader marks it after
    // comparing their work with the solution.
    if (!selfAssessed) {
      onAnswered?.(answer, answersMatch(answer, question.answer));
    }
  };

  const mark = (isCorrect: boolean) => {
    const verdict: Verdict = isCorrect ? "correct" : "wrong";
    setSelfVerdict(verdict);
    onAnswered?.(answer, isCorrect);
  };

  // The verdict is drawn as a watermark inside the answer card, which only
  // renders once the answer is out, so it never has to describe "unanswered".
  // Revealing without answering is not a wrong answer, so it says so.
  const verdict: Verdict =
    phase !== "submitted" && !selfVerdict
      ? "revealed"
      : isChoice
        ? selected === question.answer
          ? "correct"
          : "wrong"
        : selfAssessed
          ? (selfVerdict ?? "revealed")
          : answersMatch(answer, question.answer)
            ? "correct"
            : "wrong";

  return (
    <Card
      variant="outlined"
      size="compact"
      className="border-transparent bg-card shadow-surface"
    >
      <CardHeader>
        <CardTitle as="h2">
          <SectionTitle title={`第 ${index} / ${total} 题`} />
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
          <div className="flex flex-col gap-3">
            <AnswerInput
              value={answer}
              locked={phase === "submitted"}
              multiline={selfAssessed}
              scale={scale}
              onChange={setSelected}
              onSubmit={submit}
            />
            {/* A calculation is worked out, not guessed; the board is where
                that happens and where the reader checks it against the steps. */}
            {selfAssessed ? (
              <ScratchpadPanel
                height={220}
                persistKey={workspaceScope(
                  workspaceId,
                  `drill.ink.${question.id}`,
                )}
              />
            ) : null}
          </div>
        )}

        {revealExplanation ? (
          <div className="relative overflow-hidden rounded-xl bg-muted/50">
            <AnswerVerdict verdict={verdict} />
            <div className="relative flex flex-col gap-3 p-3 pr-16">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-base text-muted-foreground">正确答案</span>
                <MathText
                  className="font-medium text-foreground"
                  style={scaledText(scale)}
                >
                  {question.solution?.finalAnswer || question.answer}
                </MathText>
              </div>

              {question.explanation ? (
                <MathText
                  className="leading-[1.8] text-muted-foreground"
                  style={scaledText(scale)}
                >
                  {question.explanation}
                </MathText>
              ) : null}

              {steps.length > 0 ? (
                <ol className="flex flex-col gap-1.5">
                  {steps.map((step) => (
                    <li
                      key={step.index}
                      className="flex items-start gap-2 leading-[1.8] text-foreground"
                      style={scaledText(scale)}
                    >
                      <span className="mt-0.5 shrink-0 text-muted-foreground">
                        {step.index}.
                      </span>
                      <MathText className="min-w-0">{step.content}</MathText>
                    </li>
                  ))}
                </ol>
              ) : null}

              <ContentFigures images={explanationImages} />

              {question.solution && question.solution.alternatives.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">其他解法</span>
                  {question.solution.alternatives.map((alternative) => (
                    <MathText
                      key={alternative}
                      className="leading-[1.8] text-muted-foreground"
                      style={scaledText(scale)}
                    >
                      {alternative}
                    </MathText>
                  ))}
                </div>
              ) : null}

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
          {phase === "answering" && !showExplanation ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="text-sm"
                onClick={() => {
                  setShowExplanation(true);
                  onRevealed?.();
                }}
              >
                看答案
              </Button>
              <Button
                disabled={!answer.trim()}
                onClick={submit}
                className="px-6"
              >
                提交
              </Button>
            </>
          ) : null}

          {phase === "submitted" && selfAssessed && !selfVerdict ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="text-sm"
                onClick={() => mark(false)}
              >
                我做错了
              </Button>
              <Button size="sm" className="text-sm" onClick={() => mark(true)}>
                我做对了
              </Button>
            </>
          ) : null}

          {revealExplanation && onNext ? (
            // A self-assessed question waits for its mark: skipping it would
            // leave the attempt unrecorded and the mastery count short.
            <Button
              className="px-6"
              disabled={
                phase === "submitted" && selfAssessed && !selfVerdict
              }
              onClick={onNext}
            >
              下一题
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
