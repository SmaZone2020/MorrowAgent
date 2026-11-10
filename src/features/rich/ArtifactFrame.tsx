import type { ReactNode } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Modal } from "@/components/Modal";

/** Inline artifacts never exceed this width, so one big figure cannot eat the reply. */
export const ARTIFACT_MAX_WIDTH = "max-w-[450px]";

/**
 * The frame every rich block sits in: a title, the drawing, and two actions —
 * save and enlarge. Keeping the chrome in one place means a new block type only
 * has to say how it renders.
 */
export function ArtifactFrame({
  title,
  actions,
  children,
}: {
  title: string;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure
      className={`my-3 w-full overflow-hidden rounded-2xl border border-border/70 bg-card ${ARTIFACT_MAX_WIDTH}`}
    >
      <figcaption className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </figcaption>
      <div className="p-3">{children}</div>
    </figure>
  );
}

/** A small icon button used in a frame's header. */
export function ArtifactAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      aria-label={label}
      title={label}
      className="size-8 p-0"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Enlarged view of one block. It is a plain modal rather than a full-screen
 * overlay: the block keeps its card chrome and only grows to the widest dialog,
 * so the reader does not lose the surrounding transcript.
 */
export function ArtifactOverlay({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      width="xl"
      bodyClassName="max-h-[75vh]"
    >
      {children}
    </Modal>
  );
}
