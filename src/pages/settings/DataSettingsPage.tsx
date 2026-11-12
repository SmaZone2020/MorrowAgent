import { useEffect, useState } from "react";
import { open as openFile, save as saveFile } from "@tauri-apps/plugin-dialog";
import { ArrowRotateLeft, ArrowUpFromLine } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/vendor/beui/components/motion/alert";
import { Modal } from "@/components/Modal";
import { isTauriRuntime } from "@/app/shell/windowControls";
import {
  SettingsGroup,
  SettingsPageShell,
  SettingsRow,
} from "@/pages/settings/SettingsBlocks";
import {
  backupData,
  formatBytes,
  loadStats,
  resetAllData,
  restartApp,
  restoreData,
  type StoreStats,
} from "@/features/settings/preferences";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";

const BACKUP_EXTENSION = "morrow-backup";

export function DataSettingsPage() {
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

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

  const backup = async () => {
    setNotice(null);
    const target = await saveFile({
      defaultPath: `morrow-${new Date().toISOString().slice(0, 10)}.${BACKUP_EXTENSION}`,
      filters: [{ name: "Morrow 备份", extensions: [BACKUP_EXTENSION] }],
    });
    if (!target) return;

    setBusy(true);
    try {
      const bytes = await backupData(target);
      setNotice(`已备份 ${formatBytes(bytes)}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "备份失败");
    } finally {
      setBusy(false);
    }
  };

  const pickRestore = async () => {
    setNotice(null);
    const file = await openFile({
      multiple: false,
      filters: [{ name: "Morrow 备份", extensions: [BACKUP_EXTENSION] }],
    });
    if (typeof file === "string") setPendingRestore(file);
  };

  const restore = async (file: string) => {
    setBusy(true);
    try {
      await restoreData(file);
      setPendingRestore(null);
      setRestored(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "恢复失败");
      setPendingRestore(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPageShell title="数据管理">
      <SettingsGroup title="备份">
        <SettingsRow
          title="备份到文件"
          hint="打包全部对话、作答与界面状态；学习包内容本身可以单独导出，不在这里。"
          control={
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              disabled={busy || !stats || !isTauriRuntime}
              onClick={() => void backup()}
            >
              选择位置
            </Button>
          }
        />
        <SettingsRow
          title="从备份恢复"
          hint="恢复后用备份里的记录替换当前记录，界面与学习包列表需要重启才能重新读取。"
          control={
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              disabled={busy || !isTauriRuntime}
              onClick={() => void pickRestore()}
            >
              <ArrowUpFromLine className="size-4" />
              选择文件
            </Button>
          }
        />
        {notice ? <p className="px-4 py-3 text-sm text-muted-foreground">{notice}</p> : null}
      </SettingsGroup>

      <SettingsGroup title="本地存储">
        <SettingsRow
          title="Database"
          hint="所有对话、作答与统计都存在本机的 SQLite 文件里。"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {stats ? formatBytes(stats.sizeBytes) : "—"}
            </span>
          }
        />
        <SettingsRow
          title="Chat Sessions"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {stats ? stats.conversations : "—"}
            </span>
          }
        />
        <SettingsRow
          title="Messages"
          control={
            <span className="text-sm tabular-nums text-foreground">
              {stats ? stats.messages : "—"}
            </span>
          }
        />
        {stats ? (
          <SettingsRow
            title="位置"
            control={
              <Tooltip content="点击复制路径" side="top">
                <a onClick={()=>{
                  navigator.clipboard.writeText(stats.path);
                }} 
                className="max-w-72 truncate font-mono text-sm text-muted-foreground cursor-pointer hover:underline">
                  {stats.path}
                </a>
              </Tooltip>
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

      <Modal
        open={pendingRestore !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRestore(null);
        }}
        title="从备份恢复"
        width="md"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              disabled={busy}
              onClick={() => setPendingRestore(null)}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="text-sm"
              disabled={busy}
              onClick={() => pendingRestore && void restore(pendingRestore)}
            >
              {busy ? "恢复中" : "确认恢复"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <AlertIcon />
            <AlertContent>
              <AlertTitle>当前的对话与作答会被备份里的记录替换</AlertTitle>
              <AlertDescription>
                恢复前会把现有数据留一份在同一目录，但界面里看不到它，请确认这份备份是对的。
              </AlertDescription>
            </AlertContent>
          </Alert>
          <p className="font-mono text-sm break-all text-muted-foreground">
            {pendingRestore}
          </p>
        </div>
      </Modal>

      <Modal
        open={restored}
        onOpenChange={(open) => {
          if (!open) setRestored(false);
        }}
        title="恢复完成"
        width="sm"
        footer={
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => setRestored(false)}
            >
              稍后重启
            </Button>
            <Button
              size="sm"
              className="text-sm"
              onClick={() => void restartApp()}
            >
              <ArrowRotateLeft className="size-4" />
              立即重启
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          数据已经替换。当前界面还显示恢复前的会话，重启后才会读到备份里的记录。
        </p>
      </Modal>
    </SettingsPageShell>
  );
}
