import { useEffect, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";
import {
  formatBytes,
  loadStats,
  resetAllData,
  type StoreStats,
} from "@/features/settings/preferences";

export function DataSettingsPage() {
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    void loadStats().then(setStats);
  };

  useEffect(refresh, []);

  const wipe = async () => {
    setBusy(true);
    try {
      await resetAllData();
      refresh();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <SettingsPageShell title="数据管理">
      <SettingsGroup title="本地存储">
        <SettingsRow
          title="数据库"
          hint="所有对话、作答与统计都存在本机的 SQLite 文件里。"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {stats ? formatBytes(stats.sizeBytes) : "浏览器预览中不可用"}
            </span>
          }
        />
        <SettingsRow
          title="对话"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {stats ? stats.conversations : "—"}
            </span>
          }
        />
        <SettingsRow
          title="消息"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {stats ? stats.messages : "—"}
            </span>
          }
        />
        <SettingsRow
          title="作答"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {stats ? `${stats.correctAttempts} / ${stats.attempts}` : "—"}
            </span>
          }
        />
        {stats ? (
          <SettingsRow
            title="位置"
            control={
              <span className="max-w-72 truncate font-mono text-sm text-muted-foreground">
                {stats.path}
              </span>
            }
          />
        ) : null}
      </SettingsGroup>

      <SettingsGroup title="重置">
        <SettingsRow
          title="清除所有学习记录"
          hint="删除全部对话与作答记录，Provider 凭据不受影响。"
          control={
            <div className="flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-sm"
                    disabled={busy}
                    onClick={() => void wipe()}
                  >
                    {busy ? "清除中" : "确认清除"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-sm"
                    disabled={busy}
                    onClick={() => setConfirming(false)}
                  >
                    取消
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-sm"
                  disabled={!stats}
                  onClick={() => setConfirming(true)}
                >
                  清除
                </Button>
              )}
            </div>
          }
        />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
