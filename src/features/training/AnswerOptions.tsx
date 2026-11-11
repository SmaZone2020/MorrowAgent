import { Button } from "@/vendor/beui/components/motion/button";
import { MathText } from "@/components/MathText";
import { ContentFigures } from "@/components/ContentFigure";
import { imagesAt, type Question } from "@/features/knowledge";
import { scaledText } from "@/features/training/textScale";

export interface AnswerOptionsProps {
  question: Question;
  selected: string | null;
  /** True once the answer is submitted or revealed; the grid is then read-only. */
  locked: boolean;
  reveal: boolean;
  scale: number;
  onSelect: (key: string) => void;
}

/**
 * Option grid. Four-option questions land on a 2x2 grid as soon as the card is
 * wide enough, and collapse to one column when it is not; longer sets step up
 * to three columns on very wide layouts.
 */
export function AnswerOptions({
  question,
  selected,
  locked,
  reveal,
  scale,
  onSelect,
}: AnswerOptionsProps) {
  const count = question.options.length;

  return (
    <div
      role="group"
      aria-label="选项"
      className={`grid gap-2 ${count > 2 ? "sm:grid-cols-2" : ""} ${
        count > 4 ? "xl:grid-cols-3" : ""
      }`}
    >
      {question.options.map((option) => {
        const chosen = selected === option.key;
        const isAnswer = option.key === question.answer;
        const optionImages = imagesAt(question.images, `option:${option.key}`);
        const verdict = reveal
          ? isAnswer
            ? "answer"
            : chosen
              ? "miss"
              : "idle"
          : "idle";

        return (
          <Button
            key={option.key}
            aria-pressed={chosen}
            variant="ghost"
            className={[
              "h-auto w-full items-start justify-start gap-3 rounded-xl border px-3.5 py-3 text-left",
              "transition-colors duration-150",
              // Selected outranks hover: once you pick something, the hover
              // shade must not make the choice look unselected again.
              chosen
                ? "border-primary/70 bg-primary/10 hover:bg-primary/12"
                : "border-border/70 bg-card hover:border-border-strong hover:bg-muted/60",
              verdict === "answer" ? "border-success/60 bg-success/10" : "",
              verdict === "miss" ? "border-destructive/50 bg-destructive/8" : "",
              locked ? "cursor-default" : "cursor-pointer",
            ].join(" ")}
            onClick={() => {
              if (locked) return;
              onSelect(option.key);
            }}
          >
            <span
              className={[
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold tabular-nums transition-colors",
                chosen
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground",
                verdict === "answer" ? "bg-success text-card text-white" : "",
                verdict === "miss" ? "bg-destructive text-card" : "",
              ].join(" ")}
            >
              {option.key}
            </span>
            <span
              style={scaledText(scale)}
              className="flex min-w-0 flex-col gap-2"
            >
              <MathText className="whitespace-normal mt-[3px] text-foreground">
                {option.content}
              </MathText>
              <ContentFigures images={optionImages} />
            </span>
          </Button>
        );
      })}
    </div>
  );
}
