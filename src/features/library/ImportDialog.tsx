import { useEffect, useState } from "react";
import { open as openFile } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { ArrowUpFromLine, CircleCheck, CircleXmark } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
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
  cancelImport,
  installPackage,
  inspectPackage,
  type ValidationReport,
} from "@/features/library/api";
import { useLibrary } from "@/features/library/store";

/** The archive extensions a package may ship as. */
const ACCEPTED = ["morrow", "7z"];

type Phase =
  | { kind: "choose"; file: string | null }
  | { kind: "checking"; file: string }
  | { kind: "report"; file: string; report: ValidationReport }
  | { kind: "installing"; report: ValidationReport }
  | { kind: "failed"; reason: string };

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function isArchive(path: string): boolean {
  return ACCEPTED.includes(path.split(".").pop()?.toLowerCase() ?? "");
}

/**
 * Imports a `.morrow` archive in two steps, both inside one modal.
 *
 * The first view is the choice: what the app accepts, and the warning that a
 * package is content the model will read and quote. Picking a file only fills
 * the slot — nothing is extracted until 导入 is pressed, so a stray drag does
 * not start an install. The second view replaces it with the validation report,
 * and installing happens from there.
 */
export function ImportDialog({
  open,
  onOpenChange,
  onInstalled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled: () => void;
}) {
  const refresh = useLibrary((state) => state.refresh);
  const [phase, setPhase] = useState<Phase>({ kind: "choose", file: null });
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const reset = () => {
    setPhase({ kind: "choose", file: null });
    setDragging(false);
    setHint(null);
  };

  const accept = (path: string): boolean => {
    if (!isArchive(path)) {
      setHint(`只能导入 .morrow 或 .7z 文件，选中的是 ${fileName(path)}`);
      return false;
    }
    setHint(null);
    setPhase({ kind: "choose", file: path });
    return true;
  };

  const pick = async () => {
    const file = await openFile({
      multiple: false,
      filters: [{ name: "Morrow 学习包", extensions: ACCEPTED }],
    });
    if (typeof file === "string") accept(file);
  };

  // A file dropped on the window never reaches React: the native webview owns
  // that gesture, so the paths arrive as an event instead of a DataTransfer.
  useEffect(() => {
    if (!open || !isTauriRuntime) return;
    let unlisten: (() => void) | undefined;
    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setDragging(true);
        } else if (event.payload.type === "leave") {
          setDragging(false);
        } else if (event.payload.type === "drop") {
          setDragging(false);
          const [path] = event.payload.paths;
          if (path) accept(path);
        }
      })
      .then((stop) => {
        unlisten = stop;
      });
    return () => unlisten?.();
    // `accept` only touches setters, so re-subscribing per render would just
    // churn the native listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = async (file: string) => {
    setPhase({ kind: "checking", file });
    try {
      const report = await inspectPackage(file);
      setPhase({ kind: "report", file, report });
      if (!report.ok && report.staging) {
        // A failed inspection already staged the tree; drop it so a retry does
        // not collide with the half-extracted copy.
        void cancelImport(report.staging);
      }
    } catch (error) {
      setPhase({
        kind: "failed",
        reason: error instanceof Error ? error.message : "无法读取学习包",
      });
    }
  };

  const install = async (report: ValidationReport) => {
    if (!report.staging) return;
    setPhase({ kind: "installing", report });
    try {
      await installPackage(report.staging, report.update);
      await refresh();
      onInstalled();
      onOpenChange(false);
      reset();
    } catch (error) {
      setPhase({
        kind: "failed",
        reason: error instanceof Error ? error.message : "安装失败",
      });
    }
  };

  const dismiss = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const busy = phase.kind === "checking" || phase.kind === "installing";

  return (
    <Modal
      open={open}
      onOpenChange={dismiss}
      title="导入学习包"
      width="lg"
      footer={
        busy ? null : phase.kind === "report" ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() => setPhase({ kind: "choose", file: null })}
            >
              重新选择
            </Button>
            {phase.report.ok ? (
              <Button
                size="sm"
                className="text-sm"
                onClick={() => void install(phase.report)}
              >
                {phase.report.update ? "更新到新版本" : "安装"}
              </Button>
            ) : null}
          </>
        ) : phase.kind === "choose" ? (
          <Button
            size="sm"
            className="text-sm"
            disabled={!phase.file || !isTauriRuntime}
            onClick={() => phase.file && void start(phase.file)}
          >
            导入
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="text-sm"
            onClick={() => setPhase({ kind: "choose", file: null })}
          >
            重新选择
          </Button>
        )
      }
    >
      {phase.kind === "choose" ? (
        <ChooseStep
          file={phase.file}
          dragging={dragging}
          hint={hint}
          onPick={() => void pick()}
        />
      ) : phase.kind === "checking" ? (
        <StatusLine
          status="loading"
          label="正在校验学习包"
          detail={fileName(phase.file)}
        />
      ) : phase.kind === "installing" ? (
        <StatusLine
          status="loading"
          label="正在安装学习包"
          detail={phase.report.summary?.name ?? ""}
        />
      ) : phase.kind === "failed" ? (
        <StatusLine status="danger" label="导入失败" detail={phase.reason} />
      ) : (
        <CheckList report={phase.report} />
      )}
    </Modal>
  );
}

