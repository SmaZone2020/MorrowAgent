import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { cn } from "@/vendor/beui/lib/utils";
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
      }
    };
    const onViewportChange = () => onClose();

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    const frame = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-rail-flyout-item]")
        ?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, anchor, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label={title}
      style={{ left: position.x, top: position.y }}
      className={cn(
        "fixed z-100 min-w-52 rounded-xl border border-border bg-card p-1.5 shadow-lg",
        placed ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </div>
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
              <item.icon aria-hidden="true" className="size-3.5 shrink-0" />
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
    </div>,
    document.body,
  );
}
