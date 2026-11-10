import { readScope, writeScope } from "@/features/uiState/store";

/** Where the recently studied subjects are remembered (D-079). */
const SCOPE = "subjects.recent";

/** How many the dashboard shelf shows. */
export const RECENT_LIMIT = 2;

/**
 * Records that the user opened a subject. Most recent first, de-duplicated, and
 * capped so the file cannot grow one entry per visit.
 */
export function rememberSubject(subjectId: string): void {
  const current = readScope<string[]>(SCOPE, []);
  const next = [subjectId, ...current.filter((id) => id !== subjectId)].slice(
    0,
    RECENT_LIMIT,
  );
  if (next.length === current.length && next.every((id, i) => id === current[i])) {
    return;
  }
  writeScope(SCOPE, next);
}

/** Most recently studied subject ids, newest first. */
export function readRecentSubjects(): string[] {
  const stored = readScope<unknown>(SCOPE, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((id): id is string => typeof id === "string").slice(0, RECENT_LIMIT);
}
