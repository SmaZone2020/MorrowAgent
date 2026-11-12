import { useEffect, useRef, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/vendor/beui/components/motion/popover";
import {
  ColorSelector,
  ColorSelectorItem,
  ColorSelectorList,
} from "@/vendor/beui/components/motion/color-selector";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { ArrowUturnCcwLeft, TrashBin } from "@gravity-ui/icons";
import { INK_WIDTHS, type InkWidth } from "@/features/scratchpad/geometry";
import type { InkSummary } from "@/features/scratchpad/inkSummary";
import { INK_COLORS, labelOf, swatchOf } from "@/features/scratchpad/palette";
import { useScratchpad } from "@/features/scratchpad/useScratchpad";

// A dot at each nib width, so the choice reads at a glance instead of needing a
// label per button.
const WIDTH_LABELS: Record<InkWidth, string> = {
  0.6: "细笔",
  1: "标准",
  1.6: "粗笔",
};

const DOT_SIZE: Record<InkWidth, string> = {
  0.6: "size-1",
  1: "size-1.5",
  1.6: "size-2.5",
};

/**
 * Free-hand scratchpad. The canvas records stroke point lists rather than
 * bitmaps, so undo is a pop and the drawing can later be replayed or handed to
 * Lumi as data instead of a picture.
 */
export function ScratchpadPanel({
  height = 300,
  persistKey,
  onReady,
}: {
  height?: number;
  /** Binds the ink to a scope so it survives a reload; omit for a throwaway pad. */
  persistKey?: string;
  /**
   * Hands the caller a reader for the pad's summary. The card submits an answer
   * and needs to know how much ink went into it, but the pad owns its state, so
   * it publishes a closure instead of lifting every stroke into the parent.
   */
  onReady?: (summary: () => InkSummary) => void;
}) {
  const pad = useScratchpad(persistKey);

  // A ref rather than a dependency: `pad.summary` is stable, and reporting it on
  // every render would re-run the caller's effect on every stroke.
  const reportRef = useRef(onReady);
  reportRef.current = onReady;
  useEffect(() => {
    reportRef.current?.(pad.summary);
  }, [pad.summary]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-2">
      <canvas
        ref={pad.canvasRef}
        role="img"
        aria-label="草稿纸"
        style={{ height }}
        className="w-full touch-none cursor-crosshair rounded-lg bg-background/60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]"
        {...pad.handlers}
      />
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          <InkColorPicker value={pad.color} onChange={pad.setColor} />
          <span aria-hidden className="mx-1 h-4 w-px bg-border" />
          {INK_WIDTHS.map((width) => (
            <Tooltip key={width} content={WIDTH_LABELS[width]} side="top">
              <Button
                size="sm"
                variant={pad.width === width ? "primary" : "ghost"}
                aria-label={WIDTH_LABELS[width]}
                aria-pressed={pad.width === width}
                className="size-8 rounded-full p-0"
                onClick={() => pad.setWidth(width)}
              >
                <span
                  className={`rounded-full bg-current ${DOT_SIZE[width]}`}
                />
              </Button>
            </Tooltip>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            disabled={pad.isEmpty}
            onClick={pad.undo}
          >
            <ArrowUturnCcwLeft className="size-4" />
            撤销
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            disabled={pad.isEmpty}
            onClick={pad.clear}
          >
            <TrashBin className="size-4" />
            清空
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The pen colour. The trigger is the current nib; the panel is beUI's
 * color-selector, which brings the spring-gliding selection ring and radio
 * keyboard navigation instead of a hand-rolled swatch row.
 */
function InkColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  // Choosing a colour is the end of the interaction, so the panel closes on
  // pick; leaving it open would cover the canvas the reader is about to draw on.
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      side="top"
      align="start"
      sideOffset={10}
      panelRadius={14}
    >
      <PopoverTrigger>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`墨色：${labelOf(value)}`}
          className="size-8 rounded-full p-0"
        >
          <span
            className="size-4 rounded-full border border-foreground/15"
            style={{ backgroundColor: swatchOf(value) }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        <ColorSelector
          value={value}
          onValueChange={(next) => {
            onChange(next);
            setOpen(false);
          }}
          aria-label="墨色"
        >
          <ColorSelectorList className="gap-2 p-0">
            {INK_COLORS.map((entry) => (
              <ColorSelectorItem
                key={entry.id}
                value={entry.value}
                color={entry.swatch}
                label={entry.label}
                className="size-9"
              />
            ))}
          </ColorSelectorList>
        </ColorSelector>
      </PopoverContent>
    </Popover>
  );
}
