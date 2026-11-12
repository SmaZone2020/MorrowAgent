import { Loader } from "@/vendor/beui/components/motion/loader";
import { cn } from "@/vendor/beui/lib/utils";

/**
 * The one way to say "this part is still loading".
 *
 * A spinner beside a line of text beats a bare 「读取中」 because it keeps moving
 * while the wait does — a still paragraph looks like an empty result. The label
 * is also the accessible name, so the animation is never the only signal.
 */
export function LoadingLine({
  label = "读取中",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <Loader variant="dots" size={16} label={label} />
      <span aria-hidden="true">{label}</span>
    </span>
  );
}
