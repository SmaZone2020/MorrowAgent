import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface BreadcrumbActionsValue {
  target: HTMLElement | null;
  setTarget: (node: HTMLElement | null) => void;
}

const BreadcrumbActionsContext =
  createContext<BreadcrumbActionsValue | null>(null);

/**
 * A page-level control that belongs beside the trail rather than in the page.
 *
 * The drill's point filter is the only user: it is a view setting, not content,
 * and standing at the top of the page it pushed the question card down by a
 * whole row. In the bar it sits on the same line as the trail, which is where a
 * "what am I looking at" control belongs.
 *
 * It is a slot rather than a prop because the bar is rendered by the shell and
 * the filter is owned by one page: threading it through would make the shell
 * know about the drill.
 */
export function BreadcrumbActionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);

  return (
    <BreadcrumbActionsContext.Provider value={value}>
      {children}
    </BreadcrumbActionsContext.Provider>
  );
}

/**
 * Where the bar ends.
 *
 * The ref callback is constant for the life of the slot: a callback that
 * changed identity would be detached and reattached on every render, and each
 * reattach is a state write — the usual way a ref-slot turns into a loop.
 */
export function BreadcrumbActionsSlot() {
  const setTarget = useContext(BreadcrumbActionsContext)?.setTarget;
  const latest = useRef(setTarget);
  latest.current = setTarget;

  const attach = useCallback((node: HTMLDivElement | null) => {
    latest.current?.(node);
  }, []);

  return (
    <div
      ref={attach}
      className="ml-auto flex min-w-0 shrink-0 items-center gap-2 pl-3"
    />
  );
}

/**
 * Puts `children` at the right edge of the breadcrumb bar.
 *
 * Outside a workspace there is no bar to portal into, so this renders nothing
 * rather than a second copy inside the page.
 */
export function BreadcrumbActions({ children }: { children: ReactNode }) {
  const target = useContext(BreadcrumbActionsContext)?.target ?? null;
  // The first render happens before the bar has reported its node, so this
  // returns nothing once and then re-renders with the slot attached.
  if (!target) return null;
  return createPortal(children, target);
}
