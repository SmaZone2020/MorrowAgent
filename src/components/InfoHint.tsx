import { CircleInfo } from "@gravity-ui/icons";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";

export function InfoHint({ label }: { label: string }) {
  return (
    <Tooltip content={label} side="top">
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <CircleInfo className="size-4" />
      </button>
    </Tooltip>
  );
}
