import { CircleInfo, CircleQuestion } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";

/**
 * The only place explanatory prose is allowed: pressing or hovering the glyph
 * reveals it. A title never gets a line of description under it.
 */
export function InfoHint({
  label,
  icon = "info",
  side = "top",
}: {
  label: string;
  icon?: "info" | "question";
  side?: "top" | "bottom" | "left" | "right";
}) {
  const Glyph = icon === "question" ? CircleQuestion : CircleInfo;

  return (
    <Tooltip content={label} side={side}>
      <Button
        size="sm"
        variant="ghost"
        aria-label={label}
        className="size-6 shrink-0 rounded-full p-0 text-muted-foreground hover:text-foreground"
      >
        <Glyph className="size-4" />
      </Button>
    </Tooltip>
  );
}
