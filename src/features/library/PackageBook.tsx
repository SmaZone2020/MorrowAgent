import { useEffect, useState } from "react";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Button } from "@/vendor/beui/components/motion/button";
import { Tooltip } from "@/vendor/beui/components/motion/tooltip";
import { CircleInfo, Ellipsis } from "@gravity-ui/icons";
import { cn } from "@/vendor/beui/lib/utils";
import { coverData, type Workspace } from "@/features/library/api";

/** A cover is decorative: no cover, a broken cover and a slow cover all fall back. */
function useCover(workspace: Workspace): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!workspace.coverPath || workspace.orphaned) return;
    void coverData(workspace.id, workspace.coverPath).then((next) => {
      if (!cancelled && next) setUri(next);
    });
    return () => {
      cancelled = true;
    };
  }, [workspace.coverPath, workspace.id, workspace.orphaned]);

  return uri;
}

/**
 * One installed package, drawn as a book.
 *
 * The card is a button; the details button sits above it so it can open the
 * package sheet without also entering the workspace. A missing cover falls back
 * to the package's accent colour, which the author always supplies.
 */
export function PackageBook({
  workspace,
  recent,
  onOpen,
  onDetails,
}: {
  workspace: Workspace;
  /** The package the user last opened, marked so the shelf has a starting point. */
  recent?: boolean;
  onOpen: () => void;
  onDetails: () => void;
}) {
  const cover = useCover(workspace);
  const accent = workspace.accent ?? "#2f6f5e";
  const tags = workspace.tags.slice(0, 3);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "relative flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-r-2xl rounded-l-md border text-left outline-none",
          recent ? "border-ring/60" : "border-border/70",
          "shadow-[0_1px_2px_rgb(56_66_72/0.08),0_12px_28px_-12px_rgb(56_66_72/0.45)]",
          "transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(56_66_72/0.10),0_20px_40px_-14px_rgb(56_66_72/0.5)]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        style={cover ? undefined : { background: accent }}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}

        {/* The spine is what makes a flat rectangle read as a bound book. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-2.5 bg-black/25 shadow-[inset_-1px_0_0_rgb(255_255_255/0.18)]"
        />

        <span className="relative flex flex-col gap-1.5 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-4 pl-6">
          <span className="Siyuan line-clamp-2 text-lg font-semibold tracking-tight text-white">
            {workspace.name}
          </span>
          <span className="flex flex-wrap items-center gap-1">
            <AnimatedBadge status="neutral" size="sm" contentKey={workspace.packageVersion}>
              v{workspace.packageVersion}
            </AnimatedBadge>
            {workspace.orphaned ? (
              <AnimatedBadge status="warning" size="sm" contentKey="orphaned">
                内容已移除
              </AnimatedBadge>
            ) : null}
          </span>
        </span>
      </button>

      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Tooltip content="学习包详情" side="left">
          <Button
            size="sm"
            variant="secondary"
            aria-label="学习包详情"
            className="size-8 rounded-full p-0 text-sm"
            onClick={onDetails}
          >
            <Ellipsis className="size-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

/** The empty shelf explains what a learning package is, without a heading pair. */
export function EmptyShelf({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <CircleInfo className="size-5" />
      </span>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        书架还是空的。学习包是一个独立的学习工作区，导入后才有 Lumi、知识库与训练记录。
      </p>
      <Button size="sm" className="text-sm" onClick={onImport}>
        导入学习包
      </Button>
    </div>
  );
}
