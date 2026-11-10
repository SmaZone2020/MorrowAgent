import { Button } from "@/vendor/beui/components/motion/button";
import { ArrowUturnCcwLeft, TrashBin } from "@gravity-ui/icons";
import { useScratchpad } from "@/features/scratchpad/useScratchpad";

/**
 * Free-hand scratchpad. The canvas records stroke point lists rather than
 * bitmaps, so undo is a pop and the drawing can later be replayed or handed to
 * Lumi as data instead of a picture.
 */
export function ScratchpadPanel({ height = 300 }: { height?: number }) {
  const pad = useScratchpad();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2">
      <canvas
        ref={pad.canvasRef}
        role="img"
        aria-label="草稿纸"
        style={{ height }}
        className="w-full touch-none rounded-lg bg-background/60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]"
        {...pad.handlers}
      />
      <div className="flex items-center justify-end gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={pad.isEmpty}
          onClick={pad.undo}
        >
          <ArrowUturnCcwLeft className="size-4" />
          撤销
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pad.isEmpty}
          onClick={pad.clear}
        >
          <TrashBin className="size-4" />
          清空
        </Button>
      </div>
    </div>
  );
}
