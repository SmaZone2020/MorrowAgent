import type { ReactNode } from "react";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { cn } from "@/vendor/beui/lib/utils";
import type { SubjectSummary } from "@/features/knowledge/subjects";

/**
 * A shelf card drawn as a book: portrait proportions, a spine on the left edge
 * and a lifted shadow, so a set of subjects reads as a shelf rather than a grid
 * of tiles. The whole card is one button.
 */
export function SubjectBook({
  subject,
  onOpen,
  compact,
  footer,
}: {
  subject: SubjectSummary;
  onOpen: () => void;
  /** Dashboard shelf uses the smaller variant. */
  compact?: boolean;
  footer?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-r-2xl rounded-l-md border border-border/70 bg-card text-left outline-none",
        "shadow-[0_1px_2px_rgb(56_66_72/0.08),0_12px_28px_-12px_rgb(56_66_72/0.45)]",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(56_66_72/0.10),0_20px_40px_-14px_rgb(56_66_72/0.5)]",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        compact ? "aspect-[4/5]" : "aspect-[3/4]",
      )}
    >
      {/* The spine: a darker strip with a hairline highlight, which is what
          makes the flat rectangle read as a bound object. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-2.5 bg-primary/85 shadow-[inset_-1px_0_0_rgb(255_255_255/0.18)]"
      />

      <span
        className={cn(
          "flex min-h-0 flex-1 flex-col justify-between",
          compact ? "gap-2 p-3 pl-5" : "gap-3 p-4 pl-6",
        )}
      >
        <span className="flex flex-col gap-1">
          <span
            className={cn(
              "Siyuan font-semibold tracking-tight text-foreground",
              compact ? "text-base" : "text-lg",
            )}
          >
            {subject.name}
          </span>
          {subject.tagline ? (
            <span className="text-sm leading-5 text-muted-foreground">
              {subject.tagline}
            </span>
          ) : null}
        </span>

        <span className="flex flex-wrap items-center gap-1.5">
          <AnimatedBadge status="neutral" size="sm" contentKey={`${subject.id}-ch`}>
            {subject.chapters.length} 章
          </AnimatedBadge>
          <AnimatedBadge status="info" size="sm" contentKey={`${subject.id}-q`}>
            {subject.questionCount} 题
          </AnimatedBadge>
        </span>
      </span>

      {footer ? (
        <span className="border-t border-border/60 px-3 py-2 pl-5 text-sm text-muted-foreground">
          {footer}
        </span>
      ) : null}
    </button>
  );
}
