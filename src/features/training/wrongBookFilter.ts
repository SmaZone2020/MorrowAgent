import type { WrongAttempt } from "@/features/training/attempts";

/** How far back the wrong book looks. `all` is not a range, it is no filter. */
export const TIME_RANGES = ["all", "7", "30"] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export const TIME_RANGE_LABEL: Record<TimeRange, string> = {
  all: "全部时间",
  "7": "近 7 天",
  "30": "近 30 天",
};

export interface WrongBookFilter {
  /** Knowledge point ids; empty means every point. */
  pointIds: string[];
  /**
   * One error type id, or null for every reason. An empty string is a real
   * value here: it selects the attempts nobody has classified yet.
   */
  errorType: string | null;
  range: TimeRange;
}

export const EMPTY_FILTER: WrongBookFilter = {
  pointIds: [],
  errorType: null,
  range: "all",
};

const DAY = 86_400_000;

/**
 * Narrows the wrong book without touching the stored list.
 *
 * The three kinds are ANDed: picking a point, a reason and a window means all
 * three must hold. A kind left untouched does not participate, so the default
 * state is the whole list rather than nothing.
 */
export function applyFilter(
  attempts: WrongAttempt[],
  filter: WrongBookFilter,
  now = Date.now(),
): WrongAttempt[] {
  const safe = normalizeFilter(filter);
  const points = new Set(safe.pointIds);
  const since =
    safe.range === "all" ? null : now - Number(safe.range) * DAY;

  return attempts.filter((attempt) => {
    if (points.size > 0 && !points.has(attempt.knowledgePointId)) return false;
    if (safe.errorType !== null && attempt.errorType !== safe.errorType) {
      return false;
    }
    if (since !== null && attempt.createdAt < since) return false;
    return true;
  });
}

/**
 * A stored filter predates the current shape whenever a field is added, and the
 * ui-state file is user-writable. Filling the gaps here means the page never
 * has to guard every read.
 */
export function normalizeFilter(
  filter: Partial<WrongBookFilter> | null | undefined,
): WrongBookFilter {
  return {
    pointIds: Array.isArray(filter?.pointIds)
      ? filter.pointIds.filter((id) => typeof id === "string")
      : [],
    errorType: typeof filter?.errorType === "string" ? filter.errorType : null,
    range: TIME_RANGES.includes(filter?.range as TimeRange)
      ? (filter?.range as TimeRange)
      : "all",
  };
}

/** True when any kind of filter is active, which is what the reset button reads. */
export function isFiltering(filter: WrongBookFilter): boolean {
  const safe = normalizeFilter(filter);
  return (
    safe.pointIds.length > 0 ||
    safe.errorType !== null ||
    safe.range !== "all"
  );
}
