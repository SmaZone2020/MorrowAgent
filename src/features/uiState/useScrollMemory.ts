import { useEffect, useRef } from "react";
import { readScope, writeScope } from "@/features/uiState/store";

/** The nearest ancestor that actually scrolls, which is the shell's content pane. */
function findScrollParent(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const overflow = getComputedStyle(node).overflowY;
    if (overflow === "auto" || overflow === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Keeps a page's scroll offset across navigations.
 *
 * The offset lives outside React state on purpose: scrolling is a per-frame
 * event, and routing it through a component state update would re-render the
 * whole page while the user is dragging. Only the scroll container listens.
 */
export function useScrollMemory<T extends HTMLElement>(scope: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const container = findScrollParent(element);
    if (!container) return;

    const saved = readScope<number>(scope, 0);
    if (saved > 0) {
      // The page has to be laid out before its height is known, and a font
      // swap can change that height a frame later, so restore twice.
      requestAnimationFrame(() => {
        container.scrollTop = saved;
        requestAnimationFrame(() => {
          container.scrollTop = saved;
        });
      });
    }

    let frame = 0;
    let last = saved;
    const onScroll = () => {
      last = container.scrollTop;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        writeScope(scope, last);
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      container.removeEventListener("scroll", onScroll);
      // The last scroll may still be waiting on a frame; record it now rather
      // than losing the reader's position to a page change.
      writeScope(scope, last);
    };
  }, [scope]);

  return ref;
}
