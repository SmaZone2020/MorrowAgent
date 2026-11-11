import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatedSidebarTrigger } from "@/vendor/beui/components/motion/animated-sidebar";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { House, LayoutSideContentLeft } from "@gravity-ui/icons";
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
//
// The home button sits to its left. Inside a package it is the shortest way
// back to the shelf, which is otherwise only reachable through the breadcrumb;
// on the shelf itself there is nowhere to go, so it is disabled rather than
// hidden.
export function TitleBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const layer = resolveShellLayer(pathname);
  const sidebarToggleDisabled = layer.kind !== "workspace";
  const homeDisabled = layer.kind === "shelf";
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
      className="relative z-[200] flex h-9 shrink-0 items-center border-b border-border bg-background"
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
        <Tooltip
          content={homeDisabled ? "已经在书架" : "返回书架"}
          side="bottom"
        >
          <button
            type="button"
            data-tauri-drag-region="false"
            aria-label="返回书架"
            disabled={homeDisabled}
            onClick={() => navigate("/")}
            className="ml-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <House aria-hidden="true" className="size-4.5" />
          </button>
        </Tooltip>
        <Tooltip
          content={sidebarToggleDisabled ? "当前页面没有侧边栏" : "收起或展开侧边栏"}
          side="bottom"
        >
          <AnimatedSidebarTrigger
            aria-label="收起或展开侧边栏"
            disabled={sidebarToggleDisabled}
            className="ml-1 size-7 rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <LayoutSideContentLeft aria-hidden="true" className="size-4.5" />
          </AnimatedSidebarTrigger>
        </Tooltip>
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
