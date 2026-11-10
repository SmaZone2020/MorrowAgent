import { useEffect, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
import { usePreferences } from "@/features/settings/preferencesStore";
import { usePersistedState } from "@/features/uiState";

const QUESTION_SCALE_MIN = 0.8;
const QUESTION_SCALE_MAX = 1.6;
const QUESTION_SCALE_STEP = 0.1;

/**
 * Preferences that apply to study sessions rather than to the window: the drill
 * text size and whether the sidebar starts expanded.
 */
export function GeneralSettingsPage() {
  const questionScale = usePreferences((state) => state.questionScale);
  const update = usePreferences((state) => state.update);
  const [sidebarOpen, setSidebarOpen] = usePersistedState("sidebar.open", true);
  // A local mirror keeps a repeated click from drifting on float rounding.
  const [scale, setScale] = useState(questionScale);

  useEffect(() => setScale(questionScale), [questionScale]);

  const step = (delta: number) => {
    const next = Math.round(
      Math.min(QUESTION_SCALE_MAX, Math.max(QUESTION_SCALE_MIN, scale + delta)) *
        100,
    ) / 100;
    setScale(next);
    update({ questionScale: next });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-5 sm:p-7">
      <Panel
        title="题目字号"
        action={<InfoHint label="只影响题目与解析正文；界面缩放另有设置。" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="text-sm"
            disabled={scale <= QUESTION_SCALE_MIN + 0.001}
            onClick={() => step(-QUESTION_SCALE_STEP)}
          >
            缩小
          </Button>
          <span className="min-w-14 text-center text-sm tabular-nums text-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="text-sm"
            disabled={scale >= QUESTION_SCALE_MAX - 0.001}
            onClick={() => step(QUESTION_SCALE_STEP)}
          >
            放大
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            disabled={scale === 1}
            onClick={() => {
              setScale(1);
              update({ questionScale: 1 });
            }}
          >
            恢复默认
          </Button>
        </div>
      </Panel>

      <Panel
        title="侧边栏"
        action={<InfoHint label="关闭后启动时显示图标栏，仍可从标题栏展开。" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={sidebarOpen ? "primary" : "secondary"}
            className="text-sm"
            aria-pressed={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            展开
          </Button>
          <Button
            size="sm"
            variant={sidebarOpen ? "secondary" : "primary"}
            className="text-sm"
            aria-pressed={!sidebarOpen}
            onClick={() => setSidebarOpen(false)}
          >
            收起
          </Button>
        </div>
      </Panel>
    </div>
  );
}
