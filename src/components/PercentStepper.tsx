import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Input } from "@/vendor/beui/components/motion/input";

/**
 * A percentage field shaped as `[-] 100% [+]`. The number is editable, so the
 * buttons are shortcuts rather than the only way to set a value.
 */
export function PercentStepper({
  value,
  min,
  max,
  step,
  onChange,
  label,
  suffix = "%",
}: {
  /** Current value as a percentage, e.g. `110`. */
  value: number;
  min: number;
  max: number;
  /** Percentage points added or removed by one click. */
  step: number;
  onChange: (percent: number) => void;
  label: string;
  suffix?: string;
}) {
  // The field is text while it is being typed, so "1" on the way to "110" is
  // not snapped to the minimum after the first keystroke.
  const [draft, setDraft] = useState(String(Math.round(value)));
  // The blur handler runs before the next render, so it must read the latest
  // keystroke from a ref rather than from a stale closure.
  const latest = useRef(draft);
  latest.current = draft;

  useEffect(() => {
    setDraft(String(Math.round(value)));
  }, [value]);

  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const commit = () => {
    const parsed = Number(latest.current);
    if (!Number.isFinite(parsed) || latest.current.trim() === "") {
      setDraft(String(Math.round(value)));
      return;
    }
    const next = clamp(Math.round(parsed));
    setDraft(String(next));
    if (next !== Math.round(value)) onChange(next);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-label={`减小${label}`}
        className="size-8 p-0"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        value={draft}
        onChange={(next) => setDraft(next.replace(/[^\d]/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        inputMode="numeric"
        aria-label={label}
        className="w-16"
        classNames={{
          field: "h-8 rounded-lg",
          input: "pl-2 pr-2 text-center text-sm tabular-nums",
        }}
      />
      <span className="text-sm text-muted-foreground">{suffix}</span>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`增大${label}`}
        className="size-8 p-0"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}
