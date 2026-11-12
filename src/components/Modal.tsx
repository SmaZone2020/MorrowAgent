import { useCallback, useRef, type ReactNode } from "react";
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/vendor/beui/components/motion/center-morph-modal";

const WIDTH = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
} as const;

/**
 * Every dialog in the app goes through this wrapper so they share one unfold
 * animation, one focus trap and one Escape handler — all of which live in the
 * beUI modal instead of being re-implemented per page.
 *
 * `dismissible={false}` is for a dialog that has to be answered: it drops the
 * Escape key, the backdrop press and the corner close button in one go, because
 * a dialog that can be closed three ways but refuses none of them is worse than
 * one that simply has no way out.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  heading,
  children,
  footer,
  width = "md",
  bodyClassName = "max-h-[70vh]",
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Doubles as the accessible name, so it must be the visible heading. */
  title: string;
  /** Rich version of the heading, when the title is not plain text. */
  heading?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: keyof typeof WIDTH;
  bodyClassName?: string;
  /** Escape, backdrop press and the corner close button. Default true. */
  dismissible?: boolean;
}) {
  // The modal's focus effect depends on its context, which contains the close
  // callback. Callers pass inline arrows, so a new identity every render would
  // re-run that effect and yank focus back to the first control on each
  // keystroke. One stable forwarder keeps the context identical for the whole
  // life of the dialog while still calling the latest handler.
  const latest = useRef(onOpenChange);
  latest.current = onOpenChange;
  const handleOpenChange = useCallback((next: boolean) => {
    latest.current(next);
  }, []);

  return (
    <CenterMorphModal open={open} onOpenChange={handleOpenChange}>
      <CenterMorphModalContent
        ariaLabel={title}
        className={WIDTH[width]}
        dismissible={dismissible}
        showCloseButton={dismissible}
      >
        <div className="flex flex-col">
          {/* Right padding clears the modal's own close button. */}
          <div
            className={`border-b border-border/70 px-5 py-3.5 ${dismissible ? "pr-14" : ""}`}
          >
            <h2 className="truncate text-base font-semibold text-foreground">
              {heading ?? title}
            </h2>
          </div>
          <div
            className={`scrollbar-thin overflow-y-auto px-5 py-4 ${bodyClassName}`}
          >
            {children}
          </div>
          {footer ? (
            <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </CenterMorphModalContent>
    </CenterMorphModal>
  );
}
