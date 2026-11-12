import type { ReactNode } from "react";
import { cn } from "@/vendor/beui/lib/utils";

/**
 * A section heading inside a card.
 *
 * `className` carries the type size, not the layout: the row has to stay a flex
 * row whether or not the caller passes one, or the action would drop below the
 * title and a `truncate` would have nothing to truncate against.
 */
export function SectionTitle({
  title,
  action,
  className = "text-[15px]",
}: {
  title: string;
  action?: ReactNode;
  /** Type size only; the flex row is always applied. */
  className?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h2
        className={cn(
          "truncate font-serif leading-snug font-semibold text-foreground",
          className,
        )}
      >
        {title}
      </h2>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}
