import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatedSidebarTrigger } from "@/vendor/beui/components/motion/animated-sidebar";
import { LayoutSideContentLeft } from "@gravity-ui/icons";
import { resolveShellLayer } from "@/app/shell/navHelpers";
import {
  closeWindow,
  isTauriRuntime,
  minimizeWindow,
  readMaximized,
  toggleMaximizeWindow,
} from "@/app/shell/windowControls";

const CONTROL_SIZE = "size-9";

// The sidebar toggle lives beside the product name so the content header stays
// a pure breadcrumb. The title bar renders inside the sidebar provider, which
// is what gives the trigger its context. The shelf and settings are single
// pages with no rail, so the toggle is disabled there instead of being
// removed: the bar keeps its shape and the button returns inside a package.
export function TitleBar() {
  const { pathname } = useLocation();
  const sidebarToggleDisabled =
    resolveShellLayer(pathname).kind !== "workspace";
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime) return;
    const appWindow = getCurrentWindow();
    let disposed = false;

    void readMaximized().then((value) => {
      if (!disposed) setMaximized(value);
    });

    const unlistenPromise = appWindow.onResized(() => {
      void readMaximized().then((value) => {
        if (!disposed) setMaximized(value);
      });
    });

    return () => {
      disposed = true;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="flex h-9 shrink-0 items-center border-b border-border bg-background none-select"
    >
      <div
        data-tauri-drag-region
        className="flex min-w-0 flex-1 items-center gap-1 pl-3"
      >
        <span
          data-tauri-drag-region
          className="text-sm font-medium tracking-wide text-muted-foreground"
        >
          Morrow Agent
        </span>
        <AnimatedSidebarTrigger
          aria-label="收起或展开侧边栏"
          disabled={sidebarToggleDisabled}
          title={sidebarToggleDisabled ? "当前页面没有侧边栏" : "收起或展开侧边栏"}
          className="ml-1 size-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <LayoutSideContentLeft aria-hidden="true" className="size-4.5" />
        </AnimatedSidebarTrigger>
      </div>

      <div className="flex items-stretch">
        <button
          type="button"
          aria-label="最小化"
          onClick={() => void minimizeWindow()}
          className={`${CONTROL_SIZE} inline-flex items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5h10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={maximized ? "还原" : "最大化"}
          onClick={() => void toggleMaximizeWindow()}
          className={`${CONTROL_SIZE} inline-flex items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground`}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x="0.5"
                y="2.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d="M2.5 2.5V0.5h7v7h-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          aria-label="关闭"
          onClick={() => void closeWindow()}
          className={`${CONTROL_SIZE} inline-flex items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M0 0l10 10M10 0L0 10"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
