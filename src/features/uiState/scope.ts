/**
 * Every piece of interface state belongs to exactly one of three owners:
 * the app (theme, sidebar), the shelf (which card was open last) or one
 * workspace (a transcript, a drill run, a reading position).
 *
 * A workspace id is embedded in the key rather than nested inside the value so
 * the existing `usePersistedState` / `useScrollMemory` callers keep working
 * unchanged: they only ever see a scope string (MLPS §1.2).
 */
export const APP_SCOPE = "app";

export function workspaceScope(workspaceId: string, scope: string): string {
  return `ws:${workspaceId}:${scope}`;
}

export function shelfScope(scope: string): string {
  return `library:${scope}`;
}
