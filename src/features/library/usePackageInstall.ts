import { useCallback, useState } from "react";
import {
  cancelImport,
  inspectPackage,
  installPackage,
  type Workspace,
} from "@/features/library/api";
import { useLibrary } from "@/features/library/store";

/** What an inline import is doing right now. */
export type InstallPhase =
  | { kind: "idle" }
  | { kind: "checking"; file: string }
  | { kind: "installing"; file: string; name: string }
  | { kind: "done"; workspace: Workspace }
  | { kind: "failed"; reason: string };

export function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/**
 * Installs one archive without the two-view report dialog.
 *
 * The report exists to let a learner read every check before agreeing to an
 * install, which is the right shape on the shelf — the package may be someone
 * else's file, or an update to content they already have. A first run is the
 * one place where there is nothing to compare against and nothing to lose, so
 * the same validate-then-install work runs inline and the answer is a single
 * line: installed, or why not.
 *
 * A failed inspection leaves a staged tree behind, so it is dropped here rather
 * than leaking one directory per attempt. `start` resolves to the installed
 * workspace, or null when the archive was refused.
 */
export function usePackageInstall() {
  const refresh = useLibrary((state) => state.refresh);
  const [phase, setPhase] = useState<InstallPhase>({ kind: "idle" });

  const start = useCallback(
    async (path: string): Promise<Workspace | null> => {
      setPhase({ kind: "checking", file: path });
      let report;
      try {
        report = await inspectPackage(path);
      } catch (error) {
        setPhase({
          kind: "failed",
          reason: error instanceof Error ? error.message : "无法读取学习包",
        });
        return null;
      }

      if (!report.ok || !report.staging) {
        if (report.staging) void cancelImport(report.staging);
        const firstFailure = report.checks.find((check) => !check.ok);
        setPhase({
          kind: "failed",
          reason:
            firstFailure?.details[0] ??
            firstFailure?.label ??
            "学习包未通过校验",
        });
        return null;
      }

      // An update to a locked workspace is refused by the backend; saying so
      // before the click saves the round trip.
      if (report.update) {
        const locked = useLibrary
          .getState()
          .workspaces.find(
            (workspace) =>
              workspace.packageId === report.summary?.id &&
              workspace.versionPolicy === "locked",
          );
        if (locked) {
          void cancelImport(report.staging);
          setPhase({
            kind: "failed",
            reason: `「${locked.name}」锁定在 v${locked.packageVersion}，请先在书架解锁后再更新`,
          });
          return null;
        }
      }

      setPhase({
        kind: "installing",
        file: path,
        name: report.summary?.name ?? fileName(path),
      });
      try {
        const workspace = await installPackage(report.staging, report.update);
        await refresh();
        setPhase({ kind: "done", workspace });
        return workspace;
      } catch (error) {
        setPhase({
          kind: "failed",
          reason: error instanceof Error ? error.message : "安装失败",
        });
        return null;
      }
    },
    [refresh],
  );

  const reset = useCallback(() => setPhase({ kind: "idle" }), []);

  return { phase, start, reset };
}
