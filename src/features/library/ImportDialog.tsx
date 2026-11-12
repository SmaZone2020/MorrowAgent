import { useState } from "react";
import { CircleCheck, CircleXmark } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { Loader } from "@/vendor/beui/components/motion/loader";
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
import {
  PackageDropZone,
  isArchive,
  pickArchive,
  useArchiveDrop,
} from "@/features/library/PackageDropZone";
import { fileName } from "@/features/library/usePackageInstall";

type Phase =
  | { kind: "choose"; file: string | null }
  | { kind: "checking"; file: string }
  | { kind: "report"; file: string; report: ValidationReport }
  | { kind: "installing"; report: ValidationReport }
  | { kind: "failed"; reason: string };

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
  const workspaces = useLibrary((state) => state.workspaces);
  const [phase, setPhase] = useState<Phase>({ kind: "choose", file: null });
  const [hint, setHint] = useState<string | null>(null);

  const reset = () => {
    setPhase({ kind: "choose", file: null });
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
    const file = await pickArchive();
    if (file) accept(file);
  };

  // Dropping is only live while the choice view is up: dropping onto the report
  // would silently swap the file being reviewed.
  const dragging = useArchiveDrop(open && phase.kind === "choose", accept);

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

  // An update that will be refused is shown before the install button is
  // pressed: finding out from an error after the click reads like a bug.
  const locked =
    phase.kind === "report" && phase.report.update
      ? workspaces.find(
          (workspace) =>
            workspace.packageId === phase.report.summary?.id &&
            workspace.versionPolicy === "locked",
        )
      : undefined;

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
                disabled={Boolean(locked)}
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
          loading
          label="正在校验学习包"
          detail={fileName(phase.file)}
        />
      ) : phase.kind === "installing" ? (
        <StatusLine
          loading
          label="正在安装学习包"
          detail={phase.report.summary?.name ?? ""}
        />
      ) : phase.kind === "failed" ? (
        <StatusLine label="导入失败" detail={phase.reason} />
      ) : (
        <>
          <CheckList report={phase.report} />
          {locked ? (
            <Alert variant="warning" className="mt-3">
              <AlertIcon />
              <AlertContent>
                <AlertTitle>「{locked.name}」锁定了当前版本</AlertTitle>
                <AlertDescription>
                  到书架里打开它，把「跟随版本更新」重新打开，再回来导入这个新版。
                </AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}
        </>
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
      <PackageDropZone
        file={file}
        dragging={dragging}
        hint={hint}
        onPick={onPick}
      />
    </div>
  );
}

function StatusLine({
  loading = false,
  label,
  detail,
}: {
  loading?: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className={
          loading
            ? "flex items-center gap-2 text-sm text-muted-foreground"
            : "flex items-center gap-2 text-sm text-destructive"
        }
      >
        {loading ? <Loader variant="dots" size={16} label={label} /> : null}
        <span aria-hidden={loading ? true : undefined}>{label}</span>
      </span>
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
