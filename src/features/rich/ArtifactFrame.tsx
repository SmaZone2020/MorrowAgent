import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Xmark } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";

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
    <figure className="my-3 overflow-hidden rounded-2xl border border-border/70 bg-card">
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
 * Full-screen view of one block. The overlay is a portal so it is not clipped
 * by the scrolling message list, and it owns Escape so closing does not depend
 * on where focus ended up.
 */
export function ArtifactOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {title}
          </span>
          <Button
            size="sm"
            variant="ghost"
            aria-label="关闭"
            className="size-8 p-0"
            onClick={onClose}
          >
            <Xmark className="size-4" />
          </Button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
