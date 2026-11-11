import type { ReactNode } from "react";
import { LumiMood } from "@/features/lumi/LumiMood";
import { cn } from "@/vendor/beui/lib/utils";

/**
 * A page with nothing to show still has a face: Lumi holds one expression so
 * the blank space reads as a reply to the situation rather than a rendering
 * failure. The mood is the engine's own vocabulary, so callers name the feeling
 * they mean and the character supplies the animation.
 */
export function EmptyState({
  title,
  mood = "curious",
  surface = "card",
  action,
  className,
}: {
  title: string;
  /** Lumi's expression, e.g. "confused", "sad", "proud", "thinking". */
  mood?: string;
  /** Which panel colour Lumi stands on, so the eye holes match. */
  surface?: "page" | "card";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-6 text-center",
        className,
      )}
    >
      <LumiMood state={mood} surface={surface} className="size-24" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {action}
    </div>
  );
}
