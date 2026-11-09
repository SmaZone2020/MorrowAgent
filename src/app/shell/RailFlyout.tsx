import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { cn } from "@/vendor/beui/lib/utils";
import { SPRING_PANEL } from "@/vendor/beui/lib/ease";
import type { NavigationSubItem } from "@/app/navigation";

interface RailFlyoutProps {
  open: boolean;
  anchor: HTMLElement | null;
  title: string;
  items: NavigationSubItem[];
  activePath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

// The icon rail has no room for an inline submenu, so a group opens its
// children as an anchored list beside the rail — the same surface language a
// context menu uses, which is what a rail flyout reads as at this size.
export function RailFlyout({
  open,
  anchor,
  title,
  items,
  activePath,
  onSelect,
  onClose,
}: RailFlyoutProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [placed, setPlaced] = useState(false);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const panel = panelRef.current;
    if (!panel) return;

    let cancelled = false;
    void computePosition(anchor, panel, {
      placement: "right-start",
      strategy: "fixed",
      middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
    }).then((next) => {
      if (cancelled) return;
      setPosition({ x: next.x, y: next.y });
      setPlaced(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, anchor]);

  useEffect(() => {
    if (!open) {
      setPlaced(false);
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      // Focus is not moved on open (a mouse-opened menu should not flash a
      // focus ring), so arrow keys are what hand the menu to the keyboard.
      const panel = panelRef.current;
      if (!panel) return;
      const entries = [
        ...panel.querySelectorAll<HTMLElement>("[data-rail-flyout-item]"),
      ];
      if (entries.length === 0) return;
      const index = entries.indexOf(document.activeElement as HTMLElement);
      let next = -1;
      if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % entries.length;
      else if (event.key === "ArrowUp")
        next = index < 0 ? entries.length - 1 : (index - 1 + entries.length) % entries.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = entries.length - 1;
      if (next < 0) return;
      event.preventDefault();
      entries[next]?.focus({ preventScroll: true });
    };
    const onViewportChange = () => onClose();

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, anchor, onClose]);

  // Scale from the rail edge so the panel reads as growing out of the icon
  // that opened it, not as a box fading in from nowhere.
  const panelMotion = reduce
    ? {
        initial: false,
        animate: { opacity: placed ? 1 : 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.94, x: -6 },
        animate: { opacity: placed ? 1 : 0, scale: 1, x: 0 },
        exit: { opacity: 0, scale: 0.96, x: -4 },
        transition: SPRING_PANEL,
      };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          role="menu"
          aria-label={title}
          style={{
            left: position.x,
            top: position.y,
            transformOrigin: "left center",
          }}
          className={cn(
            "fixed z-100 min-w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg",
            placed ? "opacity-100" : "opacity-0",
          )}
          {...panelMotion}
        >
          {items.map((item) => {
            const active = activePath === item.path;
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                data-rail-flyout-item
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onSelect(item.path);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] outline-none",
                  "transition-colors hover:bg-muted/60 focus-visible:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.icon ? (
                  <item.icon aria-hidden="true" className="size-4.5 shrink-0" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-current"
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
