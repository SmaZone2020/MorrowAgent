import { useEffect, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
      <Panel title="本地数据">
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">数据库</dt>
            <dd className="min-w-0 truncate text-right text-foreground">
              {stats ? formatBytes(stats.sizeBytes) : "浏览器预览中不可用"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">对话</dt>
            <dd className="tabular-nums text-foreground">
              {stats ? stats.conversations : "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">消息</dt>
            <dd className="tabular-nums text-foreground">
              {stats ? stats.messages : "—"}
            </dd>
          </div>
          {stats ? (
            <div className="flex flex-col gap-1 pt-1">
              <dt className="text-muted-foreground">位置</dt>
              <dd className="break-all font-mono text-xs leading-5 text-foreground">
                {stats.path}
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      <Panel
        title="重置"
        action={<InfoHint label="只删除对话记录，Provider 凭据不受影响。" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {confirming ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void wipe()}
              >
                {busy ? "清除中" : "确认清除"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
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
              disabled={!stats}
              onClick={() => setConfirming(true)}
            >
              清除所有对话
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
