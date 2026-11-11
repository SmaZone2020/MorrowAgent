import { Input } from "@/vendor/beui/components/motion/input";
import { scaledText } from "@/features/training/textScale";

/**
 * The typing surface for questions that have no options.
 *
 * A blank is one short line; a calculation is a result the reader may also
 * write on the board, so the field stays single-line and the working area sits
 * below it. Nothing here judges the answer — that belongs to the card.
 */
export function AnswerInput({
  value,
  locked,
  multiline,
  scale,
  onChange,
  onSubmit,
}: {
  value: string;
  locked: boolean;
  /** Calculation and proof answers are longer than a blank. */
  multiline: boolean;
  scale: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted-foreground">
        {multiline ? "写出结果或关键步骤" : "填写答案"}
      </span>
      <Input
        value={value}
        onChange={onChange}
        disabled={locked}
        placeholder={multiline ? "例如：$\\frac{3}{2}$" : "输入答案"}
        classNames={{ input: "text-base" }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        style={scaledText(scale)}
        aria-label="答案"
      />
    </div>
  );
}
