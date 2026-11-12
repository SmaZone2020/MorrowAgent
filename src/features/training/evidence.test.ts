import { describe, expect, it } from "vitest";
import { asErrorType, errorTypeLabel } from "@/features/training/errorTypes";
import {
  asEvidenceState,
  rankWithEvidence,
  type PointEvidence,
} from "@/features/training/evidence";
import { masteryOf } from "@/features/training/mastery";

function mastery(pointId: string, attempts: number, correct: number) {
  return masteryOf({ pointId, attempts, correct, lastAttemptAt: 0 });
}

function evidence(
  pointId: string,
  state: PointEvidence["state"],
): PointEvidence {
  return { pointId, state, note: "", updatedAt: 0 };
}

describe("error types", () => {
  it("narrows a stored value and rejects anything else", () => {
    expect(asErrorType("calculation")).toBe("calculation");
    expect(asErrorType("")).toBeNull();
    expect(asErrorType("guessed")).toBeNull();
  });

  it("reads an unclassified attempt as an invitation, not a category", () => {
    expect(errorTypeLabel("")).toBe("未标注原因");
    expect(errorTypeLabel("logic")).toBe("逻辑推理");
  });
});

describe("evidence states", () => {
  it("only accepts the four states the backend stores", () => {
    expect(asEvidenceState("user_corrected")).toBe("user_corrected");
    expect(asEvidenceState("inferred")).toBeNull();
  });

  it("moves a corrected point behind everything else without touching scores", () => {
    const ranked = [mastery("a", 4, 0), mastery("b", 0, 0), mastery("c", 4, 4)];
    const overlay = new Map([["a", evidence("a", "user_corrected")]]);

    const result = rankWithEvidence(ranked, overlay);

    expect(result.map((entry) => entry.pointId)).toEqual(["b", "c", "a"]);
    // The correction reorders the list; it never rewrites the arithmetic.
    expect(result[2]?.score).toBe(ranked[0]?.score);
  });

  it("keeps the incoming order for points with no correction", () => {
    const ranked = [mastery("a", 0, 0), mastery("b", 2, 0)];
    const result = rankWithEvidence(
      ranked,
      new Map([["b", evidence("b", "verified")]]),
    );
    expect(result.map((entry) => entry.pointId)).toEqual(["a", "b"]);
  });
});
