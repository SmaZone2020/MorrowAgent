import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadUiState,
  peekScope,
  readScope,
  subscribeUiState,
  writeScope,
} from "@/features/uiState/store";

/**
 * A piece of page state that survives reloads and restarts.
 *
 * `initial` is only used when the scope has never been written. The value is
 * read synchronously on the first render when the file is already in memory, so
 * a returning user does not see the default for a frame and then a jump.
 */
export function usePersistedState<T>(
  scope: string,
  initial: T,
): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() =>
    peekScope<T>(scope) === undefined ? initial : readScope(scope, initial),
  );
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  // Only adopt the stored value while this hook has not been touched yet: a
  // late disk read must not overwrite something the user just typed.
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (dirtyRef.current || cancelled) return;
      const stored = peekScope<T>(scopeRef.current);
      if (stored !== undefined) setValue(stored);
    };

    if (peekScope<T>(scopeRef.current) === undefined) {
      void loadUiState().then(sync);
    }
    // Another window or a later write to the same scope should be reflected.
    const unsubscribe = subscribeUiState(sync);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      dirtyRef.current = true;
      setValue((current) => {
        const resolved =
          typeof next === "function"
            ? (next as (value: T) => T)(current)
            : next;
        writeScope(scopeRef.current, resolved);
        return resolved;
      });
    },
    [],
  );

  return [value, update];
}
