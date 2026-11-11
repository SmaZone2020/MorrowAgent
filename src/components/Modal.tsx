import type { ReactNode } from "react";
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
}) {
  return (
    <CenterMorphModal open={open} onOpenChange={onOpenChange}>
      <CenterMorphModalContent
        ariaLabel={title}
        className={WIDTH[width]}
      >
        <div className="flex flex-col">
          {/* Right padding clears the modal's own close button. */}
          <div className="border-b border-border/70 px-5 py-3.5 pr-14">
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
