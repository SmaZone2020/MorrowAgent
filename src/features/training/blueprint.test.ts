import { describe, expect, it } from "vitest";
import { buildDiagnostic } from "@/features/training/blueprint";
import type { Question } from "@/features/knowledge";

function question(id: string, point: string, difficulty = 3): Question {
  return {
    id,
    content: id,
    questionType: "single_choice",
    explanation: "",
    options: [],
    answer: "A",
    images: [],
    knowledgeTags: [point],
    commonErrors: [],
    difficulty,
    sourceType: "generated",
    version: "",
  };
}

const pool: Question[] = [
  question("a1", "p.a", 1),
  question("a2", "p.a", 2),
  question("a3", "p.a", 3),
  question("b1", "p.b", 2),
  question("c1", "p.c", 4),
];

describe("buildDiagnostic", () => {
  it("covers every point before it deepens any point", () => {
    const plan = buildDiagnostic(pool, { limit: 3 });
    expect(plan.covered).toEqual(["p.a", "p.b", "p.c"]);
    expect(plan.questions.map((entry) => entry.id)).toEqual(["a1", "b1", "c1"]);
  });

  it("deepens the points that still have questions once every point is in", () => {
    const plan = buildDiagnostic(pool, { limit: 5 });
    expect(plan.questions).toHaveLength(5);
    expect(plan.questions.map((entry) => entry.id)).toEqual([
      "a1",
      "b1",
      "c1",
      "a2",
      "a3",
    ]);
  });

  it("stops at the pool size rather than padding with duplicates", () => {
    const plan = buildDiagnostic(pool, { limit: 20 });
    expect(plan.questions).toHaveLength(5);
    expect(new Set(plan.questions.map((entry) => entry.id)).size).toBe(5);
  });

  it("reports a point that has no question at all", () => {
    const plan = buildDiagnostic(pool, {
      limit: 10,
      pointIds: ["p.a", "p.empty"],
    });
    expect(plan.missing).toEqual(["p.empty"]);
    expect(plan.covered).toEqual(["p.a"]);
  });

  it("builds the same paper twice, so a rerun is comparable", () => {
    const first = buildDiagnostic(pool, { limit: 4 });
    const second = buildDiagnostic([...pool].reverse(), { limit: 4 });
    expect(second.questions.map((entry) => entry.id)).toEqual(
      first.questions.map((entry) => entry.id),
    );
  });

  it("returns an empty plan when the limit is zero", () => {
    const plan = buildDiagnostic(pool, { limit: 0 });
    expect(plan.questions).toHaveLength(0);
    expect(plan.covered).toHaveLength(0);
  });
});
