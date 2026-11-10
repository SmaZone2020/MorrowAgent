import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { save as saveFile } from "@tauri-apps/plugin-dialog";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Modal } from "@/components/Modal";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { workspacePath } from "@/app/navigation";
import {
  exportPackage,
  removeWorkspace,
  type Workspace,
} from "@/features/library/api";
import { useLibrary } from "@/features/library/store";

type Removing = "none" | "confirm";

/**
 * What a shelf card can do without being opened: enter, export, or remove.
 *
 * Removal has two outcomes, and they are genuinely different: dropping the
 * package keeps the study record in an orphaned workspace, while deleting the
 * data destroys transcripts and attempts that no other copy exists of
 * (MLPS §16). Both are offered, neither is preselected.
 */
export function PackageSheet({
  workspace,
  onOpenChange,
}: {
  workspace: Workspace | null;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const refresh = useLibrary((state) => state.refresh);
  const [removing, setRemoving] = useState<Removing>("none");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const close = (open: boolean) => {
    if (!open) {
      setRemoving("none");
      setNotice(null);
    }
    onOpenChange(open);
  };

  if (!workspace) return null;

  const exportTo = async () => {
    const target = await saveFile({
      defaultPath: `${workspace.packageId}@${workspace.packageVersion}.morrow`,
      filters: [{ name: "Morrow 学习包", extensions: ["morrow"] }],
    });
    if (!target) return;

    setBusy(true);
    try {
      const bytes = await exportPackage(workspace.id, target);
      setNotice(`已导出 ${(bytes / 1024).toFixed(0)} KB`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导出失败");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (deleteData: boolean) => {
    setBusy(true);
    try {
      await removeWorkspace(workspace.id, deleteData);
      await refresh();
      close(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "移除失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={close}
      title={workspace.name}
      width="md"
      footer={
        removing === "confirm" ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              disabled={busy}
              onClick={() => setRemoving("none")}
            >
              取消
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-sm text-destructive"
              disabled={busy}
              onClick={() => void remove(true)}
            >
              连同学习数据删除
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              disabled={busy || !isTauriRuntime || workspace.orphaned}
              onClick={() => void exportTo()}
            >
              导出
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-sm text-destructive"
              disabled={busy}
              onClick={() => setRemoving("confirm")}
            >
              移除
            </Button>
            <Button
              size="sm"
              className="text-sm"
              disabled={workspace.orphaned}
              onClick={() => {
                close(false);
                navigate(workspacePath(workspace.id, "/lumi"));
              }}
            >
              进入
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <AnimatedBadge status="neutral" size="sm" contentKey={workspace.packageVersion}>
            v{workspace.packageVersion}
          </AnimatedBadge>
          {workspace.orphaned ? (
            <AnimatedBadge status="warning" size="sm" contentKey="orphaned">
              内容已移除
            </AnimatedBadge>
          ) : null}
          {workspace.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <dl className="flex flex-col gap-1.5 text-sm">
          <Row label="包 ID" value={workspace.packageId} />
          <Row label="安装时间" value={formatDate(workspace.installedAt)} />
          <Row label="最近打开" value={formatDate(workspace.lastOpenedAt)} />
        </dl>

        {notice ? (
          <p className="text-sm text-muted-foreground">{notice}</p>
        ) : null}

        {removing === "confirm" ? (
          <p className="text-sm leading-6 text-destructive">
            删除后 Lumi 对话、作答记录与错题本一并消失，且无法恢复。想留记录就只移除学习包。
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-mono text-foreground">{value}</dd>
    </div>
  );
}

function formatDate(stamp: number): string {
  if (!stamp) return "—";
  const date = new Date(stamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
