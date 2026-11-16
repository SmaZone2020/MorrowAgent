import { open as openFolder } from "@tauri-apps/plugin-dialog";
import { CircleCheck, CircleXmark, FolderOpen } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { RadioGroup, RadioGroupItem } from "@/vendor/beui/components/motion/radio";
import { isTauriRuntime } from "@/app/shell/windowControls";
import type { BuildEnvironment } from "@/features/builder/api";
import {
  isPermissionTier,
  TIERS,
  type PermissionTier,
} from "@/features/builder/permission";
import { folderName } from "@/features/builder/workspaces";

/**
 * The two decisions a build starts with, and the machine it will run on.
 *
 * They are gathered in one file because they are one panel at three sizes: the
 * gate on a fresh start, the sheet that changes them later, and the strip in the
 * header that only reports them.
 */

/** Opens the native folder picker and hands back one path, or null. */
export async function pickFolder(): Promise<string | null> {
  const picked = await openFolder({
    directory: true,
    multiple: false,
    title: "选择学习包的工作区文件夹",
  });
  return typeof picked === "string" ? picked : null;
}

/** The last segment of a path, for a chip that has no room for the whole one. */
export { folderName };


/**
 * The folder the assistant may touch.
 *
 * It reads as one control rather than a label plus a button: the whole row is
 * the target, and the caption underneath answers the question a new user
 * actually has — what will happen to the folder they just handed over.
 */
export function FolderSlot({
  folder,
  busy = false,
  onPick,
}: {
  folder: string;
  busy?: boolean;
  onPick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={!isTauriRuntime || busy}
      onClick={onPick}
      className="h-auto w-full flex-col items-start gap-1.5 rounded-xl px-4 py-3 text-left font-normal"
    >
      <span className="flex w-full items-center gap-2">
        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {folder ? folderName(folder) : "还没有选择文件夹"}
        </span>
        <span className="shrink-0 text-sm text-muted-foreground">
          {folder ? "更换" : "浏览"}
        </span>
      </span>
    </Button>
  );
}

/** Which tier, and what the chosen one actually means. */
export function TierChoices({
  tier,
  onChange,
}: {
  tier: PermissionTier;
  onChange: (tier: PermissionTier) => void;
}) {
  const active = TIERS.find((item) => item.id === tier) ?? TIERS[0]!;

  return (
    <div className="flex flex-col gap-2.5">
      <RadioGroup
        value={tier}
        aria-label="权限"
        onValueChange={(value) => {
          if (isPermissionTier(value)) onChange(value);
        }}
        className="gap-2"
      >
        {TIERS.map((item) => (
          <RadioGroupItem
            key={item.id}
            value={item.id}
            label={item.label}
            description={item.summary}
            className="w-full rounded-xl px-3 py-2 transition-colors hover:bg-muted/50"
          />
        ))}
      </RadioGroup>
      <p className="px-1 text-xs leading-5 text-muted-foreground">{active.detail}</p>
    </div>
  );
}

/**
 * What the assistant will be able to run.
 *
 * A missing tool is worth showing before the first request rather than after a
 * failed one: the model is told the same list, so a red chip here explains why
 * it refused to run a validator instead of pretending it did.
 */
export function EnvironmentSummary({
  env,
  probing,
  error,
}: {
  env: BuildEnvironment | null;
  probing: boolean;
  error: string | null;
}) {
  if (probing) {
    return <p className="text-sm text-muted-foreground">正在探测这台机器…</p>;
  }
  if (!env) {
    return (
      <p className="text-sm text-muted-foreground">
        {error ?? "还没探测环境：构建助手会在用到命令之前先试一次。"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs text-muted-foreground">
        {env.os} {env.osVersion} · {env.arch} · {env.shell}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {env.tools.map((tool) => (
          <span
            key={tool.name}
            title={tool.version || "未安装"}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
              tool.available
                ? "border-border bg-card text-muted-foreground"
                : "border-dashed border-border text-muted-foreground/60"
            }`}
          >
            {tool.available ? (
              <CircleCheck className="size-3 shrink-0 text-success" />
            ) : (
              <CircleXmark className="size-3 shrink-0" />
            )}
            {tool.name}
          </span>
        ))}
      </div>
    </div>
  );
}
