import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, ChevronRight } from "@gravity-ui/icons";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { useAnimatedSidebar } from "@/vendor/beui/components/motion/animated-sidebar";
import { settingsPath } from "@/app/navigation";

// The status bar doubles as the settings entry, so Settings needs no menu row
// of its own while staying one click away in both the panel and the rail.
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
        aria-label="设置：本地模式，AI Provider 未接入"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="flex min-h-9 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-xl px-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0"
      >
        <span className="grid size-5 shrink-0 place-items-center text-muted-foreground">
          <Database className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-data-[state=collapsed]/sidebar:hidden">
          本地模式
        </span>
        <AnimatedBadge
          status="warning"
          size="sm"
          contentKey="skeleton"
          className="shrink-0 group-data-[state=collapsed]/sidebar:hidden"
        >
          未接入
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
