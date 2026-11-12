import { describe, expect, it } from "vitest";
import { buildPlan, difficultyBand } from "@/features/plan/plan";
import { daysUntil, isoDay } from "@/features/plan/calendar";
import { defaultGoal } from "@/features/plan/types";
import { masteryOf } from "@/features/training/mastery";

function mastery(pointId: string, attempts: number, correct: number) {
  return masteryOf({ pointId, attempts, correct, lastAttemptAt: 0 });
}

const POINTS = [
  { id: "a", name: "A", examImportance: "high", difficulty: 1 },
  { id: "b", name: "B", examImportance: "high", difficulty: 3 },
  { id: "c", name: "C", examImportance: "low", difficulty: 5 },
  { id: "d", name: "D", examImportance: "low", difficulty: 2 },
  { id: "e", name: "E", examImportance: "medium", difficulty: 2 },
  { id: "f", name: "F", examImportance: "medium", difficulty: 3 },
  { id: "g", name: "G", examImportance: "high", difficulty: 4 },
];

const TESTABLE = new Set(["a", "b", "c", "e", "f", "g"]);

describe("buildPlan", () => {
  it("puts an untested point ahead of a measured weakness", () => {
    const plan = buildPlan({
      goal: defaultGoal,
      masteries: [mastery("a", 4, 0), mastery("b", 0, 0), mastery("c", 4, 4)],
      points: POINTS,
      testable: TESTABLE,
    });

    expect(plan.tasks[0]?.pointId).toBe("b");
    expect(plan.tasks[0]?.reason).toBe("untested");
    expect(plan.tasks[1]?.reason).toBe("weak");
  });

  it("never plans a point the package has no question for", () => {
    const plan = buildPlan({
      goal: defaultGoal,
      masteries: [mastery("a", 0, 0), mastery("d", 0, 0)],
      points: POINTS,
      testable: TESTABLE,
    });

    expect(plan.tasks.map((task) => task.pointId)).not.toContain("d");
    expect(plan.untestable).toEqual(["d"]);
  });

  it("asks for more points when the exam is close", () => {
    const today = new Date(2027, 5, 1);
    const far = buildPlan({
      goal: { ...defaultGoal, examDate: "2027-12-01" },
      masteries: POINTS.map((point) => mastery(point.id, 0, 0)),
      points: POINTS,
      testable: TESTABLE,
      today,
    });
    const near = buildPlan({
      goal: { ...defaultGoal, examDate: "2027-06-05" },
      masteries: POINTS.map((point) => mastery(point.id, 0, 0)),
      points: POINTS,
      testable: TESTABLE,
      today,
    });

    expect(near.daysLeft).toBe(4);
    expect(near.tasks.length).toBeGreaterThan(far.tasks.length);
  });

  it("falls back to the whole ranking when the focus band is empty", () => {
    const plan = buildPlan({
      goal: { ...defaultGoal, difficultyFocus: ["challenging"] },
      masteries: [mastery("a", 0, 0), mastery("b", 0, 0)],
      points: POINTS,
      testable: TESTABLE,
    });

    // Only "c" is challenging and it is not in the masteries here, so the band
    // is too thin to fill the list and the ranking wins.
    expect(plan.tasks.length).toBeGreaterThan(0);
  });

  it("scales the task count with the daily minutes", () => {
    const masteries = POINTS.map((point) => mastery(point.id, 0, 0));
    const short = buildPlan({
      goal: { ...defaultGoal, minutesPerDay: 15 },
      masteries,
      points: POINTS,
      testable: TESTABLE,
    });
    const long = buildPlan({
      goal: { ...defaultGoal, minutesPerDay: 90 },
      masteries,
      points: POINTS,
      testable: TESTABLE,
    });

    expect(long.tasks.length).toBeGreaterThan(short.tasks.length);
  });
});

describe("daysUntil", () => {
  it("counts whole days from today and ignores an empty date", () => {
    const today = new Date(2027, 0, 10, 23, 30);
    expect(daysUntil("2027-01-20", today)).toBe(10);
    expect(daysUntil(null, today)).toBeNull();
    expect(daysUntil("not-a-date", today)).toBeNull();
  });

  it("goes negative once the date has passed", () => {
    expect(daysUntil("2027-01-01", new Date(2027, 0, 10))).toBe(-9);
  });
});

describe("difficultyBand", () => {
  it("maps the package's 1–5 scale onto the goal's three bands", () => {
    expect(difficultyBand(1)).toBe("basic");
    expect(difficultyBand(3)).toBe("advanced");
    expect(difficultyBand(5)).toBe("challenging");
  });
});

describe("isoDay", () => {
  it("prints a local date without a timezone shift", () => {
    expect(isoDay(new Date(2027, 0, 5))).toBe("2027-01-05");
  });
});
