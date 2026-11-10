import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/** Bumped only when the on-disk shape changes in a way that needs a migration. */
export const UI_STATE_VERSION = 1;

interface UiStateFile {
  version: number;
  scopes: Record<string, unknown>;
}

const LOCAL_KEY = "morrow:ui-state";

// One in-memory copy of the whole file. Every page reads its scope from here,
// so a page mounting never has to wait on disk, and writes are merged against a
// single source of truth instead of racing each other.
let cache: UiStateFile | null = null;
let loading: Promise<UiStateFile> | null = null;
const listeners = new Set<() => void>();

function emptyState(): UiStateFile {
  return { version: UI_STATE_VERSION, scopes: {} };
}

function readLocal(): UiStateFile {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<UiStateFile>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : UI_STATE_VERSION,
      scopes: parsed.scopes && typeof parsed.scopes === "object" ? parsed.scopes : {},
    };
  } catch {
    // A corrupt entry costs one page's scroll position, not the page.
    return emptyState();
  }
}

async function readDisk(): Promise<UiStateFile> {
  if (!isTauriRuntime) return readLocal();
  try {
    const state = await invoke<UiStateFile>("ui_state_load");
    return {
      version: typeof state.version === "number" ? state.version : UI_STATE_VERSION,
      scopes: state.scopes ?? {},
    };
  } catch {
    return emptyState();
  }
}

/** Loads the file once; concurrent callers share the same read. */
export function loadUiState(): Promise<UiStateFile> {
  if (cache) return Promise.resolve(cache);
  if (loading) return loading;

  loading = readDisk().then((state) => {
    // The disk read is async, so a value may already have been written while it
    // was in flight. The live cache wins; the disk copy is only a starting point.
    if (!cache) cache = state;
    loading = null;
    return cache;
  });

  return loading;
}

/** Synchronous peek for a first paint. Returns `undefined` until loaded. */
export function peekScope<T>(scope: string): T | undefined {
  if (!cache) return undefined;
  return cache.scopes[scope] as T | undefined;
}

export function readScope<T>(scope: string, fallback: T): T {
  const stored = peekScope<T>(scope);
  return stored === undefined ? fallback : stored;
}

let flushTimer: number | undefined;
let pendingWrite = false;

function flush() {
  if (!cache) return;
  pendingWrite = false;
  const snapshot = cache;

  if (!isTauriRuntime) {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot));
    } catch {
      // Quota or a disabled storage: the session still works in memory.
    }
    return;
  }

  void invoke("ui_state_save", { state: snapshot }).catch(() => {
    // A failed write must never block the interaction that caused it. The next
    // change retries with the same in-memory state.
  });
}

/**
 * Writes one scope and schedules a debounced flush.
 *
 * Debouncing matters because the loudest callers are scroll handlers and text
 * inputs: without it, dragging a list would queue a disk write per frame.
 */
export function writeScope(scope: string, value: unknown): void {
  const state = cache ?? emptyState();
  cache = { ...state, scopes: { ...state.scopes, [scope]: value } };

  for (const listener of listeners) listener();

  if (pendingWrite) return;
  pendingWrite = true;
  flushTimer = window.setTimeout(flush, 300);
}

/** Forces the pending write out, for page teardown or window close. */
export function flushUiState(): void {
  if (flushTimer !== undefined) {
    window.clearTimeout(flushTimer);
    flushTimer = undefined;
  }
  if (pendingWrite) flush();
}

export function subscribeUiState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test seam: drops the cache so a fresh load is observable. */
export function resetUiStateCache(): void {
  cache = null;
  loading = null;
  pendingWrite = false;
  if (flushTimer !== undefined) {
    window.clearTimeout(flushTimer);
    flushTimer = undefined;
  }
}
