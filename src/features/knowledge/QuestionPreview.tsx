import { MathText } from "@/components/MathText";
import { ContentFigures } from "@/components/ContentFigure";
import { QuestionExplanation } from "@/features/training/QuestionExplanation";
import { questionTypeLabel } from "@/features/knowledge/questionTypes";
import { imagesAt, type Question } from "@/features/knowledge";

/**
 * A question read as a page, not as an exercise.
 *
 * Referenced from a reply or a note, a question is something to look at: the
 * stem, the options with the right one marked, and the worked answer. Nothing
 * here takes an answer or records an attempt — tapping a reference in a
 * conversation must not put a score in the wrong book.
 */
export function QuestionPreview({ question }: { question: Question }) {
  const stemImages = imagesAt(question.images, "stem");
  const kind = questionTypeLabel(question.questionType);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{kind}</span>
        <span aria-hidden="true">·</span>
        <span>难度 {question.difficulty}</span>
        {question.sourceReference ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="min-w-0 truncate">{question.sourceReference}</span>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <MathText className="block leading-[2] text-foreground">
          {question.content}
        </MathText>
        <ContentFigures images={stemImages} />
      </div>

      {question.options.length > 0 ? (
        <div className="flex flex-col gap-2">
          {question.options.map((option) => {
            const isAnswer = option.key === question.answer;
            return (
              <div
                key={option.key}
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${
                  isAnswer
                    ? "border-success/60 bg-success/10"
                    : "border-border/70 bg-card"
                }`}
              >
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-sm font-semibold tabular-nums ${
                    isAnswer
                      ? "bg-success text-white"
                      : "bg-muted/70 text-muted-foreground"
                  }`}
                >
                  {option.key}
                </span>
                <div className="flex min-w-0 flex-col gap-2">
                  <MathText className="text-foreground">
                    {option.content}
                  </MathText>
                  <ContentFigures
                    images={imagesAt(question.images, `option:${option.key}`)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <QuestionExplanation question={question} scale={1} />

      {question.knowledgeTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {question.knowledgeTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-muted-foreground"
            >
              {tag.split(".").at(-1) ?? tag}
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">{question.id}</p>
    </div>
  );
}
