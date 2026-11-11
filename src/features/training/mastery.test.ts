import { describe, expect, it } from "vitest";
import {
  coverageOf,
  levelOf,
  masteryOf,
  weakestFirst,
} from "@/features/training/mastery";

describe("masteryOf", () => {
  it("keeps a single correct answer away from 100%", () => {
    const mastery = masteryOf({
      pointId: "p",
      attempts: 1,
      correct: 1,
      lastAttemptAt: 0,
    });
    expect(mastery.score).toBe(67);
    expect(mastery.confidence).toBeLessThan(0.2);
  });

  it("keeps a single wrong answer away from 0%", () => {
    const mastery = masteryOf({
      pointId: "p",
      attempts: 1,
      correct: 0,
      lastAttemptAt: 0,
    });
    expect(mastery.score).toBe(33);
  });

  it("rises with repeated evidence", () => {
    const mastery = masteryOf({
      pointId: "p",
      attempts: 6,
      correct: 5,
      lastAttemptAt: 0,
    });
    expect(mastery.score).toBe(75);
    expect(mastery.confidence).toBeCloseTo(0.5, 5);
  });

  it("clamps a correct count that exceeds the attempt count", () => {
    const mastery = masteryOf({
      pointId: "p",
      attempts: 2,
      correct: 9,
      lastAttemptAt: 0,
    });
    expect(mastery.correct).toBe(2);
    expect(mastery.score).toBe(75);
  });
});

describe("levelOf", () => {
  it("does not call one right answer mastered", () => {
    const mastery = masteryOf({
      pointId: "p",
      attempts: 1,
      correct: 1,
      lastAttemptAt: 0,
    });
    expect(levelOf(mastery)).toBe("learning");
  });

  it("calls a well-answered point mastered once there is evidence", () => {
    const mastery = masteryOf({
      pointId: "p",
      attempts: 20,
      correct: 19,
      lastAttemptAt: 0,
    });
    expect(levelOf(mastery)).toBe("solid");
  });

  it("reports an untouched point as untested", () => {
    const mastery = masteryOf({
      pointId: "p",
      attempts: 0,
      correct: 0,
      lastAttemptAt: 0,
    });
    expect(levelOf(mastery)).toBe("untouched");
  });
});

describe("weakestFirst", () => {
  it("puts an untested point ahead of a strong one", () => {
    const untested = masteryOf({
      pointId: "a",
      attempts: 0,
      correct: 0,
      lastAttemptAt: 0,
    });
    const strong = masteryOf({
      pointId: "b",
      attempts: 10,
      correct: 9,
      lastAttemptAt: 0,
    });
    expect(weakestFirst([strong, untested])[0]?.pointId).toBe("a");
  });

  it("orders tested points by score", () => {
    const weak = masteryOf({
      pointId: "weak",
      attempts: 6,
      correct: 1,
      lastAttemptAt: 0,
    });
    const mid = masteryOf({
      pointId: "mid",
      attempts: 6,
      correct: 4,
      lastAttemptAt: 0,
    });
    expect(weakestFirst([mid, weak]).map((entry) => entry.pointId)).toEqual([
      "weak",
      "mid",
    ]);
  });
});

describe("coverageOf", () => {
  it("counts only points with at least one attempt", () => {
    const tested = masteryOf({
      pointId: "a",
      attempts: 1,
      correct: 0,
      lastAttemptAt: 0,
    });
    const untouched = masteryOf({
      pointId: "b",
      attempts: 0,
      correct: 0,
      lastAttemptAt: 0,
    });
    expect(coverageOf([tested, untouched], 4)).toBe(25);
  });

  it("returns zero for an empty package instead of dividing by zero", () => {
    expect(coverageOf([], 0)).toBe(0);
  });
});
