import type { ReactNode } from "react";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";

export function EmptyState({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
      {icon ? (
        <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {action}
    </div>
  );
}

export function StageBadge({ label }: { label: string }) {
  return (
    <AnimatedBadge status="info" size="sm" contentKey={label}>
      {label}
    </AnimatedBadge>
  );
}
