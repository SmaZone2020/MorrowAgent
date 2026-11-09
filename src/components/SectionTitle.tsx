import type { ReactNode } from "react";

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h2 className="truncate font-serif text-[15px] leading-snug font-semibold text-foreground">
        {title}
      </h2>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}
