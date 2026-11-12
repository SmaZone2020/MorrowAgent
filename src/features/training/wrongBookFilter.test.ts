import { describe, expect, it } from "vitest";
import type { WrongAttempt } from "@/features/training/attempts";
import {
  EMPTY_FILTER,
  applyFilter,
  isFiltering,
  normalizeFilter,
} from "@/features/training/wrongBookFilter";

const NOW = Date.UTC(2026, 10, 12);
const DAY = 86_400_000;

function attempt(
  id: string,
  pointId: string,
  errorType: string,
  daysAgo: number,
): WrongAttempt {
  return {
    id,
    questionId: `q-${id}`,
    knowledgePointId: pointId,
    questionVersion: "1.0.0",
    questionSnapshot: "题干",
    answer: "B",
    isCorrect: false,
    createdAt: NOW - daysAgo * DAY,
    errorType,
    inkSummary: "",
    source: "",
  };
}

const ROWS = [
  attempt("a", "limit", "calculation", 1),
  attempt("b", "limit", "concept", 10),
  attempt("c", "derivative", "", 40),
];

describe("wrong book filter", () => {
  it("shows everything when nothing is set", () => {
    expect(applyFilter(ROWS, EMPTY_FILTER, NOW)).toHaveLength(3);
  });

  it("ands the kinds and keeps the package's own order", () => {
    const shown = applyFilter(
      ROWS,
      { pointIds: ["limit"], errorType: "concept", range: "all" },
      NOW,
    );
    expect(shown.map((row) => row.id)).toEqual(["b"]);
  });

  it("treats an empty error type as a real choice, not as no choice", () => {
    const shown = applyFilter(ROWS, { ...EMPTY_FILTER, errorType: "" }, NOW);
    expect(shown.map((row) => row.id)).toEqual(["c"]);
  });

  it("measures the time range from the newest attempt, not the oldest", () => {
    const shown = applyFilter(ROWS, { ...EMPTY_FILTER, range: "7" }, NOW);
    expect(shown.map((row) => row.id)).toEqual(["a"]);
    const month = applyFilter(ROWS, { ...EMPTY_FILTER, range: "30" }, NOW);
    expect(month.map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("reports whether any kind of filter is active", () => {
    expect(isFiltering(EMPTY_FILTER)).toBe(false);
    expect(isFiltering({ ...EMPTY_FILTER, range: "7" })).toBe(true);
    expect(isFiltering({ ...EMPTY_FILTER, errorType: "" })).toBe(true);
  });

  it("repairs a stored filter that predates a field", () => {
    const stored = { pointIds: ["limit"], range: "week" } as never;
    expect(normalizeFilter(stored)).toEqual({
      pointIds: ["limit"],
      errorType: null,
      range: "all",
    });
    expect(normalizeFilter(null)).toEqual(EMPTY_FILTER);
  });
});
