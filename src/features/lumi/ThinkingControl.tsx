import { Bulb } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/vendor/beui/components/motion/popover-morph";
import { cn } from "@/vendor/beui/lib/utils";
import {
  THINKING_LEVELS,
  asThinkingLevel,
  thinkingHint,
  thinkingLabel,
  type ThinkingLevel,
} from "@/features/settings/thinking";

/**
 * The thinking switch, sitting in the composer next to the paperclip.
 *
 * It is in the chat rather than in settings because it is a per-question
 * decision: the same learner wants a fast definition now and the slowest
 * effort on a proof ten seconds later. The current level is the label, so the
 * composer says how hard the next answer will be without opening anything.
 */
export function ThinkingControl({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (level: ThinkingLevel) => void;
}) {
  const current = asThinkingLevel(value);

  return (
    <MorphPopover>
      <MorphPopoverTrigger>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`思考强度：${thinkingLabel(current)}`}
          title="思考强度"
          disabled={disabled}
          className="h-8 shrink-0 gap-1.5 rounded-full px-2.5 text-sm"
        >
          <Bulb
            className={cn(
              "size-4",
              current === "off" ? "text-muted-foreground" : "text-foreground",
            )}
          />
          <span className="text-muted-foreground">{thinkingLabel(current)}</span>
        </Button>
      </MorphPopoverTrigger>

      <MorphPopoverContent side="top" align="start" sideOffset={8} radius={12} className="w-60 p-1.5">
        {THINKING_LEVELS.map((level) => {
          const active = level === current;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors",
                active ? "bg-muted" : "hover:bg-muted focus-visible:bg-muted",
              )}
            >
              <span className="min-w-0">
                <span className="block text-sm text-foreground">
                  {thinkingLabel(level)}
                </span>
                <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
                  {thinkingHint(level)}
                </span>
              </span>
            </button>
          );
        })}
      </MorphPopoverContent>
    </MorphPopover>
  );
}
