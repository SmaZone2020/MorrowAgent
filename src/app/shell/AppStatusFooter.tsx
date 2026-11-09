import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Gear } from "@gravity-ui/icons";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { useAnimatedSidebar } from "@/vendor/beui/components/motion/animated-sidebar";
import { settingsPath } from "@/app/navigation";

// The footer is the settings entry itself, not a storage readout: the row
// names the destination, and the badge is the only thing that reports a
// sub-state (no provider connected yet).
export function AppStatusFooter() {
  const navigate = useNavigate();
  const { state } = useAnimatedSidebar();
  const collapsed = state === "collapsed";
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => navigate(settingsPath)}
        aria-label="设置，AI Provider 未配置"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="group-data-[state=collapsed]/sidebar:mx-auto group-data-[state=collapsed]/sidebar:size-9 group-data-[state=collapsed]/sidebar:min-h-0 group-data-[state=collapsed]/sidebar:flex-none group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:gap-0 group-data-[state=collapsed]/sidebar:rounded-full group-data-[state=collapsed]/sidebar:px-0 flex min-h-9 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl px-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="grid size-5 shrink-0 place-items-center text-muted-foreground">
          <Gear className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-data-[state=collapsed]/sidebar:hidden">
          设置
        </span>
        <AnimatedBadge
          status="warning"
          size="sm"
          contentKey="skeleton"
          className="shrink-0 group-data-[state=collapsed]/sidebar:hidden"
        >
          未配置
        </AnimatedBadge>
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground group-data-[state=collapsed]/sidebar:hidden"
        />
      </button>
      <Tooltip
        open={collapsed && hovered}
        anchorRef={anchorRef}
        side="right"
        sideOffset={10}
        content="设置"
      />
    </>
  );
}