/** The first view: what is accepted, why to be careful, and the file slot. */
function ChooseStep({
  file,
  dragging,
  hint,
  onPick,
}: {
  file: string | null;
  dragging: boolean;
  hint: string | null;
  onPick: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning">
        <AlertIcon />
        <AlertContent>
          <AlertTitle>请不要使用来源不明的学习包</AlertTitle>
          <AlertDescription>
            学习包里的教材与解析会原样提供给 Lumi 引用，来源不明的包可能夹带错误内容或不合适的材料。
          </AlertDescription>
        </AlertContent>
      </Alert>

      <Button
        type="button"
        variant="secondary"
        disabled={!isTauriRuntime}
        onClick={onPick}
        className={[
          "h-40 w-full flex-col gap-2 rounded-2xl border border-dashed text-sm font-normal",
          dragging ? "border-foreground/60 bg-muted" : "border-border-strong",
        ].join(" ")}
      >
        <ArrowUpFromLine className="size-6 text-muted-foreground" />
        <span className="text-sm text-foreground">
          {file ? fileName(file) : "拖入文件，或点击选择"}
        </span>
        <span className="text-sm text-muted-foreground">
          支持 .morrow 与 .7z 学习包
        </span>
      </Button>

      {hint ? <p className="text-sm text-destructive">{hint}</p> : null}

      {!isTauriRuntime ? (
        <AnimatedBadge status="warning" size="sm" contentKey="preview">
          浏览器预览中不能导入学习包
        </AnimatedBadge>
      ) : null}
    </div>
  );
}

function StatusLine({
  status,
  label,
  detail,
}: {
  status: "loading" | "danger";
  label: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatedBadge status={status} size="sm" contentKey={label}>
        {label}
      </AnimatedBadge>
      {detail ? (
        <p className="text-sm leading-6 break-all text-muted-foreground">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function CheckList({ report }: { report: ValidationReport }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <AnimatedBadge
          status={report.ok ? "success" : "danger"}
          size="sm"
          contentKey={report.ok ? "ok" : "bad"}
        >
          {report.ok ? "校验通过" : "校验未通过"}
        </AnimatedBadge>
        {report.update ? (
          <AnimatedBadge status="info" size="sm" contentKey="update">
            将更新已有学习包
          </AnimatedBadge>
        ) : null}
        {report.summary ? (
          <span className="truncate text-sm text-foreground">
            {report.summary.name} · v{report.summary.version}
          </span>
        ) : null}
      </div>

      {report.stats ? (
        <p className="text-sm tabular-nums text-muted-foreground">
          {report.stats.chapters} 章 · {report.stats.points} 个知识点 ·{" "}
          {report.stats.questions} 道题
        </p>
      ) : null}

      <ul className="flex flex-col divide-y divide-border/60">
        {report.checks.map((check) => (
          <li
            key={check.key}
            className="flex items-start gap-2 py-2 first:pt-0 last:pb-0"
          >
            {check.ok ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <CircleXmark className="mt-0.5 size-4 shrink-0 text-destructive" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-sm text-foreground">{check.label}</span>
              {check.details.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {check.details.slice(0, 6).map((detail) => (
                    <li key={detail} className="truncate">
                      {detail}
                    </li>
                  ))}
                  {check.details.length > 6 ? (
                    <li>还有 {check.details.length - 6} 条</li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
