import { MathText } from "@/components/MathText";
import { ContentFigures } from "@/components/ContentFigure";
import { SectionTitle } from "@/components/SectionTitle";
import { AnswerInput } from "@/features/training/AnswerInput";
import { AnswerOptions } from "@/features/training/AnswerOptions";
import { scaledText } from "@/features/training/textScale";
import { ScratchpadPanel } from "@/features/scratchpad/Scratchpad";
import { imagesAt, type Question } from "@/features/knowledge";
import { usePreferences } from "@/features/settings/preferencesStore";

/** Question types whose answer is worked out rather than typed in one word. */
const WORKED = new Set(["calculation", "proof", "short_answer", "application"]);

/**
 * One question as the exam shows it.
 *
 * It is deliberately not `QuestionCard`: that card scores itself the moment the
 * answer is submitted, and an exam must not tell the reader they were wrong
 * while the later questions are still ahead. Here the answer is only stored —
 * the verdict is computed once the paper is handed in.
 */
export function ExamQuestion({
  question,
  index,
  total,
  answer,
  inkKey,
  onChange,
}: {
  question: Question;
  index: number;
  total: number;
  answer: string;
  /** Scope for the board, so the working survives a reload mid-paper. */
  inkKey: string;
  onChange: (value: string) => void;
}) {
  const scale = usePreferences((state) => state.questionScale);
  const isChoice = question.options.length > 0;
  const worked = !isChoice && WORKED.has(question.questionType);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle title={`第 ${index} / ${total} 题`} />

      <div className="flex flex-col gap-3">
        <MathText
          className="block leading-[2] text-foreground"
          style={scaledText(scale)}
        >
          {question.content}
        </MathText>
        <ContentFigures images={imagesAt(question.images, "stem")} />
      </div>

      {isChoice ? (
        <AnswerOptions
          question={question}
          selected={answer || null}
          locked={false}
          reveal={false}
          scale={scale}
          onSelect={onChange}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnswerInput
            value={answer}
            locked={false}
            multiline={worked}
            scale={scale}
            onChange={onChange}
            onSubmit={() => undefined}
          />
          {/* The board is kept for the working, not read for a score: an exam
              answer is judged by what was written in the answer field. */}
          {worked ? (
            <ScratchpadPanel height={220} persistKey={inkKey} />
          ) : null}
        </div>
      )}
    </div>
  );
}
