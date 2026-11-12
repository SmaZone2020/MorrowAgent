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
 *
 * Restoration is deliberately lazy. Most pages fill their list from the
 * database or a file after the first paint, so at mount there is not enough
 * height to scroll anywhere; the offset is reapplied as the content grows until
 * it sticks once.
 *
 * The pane that scrolls belongs to the shell, not to the page, so it survives
 * navigation. A page with no remembered offset therefore has to return it to the
 * top explicitly: otherwise it opens wherever the previous page happened to be,
 * which is why the dashboard used to arrive halfway down.
 */
export function useScrollMemory<T extends HTMLElement>(scope: string) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const container = findScrollParent(element);
    if (!container) return;

    const saved = readScope<number>(scope, 0);
    if (saved <= 0) container.scrollTop = 0;
    let restoring = saved > 0;
    let frame = 0;
    let last = saved;

    const applyRestore = () => {
      if (!restoring) return;
      container.scrollTop = saved;
      // Once the browser accepts the offset the content is tall enough, and a
      // later layout shift must not drag the reader back to it.
      if (Math.abs(container.scrollTop - saved) <= 1) restoring = false;
    };

    const observer = new ResizeObserver(() => {
      if (!restoring) return;
      requestAnimationFrame(applyRestore);
    });
    observer.observe(element);
    requestAnimationFrame(applyRestore);

    const onScroll = () => {
      // A scroll event fired by the restore itself must not be recorded as a
      // user scroll, or a half-restored offset would overwrite the real one.
      if (restoring) return;
      last = container.scrollTop;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        writeScope(scope, last);
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      container.removeEventListener("scroll", onScroll);
      // The last scroll may still be waiting on a frame; record it now rather
      // than losing the reader's position to a page change.
      if (!restoring) writeScope(scope, last);
    };
  }, [scope]);

  return ref;
}
