import { type ReactNode } from "react";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import {
  ChevronsExpandVertical,
  LayoutHeader,
  Minus,
  Pencil,
  Plus,
} from "@gravity-ui/icons";
import { ScratchpadPanel } from "@/features/scratchpad/Scratchpad";
import { usePreferences } from "@/features/settings/preferencesStore";
import { usePersistedState } from "@/features/uiState";
import { LumiMark } from "@/features/lumi/LumiMark";
import { DrillLumiPanel } from "@/features/training/DrillLumiPanel";
import type { Question } from "@/features/knowledge";

export type ToolKey = "lumi" | "scratchpad" | "font";

// The scale is a multiplier on the drill text, not a CSS zoom: only the
// question body and its explanation grow, so the toolbar and chrome stay put.
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.6;
const SCALE_STEP = 0.1;

/**
 * Right-hand tool rail for the drill. Tools open one panel at a time so the
 * question card only gives up the width the user actually asked for.
 */
export function DrillToolbar({
  className,
  question,
}: {
  className?: string;
  /** The card on screen; the Lumi rail opens preloaded with it. */
  question?: Question;
}) {
  // Which panel is open is part of the drill layout, so it comes back after a
  // reload instead of collapsing to the bare rail.
  const [active, setActive] = usePersistedState<ToolKey | null>(
    "drill.tool",
    null,
  );

  return (
    <div className={`flex shrink-0 items-start gap-2 ${className || ""}`}>
      {active === "lumi" ? <DrillLumiPanel question={question} /> : null}
      {active === "scratchpad" ? (
        <div className="w-[min(22rem,42vw)]">
          <ScratchpadPanel />
        </div>
      ) : null}
      {active === "font" ? (
        <div className="w-[13rem]">
          <FontPanel />
        </div>
      ) : null}

      <div className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-card p-1 shadow-surface">
        <ToolButton
          label="问 Lumi"
          active={active === "lumi"}
          onClick={() =>
            setActive((current) => (current === "lumi" ? null : "lumi"))
          }
        >
          <LumiMark className="size-4" />
        </ToolButton>
        <ToolButton
          label="草稿纸"
          active={active === "scratchpad"}
          onClick={() =>
            setActive((current) =>
              current === "scratchpad" ? null : "scratchpad",
            )
          }
        >
          <Pencil className="size-4" />
        </ToolButton>
        <ToolButton
          label="字号"
          active={active === "font"}
          onClick={() =>
            setActive((current) => (current === "font" ? null : "font"))
          }
        >
          <LayoutHeader className="size-4" />
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label} side="left">
      <Button
        size="sm"
        variant={active ? "primary" : "ghost"}
        aria-label={label}
        aria-pressed={active}
        className="size-9 rounded-xl p-0"
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

function FontPanel() {
  const scale = usePreferences((state) => state.questionScale);
  const update = usePreferences((state) => state.update);

  const setScale = (next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    // Rounding keeps repeated clicks from drifting to 0.9000000000000001.
    update({ questionScale: Math.round(clamped * 100) / 100 });
  };

  const atMin = scale <= MIN_SCALE + 0.001;
  const atMax = scale >= MAX_SCALE - 0.001;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3 shadow-surface">
      <span className="text-sm text-muted-foreground">题目字号</span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label="缩小"
          className="size-8 rounded-lg p-0"
          disabled={atMin}
          onClick={() => setScale(scale - SCALE_STEP)}
        >
          <Minus className="size-4" />
        </Button>
        <AnimatedBadge
          status="neutral"
          size="sm"
          contentKey={scale}
          className="flex-1 justify-center tabular-nums"
        >
          {Math.round(scale * 100)}%
        </AnimatedBadge>
        <Button
          size="sm"
          variant="ghost"
          aria-label="放大"
          className="size-8 rounded-lg p-0"
          disabled={atMax}
          onClick={() => setScale(scale + SCALE_STEP)}
        >
          <Plus className="size-4" />
        </Button>
        <Tooltip content="恢复默认" side="left">
          <Button
            size="sm"
            variant="ghost"
            aria-label="恢复默认字号"
            className="size-8 rounded-lg p-0"
            disabled={scale === 1}
            onClick={() => setScale(1)}
          >
            <ChevronsExpandVertical className="size-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

