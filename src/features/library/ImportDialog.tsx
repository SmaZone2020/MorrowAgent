import { useState } from "react";
import { open as openFile } from "@tauri-apps/plugin-dialog";
import { ArrowDownToLine, CircleCheck, CircleXmark } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Modal } from "@/components/Modal";
import { isTauriRuntime } from "@/app/shell/windowControls";
import {
  cancelImport,
  installPackage,
  inspectPackage,
  type ValidationReport,
} from "@/features/library/api";
import { useLibrary } from "@/features/library/store";

type Phase =
  | { kind: "idle" }
  | { kind: "checking"; file: string }
  | { kind: "report"; file: string; report: ValidationReport }
  | { kind: "installing"; file: string; report: ValidationReport }
  | { kind: "failed"; file: string; reason: string };

/**
 * Picks a `.morrow` file, validates it, then installs.
 *
 * Inspection is a separate step on purpose: it extracts into staging and runs
 * nine checks before anything touches `packages/`. The report is what the user
 * confirms, so an unsigned or tampered archive never reaches the shelf.
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
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const reset = () => setPhase({ kind: "idle" });

  const choose = async () => {
    const file = await openFile({
      multiple: false,
      filters: [{ name: "Morrow 学习包", extensions: ["morrow", "7z"] }],
    });
    if (!file) return;

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
        file,
        reason: error instanceof Error ? error.message : "无法读取学习包",
      });
    }
  };

  const install = async (report: ValidationReport) => {
    if (!report.staging) return;
    setPhase({ kind: "installing", file: "", report });
    try {
      await installPackage(report.staging, report.update);
      await refresh();
      reset();
      onInstalled();
      onOpenChange(false);
    } catch (error) {
      setPhase({
        kind: "failed",
        file: "",
        reason: error instanceof Error ? error.message : "安装失败",
      });
    }
  };

  const dismiss = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Modal
      open={open}
      onOpenChange={dismiss}
      title="导入学习包"
      width="lg"
      footer={
        phase.kind === "report" && phase.report.ok ? (
          <Button
            size="sm"
            className="text-sm"
            onClick={() => void install(phase.report)}
          >
            {phase.report.update ? "更新到新版本" : "安装"}
          </Button>
        ) : phase.kind === "report" || phase.kind === "failed" ? (
          <Button size="sm" variant="secondary" className="text-sm" onClick={() => void choose()}>
            重新选择
          </Button>
        ) : (
          <Button
            size="sm"
            className="text-sm"
            disabled={phase.kind === "checking" || !isTauriRuntime}
            onClick={() => void choose()}
          >
            选择文件
          </Button>
        )
      }
    >
      {!isTauriRuntime ? (
        <p className="text-sm leading-6 text-muted-foreground">
          浏览器预览中不能导入学习包，请在桌面应用里操作。
        </p>
      ) : phase.kind === "idle" ? (
        <div className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">
          <p>选择一个 .morrow 文件。导入前会先校验路径、清单与校验和。</p>
          <p>同一个学习包的新版本会就地更新内容，你的作答记录与对话不受影响。</p>
        </div>
      ) : phase.kind === "checking" ? (
        <p className="text-sm text-muted-foreground">正在校验学习包</p>
      ) : phase.kind === "failed" ? (
        <div className="flex flex-col gap-2">
          <AnimatedBadge status="danger" size="sm" contentKey="failed">
            导入失败
          </AnimatedBadge>
          <p className="text-sm leading-6 text-muted-foreground">{phase.reason}</p>
        </div>
      ) : (
        <CheckList report={phase.report} />
      )}
    </Modal>
  );
}

function CheckList({ report }: { report: ValidationReport }) {
  const failed = report.checks.filter((check) => !check.ok);

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
          <span className="text-sm text-muted-foreground">
            {report.summary.name} · v{report.summary.version}
          </span>
        ) : null}
      </div>

      {report.stats ? (
        <p className="text-sm text-muted-foreground">
          {report.stats.chapters} 章 · {report.stats.points} 个知识点 ·{" "}
          {report.stats.questions} 道题
        </p>
      ) : null}

      <ul className="flex flex-col divide-y divide-border/60">
        {report.checks.map((check) => (
          <li key={check.key} className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
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

      {failed.length > 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ArrowDownToLine className="size-4" />
          修正后可重新选择同一个文件。
        </p>
      ) : null}
    </div>
  );
}
