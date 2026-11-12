import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/vendor/beui/components/motion/select";
import {
  ERROR_TYPES,
  ERROR_TYPE_LABEL,
  asErrorType,
} from "@/features/training/errorTypes";

/**
 * Why a wrong answer went wrong, picked from the diagnostic vocabulary.
 *
 * The trigger shows the stored label, so a row reads the same before and after
 * being opened. Picking nothing is a real state — a learner who does not know
 * why they got it wrong is telling the truth, and the row says so.
 */
export function ErrorTypeSelect({
  value,
  onChange,
  label,
}: {
  /** Empty when the attempt has not been classified. */
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  const known = asErrorType(value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className="w-40 rounded-xl py-1.5 text-sm"
      >
        <span className={known ? "text-foreground" : "text-muted-foreground"}>
          {known ? ERROR_TYPE_LABEL[known] : "为什么错"}
        </span>
      </SelectTrigger>
      <SelectContent>
        {ERROR_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {ERROR_TYPE_LABEL[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
