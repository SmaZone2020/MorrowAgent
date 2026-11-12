import { useEffect, useState, type ReactNode } from "react";
import { open as openFile } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { ArrowUpFromLine } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { fileName } from "@/features/library/usePackageInstall";

/** The archive extensions a package may ship as. */
export const ACCEPTED_ARCHIVES = ["morrow", "7z"];

export function isArchive(path: string): boolean {
  return ACCEPTED_ARCHIVES.includes(path.split(".").pop()?.toLowerCase() ?? "");
}

/**
 * A file dropped on the window never reaches React: the native webview owns
 * that gesture, so the paths arrive as an event instead of a DataTransfer.
 *
 * `onPath` is called with every dropped path, valid or not; rejecting belongs
 * to the caller, which is the only one that knows what to say.
 */
export function useArchiveDrop(
  enabled: boolean,
  onPath: (path: string) => void,
): boolean {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!enabled || !isTauriRuntime) return;
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
          if (path) onPath(path);
        }
      })
      .then((stop) => {
        unlisten = stop;
      });
    return () => unlisten?.();
    // `onPath` only routes a path onward; re-subscribing per render would just
    // churn the native listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return dragging;
}

/** Opens the native picker and hands back one archive path, or null. */
export async function pickArchive(): Promise<string | null> {
  const file = await openFile({
    multiple: false,
    filters: [{ name: "Morrow 学习包", extensions: ACCEPTED_ARCHIVES }],
  });
  return typeof file === "string" ? file : null;
}

/**
 * The file slot: a dashed target that accepts a drop or a click.
 *
 * It is one button rather than a label plus a zone so the whole area is the hit
 * target, and it states the two facts a first-time importer needs — what it
 * takes, and what is currently selected — without a subtitle above it.
 */
export function PackageDropZone({
  file,
  dragging,
  hint,
  busy = false,
  disabled = !isTauriRuntime,
  onPick,
  footer,
}: {
  file: string | null;
  dragging: boolean;
  hint: string | null;
  busy?: boolean;
  disabled?: boolean;
  onPick: () => void;
  /** Extra content under the slot, e.g. the progress line. */
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || busy}
        onClick={onPick}
        className={[
          "h-36 w-full flex-col gap-2 rounded-2xl border border-dashed text-sm font-normal",
          dragging ? "border-foreground/60 bg-muted" : "border-border-strong",
        ].join(" ")}
      >
        <ArrowUpFromLine className="size-6 text-muted-foreground" />
        <span className="text-sm text-foreground">
          {file ? fileName(file) : "拖入 .morrow 文件，或点击选择"}
        </span>
        <span className="text-sm text-muted-foreground">
          支持 .morrow 与 .7z 学习包
        </span>
      </Button>

      {hint ? <p className="text-sm text-destructive">{hint}</p> : null}
      {footer}
    </div>
  );
}
