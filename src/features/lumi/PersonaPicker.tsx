import { motion, useReducedMotion } from "motion/react";
import { Check } from "@gravity-ui/icons";
import { cn } from "@/vendor/beui/lib/utils";
import {
  PERSONAS,
  PERSONA_HINT,
  PERSONA_LABEL,
  type Persona,
} from "@/features/lumi/persona";

/**
 * The four ways Lumi can talk, as cards rather than as a radio list.
 *
 * The description is the decision, so it sits in the card body instead of
 * behind an info glyph: this is the one place where reading the options *is*
 * choosing. Shared between the settings page and onboarding so a first launch
 * and a later change offer the same four voices with the same words.
 */
export function PersonaPicker({
  value,
  onChange,
}: {
  value: Persona;
  onChange: (next: Persona) => void;
}) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div role="radiogroup" aria-label="Lumi 的性格" className="grid gap-2 sm:grid-cols-2">
      {PERSONAS.map((entry) => {
        const selected = entry === value;
        return (
          <button
            key={entry}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(entry)}
            className={cn(
              "relative flex min-h-20 flex-col gap-1 rounded-xl border p-3 text-left outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-foreground/25 bg-muted"
                : "border-border/70 hover:bg-muted/50",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {PERSONA_LABEL[entry]}
              {selected ? (
                <motion.span
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className="inline-flex size-4 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <Check aria-hidden="true" className="size-3" />
                </motion.span>
              ) : null}
            </span>
            <span className="text-sm leading-5 text-muted-foreground">
              {PERSONA_HINT[entry]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
