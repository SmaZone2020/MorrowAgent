import { useEffect, useState } from "react";

/**
 * The circle-blur reveal from beUI's `theme-toggle`, reimplemented for this
 * app's theme store.
 *
 * The vendored component owns its own `next-themes` state, which this app does
 * not have — appearance lives in the interface-state store. Only the view
 * transition is worth keeping, so it is lifted out verbatim: a circle clip
 * expanding from the chosen edge with a short blur that settles to sharp.
 */
export type RevealOrigin =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "bottom-up";

const STYLE_ID = "morrow-theme-reveal";

const ORIGIN: Record<RevealOrigin, string> = {
  "top-left": "0% 0%",
  "top-right": "100% 0%",
  "bottom-left": "0% 100%",
  "bottom-right": "100% 100%",
  center: "50% 50%",
  "bottom-up": "50% 100%",
};

const CSS = `
html[data-morrow-vt="circle-blur"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
html[data-morrow-vt="circle-blur"]::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: morrow-circle-blur-reveal 700ms cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes morrow-circle-blur-reveal {
  from { clip-path: circle(0% at var(--morrow-vt-origin, 50% 100%)); filter: blur(8px); }
  to   { clip-path: circle(150% at var(--morrow-vt-origin, 50% 100%)); filter: blur(0px); }
}
`;

type DocumentWithTransitions = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function useRevealStyle() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(query.matches);
    const onChange = () => setReduce(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/**
 * Paints a theme change behind a circular reveal.
 *
 * `apply` must write the DOM synchronously: the browser snapshots the page when
 * the callback returns, so a state update that repaints on the next render would
 * animate from one palette to itself. Store updates can ride along in the same
 * callback — they are idempotent with the paint.
 */
export function useThemeReveal() {
  useRevealStyle();
  const reduce = usePrefersReducedMotion();

  return (apply: () => void, origin: RevealOrigin = "bottom-up") => {
    const doc = document as DocumentWithTransitions;
    if (reduce || typeof doc.startViewTransition !== "function") {
      apply();
      return;
    }

    const root = document.documentElement;
    root.style.setProperty("--morrow-vt-origin", ORIGIN[origin]);
    root.dataset.morrowVt = "circle-blur";
    const transition = doc.startViewTransition(apply);
    void transition.finished.finally(() => {
      delete root.dataset.morrowVt;
    });
  };
}
