import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/vendor/beui/components/motion/card";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { ChevronLeft, ChevronRight } from "@gravity-ui/icons";
import { MathText } from "@/components/MathText";
import { SectionTitle } from "@/components/SectionTitle";
import { ScratchpadPanel } from "@/features/scratchpad/Scratchpad";
import { AnswerVerdict } from "@/features/training/AnswerVerdict";
import { scaledText } from "@/features/training/textScale";
import { usePreferences } from "@/features/settings/preferencesStore";
import {
  isAnswerCorrect,
  isGradable,
  type QuizQuestion,
  type QuizRequest,
} from "@/features/lumi/quizSpec";
import type { QuizAnswer } from "@/features/lumi/quizState";

interface QuizBlockProps {
  request: QuizRequest;
  /** Answers of this set, keyed by question id. */
  state: Record<string, QuizAnswer>;
  /** True once the set has been submitted; the cards become read-only. */
  locked: boolean;
  /** Called once per confirmed question with the graded result. */
  onConfirm: (question: QuizQuestion, answer: QuizAnswer) => void;
  /** Called once, after the last question in the set is marked. */
  onComplete: () => void;
}

/** One question, from blank to marked. */
function QuizCard({
  question,
  position,
  total,
  saved,
  locked,
  onConfirm,
}: {
  question: QuizQuestion;
  position: number;
  total: number;
  saved?: QuizAnswer;
  locked: boolean;
  onConfirm: (answer: QuizAnswer) => void;
}) {
  const [selected, setSelected] = useState<string[]>(saved?.selected ?? []);
  const [text, setText] = useState(saved?.selected[0] ?? "");
  const [submitted, setSubmitted] = useState(Boolean(saved));
  const scale = usePreferences((store) => store.questionScale);
  // Restarting the clock on every render would make "用时" meaningless, so it
  // is taken once per card and the card is keyed by question id.
  const startedAt = useRef(Date.now());

  const multi = question.type === "multiple_choice";
  const choice = question.options.length > 0;
  const gradable = isGradable(question.type);
  const correct = saved?.correct ?? false;
  const frozen = submitted || locked;

  const toggle = (key: string) => {
    if (frozen) return;
    setSelected((current) =>
      multi
        ? current.includes(key)
          ? current.filter((entry) => entry !== key)
          : [...current, key]
        : [key],
    );
  };

  const ready = frozen
    ? false
    : gradable
      ? choice
        ? selected.length > 0
        : text.trim().length > 0
      : // A board or an open proof is self-assessed: there is nothing to check
        // before it can be handed in.
        true;

  const confirm = () => {
    if (frozen || !ready) return;
    const answer = choice ? selected : gradable ? [text.trim()] : [];
    setSubmitted(true);
    onConfirm({
      selected: answer,
      correct: isAnswerCorrect(question, answer),
      elapsedMs: Date.now() - startedAt.current,
    });
  };

  return (
    <Card variant="outlined" size="compact" className="border-transparent bg-card shadow-surface">
      <CardHeader>
        <CardTitle as="h3">
          <SectionTitle
            title={`第 ${position} / ${total} 题`}
            action={
              submitted ? (
                <AnimatedBadge
                  status={gradable ? (correct ? "success" : "danger") : "info"}
                  size="sm"
                  contentKey={correct ? "correct" : "wrong"}
                >
                  {gradable ? (correct ? "正确" : "错误") : "已提交"}
                </AnimatedBadge>
              ) : undefined
            }
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <MathText className="block leading-[2] text-foreground" style={scaledText(scale)}>
          {question.stem}
        </MathText>

        {question.type === "board" ? (
          frozen ? (
            <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
              这题在草稿纸上作答，对错由你自己判断。
            </p>
          ) : (
            <ScratchpadPanel height={220} />
          )
        ) : choice ? (
          <div className={`grid gap-2 ${question.options.length > 2 ? "sm:grid-cols-2" : ""}`}>
            {question.options.map((option) => {
              const chosen = selected.includes(option.key);
              const isAnswer = question.answer.includes(option.key);
              return (
                <Button
                  key={option.key}
                  aria-pressed={chosen}
                  variant="ghost"
                  onClick={() => toggle(option.key)}
                  className={[
                    "h-auto w-full items-start justify-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
                    submitted
                      ? isAnswer
                        ? "border-success/60 bg-success/10"
                        : chosen
                          ? "border-destructive/50 bg-destructive/8"
                          : "border-border/70 bg-card"
                      : chosen
                        ? "border-primary/70 bg-primary/10"
                        : "border-border/70 bg-card hover:border-border-strong hover:bg-muted/60",
                    submitted ? "cursor-default" : "cursor-pointer",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold tabular-nums transition-colors",
                      submitted && isAnswer
                        ? "bg-success text-white"
                        : submitted && chosen
                          ? "bg-destructive text-card"
                          : chosen
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/70 text-muted-foreground",
                    ].join(" ")}
                  >
                    {option.key}
                  </span>
                  <span className="flex min-w-0 flex-col gap-2" style={scaledText(scale)}>
                    <MathText className="mt-[3px] whitespace-normal text-foreground">
                      {option.content}
                    </MathText>
                    {/* The per-option reasoning is the point of this card, and
                        showing it early would give the answer away. */}
                    {submitted && option.explanation ? (
                      <MathText className="text-muted-foreground">
                        {option.explanation}
                      </MathText>
                    ) : null}
                  </span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={text}
              disabled={frozen}
              onChange={(event) => setText(event.target.value)}
              placeholder="写出你的答案"
              aria-label="你的答案"
              rows={2}
              style={scaledText(scale)}
              className="w-full resize-y rounded-xl border border-border/70 bg-background px-3 py-2 text-foreground outline-none focus-visible:border-ring disabled:opacity-70"
            />
            {/* A typeset preview, because the answer is often a formula. */}
            {text.trim() ? (
              <MathText className="text-muted-foreground">{text}</MathText>
            ) : null}
          </div>
        )}

        {submitted ? (
          <div className="relative overflow-hidden rounded-xl bg-muted/50">
            {gradable ? <AnswerVerdict verdict={correct ? "correct" : "wrong"} /> : null}
            <div className="relative flex flex-col gap-2 p-3 pr-20">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base text-muted-foreground">正确答案</span>
                <MathText className="font-medium text-foreground" style={scaledText(scale)}>
                  {question.answer.join("") || "（由你自己判断）"}
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
            </div>
          </div>
        ) : null}

        {!submitted ? (
          <div className="flex items-center justify-end">
            <Button className="px-6" disabled={!ready} onClick={confirm}>
              {gradable ? "确认" : "我已完成"}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * A set the model generated.
 *
 * The state lives outside this component because a streamed reply is re-parsed
 * on every delta: an answer held in render state would be wiped mid-token. The
 * parent owns it and passes the whole map down, so switching questions and
 * coming back shows the marked card instead of a blank one.
 */
export function QuizBlock({
  request,
  state,
  locked,
  onConfirm,
  onComplete,
}: QuizBlockProps) {
  const answered = state;
  const [index, setIndex] = useState(0);
  const last = request.questions.length - 1;

  // A new set may arrive with fewer questions than the last one; a stale index
  // would point past the end.
  useEffect(() => {
    if (index > last) setIndex(0);
  }, [index, last]);

  const question = request.questions[Math.min(index, last)];
  const correct = useMemo(
    () => Object.values(answered).filter((entry) => entry.correct).length,
    [answered],
  );
  const done = Object.keys(answered).length;
  // The set is only submitted when every question has been marked; a partial
  // set is still being worked on, not answered.
  const finished = done === request.questions.length;

  if (!question) return null;

  return (
    <div className="my-3 flex w-full max-w-[450px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-serif text-[15px] font-semibold text-foreground">
          {request.title}
        </span>
        <AnimatedBadge status="neutral" size="sm" contentKey={`${done}-${correct}`}>
          {finished
            ? `${correct} / ${request.questions.length} 正确`
            : `${done} / ${request.questions.length} 已答`}
        </AnimatedBadge>
      </div>

      <QuizCard
        key={question.id}
        question={question}
        position={Math.min(index, last) + 1}
        total={request.questions.length}
        saved={answered[question.id]}
        locked={locked}
        onConfirm={(answer) => onConfirm(question, answer)}
      />

      <div className="flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="text-sm"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          <ChevronLeft className="size-4" />
          上一题
        </Button>
        <span className="text-sm text-muted-foreground">
          第 {Math.min(index, last) + 1} / {request.questions.length} 题
        </span>
        {/* A submitted set only navigates: the questions are history now. */}
        {index < last ? (
          <Button
            size="sm"
            variant="secondary"
            className="text-sm"
            onClick={() => setIndex((value) => Math.min(last, value + 1))}
          >
            下一题
            <ChevronRight className="size-4" />
          </Button>
        ) : locked ? (
          <span className="w-[68px]" aria-hidden="true" />
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="text-sm"
            disabled={!finished}
            onClick={onComplete}
          >
            提交
          </Button>
        )}
      </div>
    </div>
  );
}
