import { useRef, useState } from "react";
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
import { QuestionExplanation } from "@/features/training/QuestionExplanation";
import type { Verdict } from "@/features/training/AnswerVerdict";
import { AnswerOptions } from "@/features/training/AnswerOptions";
import { AnswerInput } from "@/features/training/AnswerInput";
import { answersMatch } from "@/features/training/answerMatch";
import { imagesAt, type Question } from "@/features/knowledge";
import { ScratchpadPanel } from "@/features/scratchpad/Scratchpad";
import { inkSummaryJson, type InkSummary } from "@/features/scratchpad/inkSummary";
import { scaledText } from "@/features/training/textScale";
import { usePreferences } from "@/features/settings/preferencesStore";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";
import { workspaceScope } from "@/features/uiState/scope";
import { Eye } from "lucide-react";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";

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
  /** The label on the advance button; "下一题" unless the set is ending. */
  nextLabel?: string;
  /** Fires once when the answer is submitted, with the answer and its verdict. */
  onAnswered?: (answer: string, isCorrect: boolean, inkSummary: string) => void;
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
  nextLabel = "下一题",
  onAnswered,
  onRevealed,
  initialAnswer = null,
  initialVerdict = null,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(initialAnswer);
  // The pad publishes its own summary reader; the card only needs to call it at
  // submit time, so it holds the closure rather than the strokes.
  const inkSummary = useRef<() => InkSummary>(() => ({
    strokes: 0,
    points: 0,
    seconds: 0,
    cleared: false,
  }));
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

  const submit = () => {
    if (!answer.trim() || phase === "submitted") return;
    setPhase("submitted");
    // A self-assessed question has no verdict yet: the reader marks it after
    // comparing their work with the solution.
    if (!selfAssessed) {
      onAnswered?.(
        answer,
        answersMatch(answer, question.answer),
        inkSummaryJson(inkSummary.current()),
      );
    }
  };

  const mark = (isCorrect: boolean) => {
    const verdict: Verdict = isCorrect ? "correct" : "wrong";
    setSelfVerdict(verdict);
    // The pad is read here rather than at submit: on a calculation the ink is
    // still the work in progress when the answer is typed, and the reader may
    // add to it while comparing with the solution.
    onAnswered?.(
      answer,
      isCorrect,
      inkSummaryJson(inkSummary.current()),
    );
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
    <Card className="border-none bg-transparent shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SectionTitle
            className="text-[18px]"
            title={`第 ${index} / ${total} 题`}
          />
          {/* Revealing is one-way, so the control disappears once the answer is
              out — a button that does nothing is worse than no button. */}
          {showExplanation ? null : (
            <Tooltip content="显示答案">
              <Button
                variant="ghost"
                size="icon"
                aria-label="显示答案"
                onClick={() => {
                  setShowExplanation(true);
                  onRevealed?.();
                }}
              >
                <Eye className="size-4.5" />
              </Button>
            </Tooltip>
          )}
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
                  onReady={(read) => {
                    inkSummary.current = read;
                  }}
                />
              ) : null}
            </div>
          )}

          {revealExplanation ? (
            <QuestionExplanation
              question={question}
              verdict={verdict}
              scale={scale}
            />
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {phase === "answering" && !showExplanation ? (
              <>
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
                {nextLabel}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
  );
}
