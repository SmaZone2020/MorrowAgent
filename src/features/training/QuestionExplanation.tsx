import { MathText } from "@/components/MathText";
import { ContentFigures } from "@/components/ContentFigure";
import { AnswerVerdict, type Verdict } from "@/features/training/AnswerVerdict";
import { imagesAt, type Question } from "@/features/knowledge";
import { scaledText } from "@/features/training/textScale";

/**
 * The worked answer, shown after a question is submitted or revealed.
 *
 * It lives apart from the card because the exam needs the card without this
 * block: a mock exam must not show the solution until the paper is handed in,
 * or the later questions are answered with the earlier answers in view.
 */
export function QuestionExplanation({
  question,
  verdict,
  scale,
}: {
  question: Question;
  /** Omitted when nobody answered: a reference shows the answer, not a result. */
  verdict?: Verdict;
  scale: number;
}) {
  const explanationImages = imagesAt(question.images, "explanation");
  const steps = question.solution?.steps ?? [];

  return (
    <div className="relative overflow-hidden rounded-xl bg-muted/50">
      {verdict ? <AnswerVerdict verdict={verdict} /> : null}
      <div
        className={`relative flex flex-col gap-3 p-3 ${verdict ? "pr-16" : ""}`}
      >
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
  );
}
