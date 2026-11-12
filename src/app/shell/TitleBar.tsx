import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatedSidebarTrigger } from "@/vendor/beui/components/motion/animated-sidebar";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { House, LayoutSideContentLeft, Sparkles } from "@gravity-ui/icons";
import { resolveShellLayer } from "@/app/shell/navHelpers";
import { usePersistedState } from "@/features/uiState/usePersistedState";
import { appScope } from "@/features/uiState/scope";
import { useOnboardingRequest } from "@/features/onboarding/request";
import {
  closeWindow,
  isTauriRuntime,
  minimizeWindow,
  readMaximized,
  toggleMaximizeWindow,
} from "@/app/shell/windowControls";

const CONTROL_SIZE = "size-9";

/**
 * The wizard is dev-only furniture: it is a first-run flow, and a shipped build
 * has no first run left to repeat. Keeping it behind `DEV` means a tester can
 * replay it without resetting the database, and nobody else ever sees it.
 */
const CAN_REPLAY_ONBOARDING = import.meta.env.DEV;

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
  // A timed paper takes the window: both controls would offer a way out of it,
  // so they are disabled rather than removed and the bar keeps its shape.
  const [examActive] = usePersistedState<string | null>(
    appScope("exam.active"),
    null,
  );
  const inExam = examActive !== null;
  const sidebarToggleDisabled = layer.kind !== "workspace" || inExam;
  // The shelf has nowhere to go back to and setup is left through its own
  // buttons, so both disable this; settings still uses it to return to the shelf.
  const homeDisabled = layer.kind === "shelf" || inExam;
  const [maximized, setMaximized] = useState(false);
  const requestOnboarding = useOnboardingRequest((state) => state.request);

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
          content={
            inExam
              ? "考试进行中"
              : homeDisabled
                ? "已经在书架"
                : "返回书架"
          }
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
          content={
            inExam
              ? "考试进行中"
              : sidebarToggleDisabled
                ? "当前页面没有侧边栏"
                : "收起或展开侧边栏"
          }
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
        {CAN_REPLAY_ONBOARDING && !inExam ? (
          <Tooltip content="初始化流程（开发模式）" side="bottom">
            <button
              type="button"
              data-tauri-drag-region="false"
              aria-label="初始化流程"
              onClick={() => {
                // Setup is its own page: from anywhere else the click has to
                // land there first, then ask the page to start over.
                navigate("/onboarding");
                requestOnboarding();
              }}
              className="ml-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Sparkles aria-hidden="true" className="size-4.5" />
            </button>
          </Tooltip>
        ) : null}
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
