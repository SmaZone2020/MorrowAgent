import { describe, expect, it } from "vitest";
import {
  describeInk,
  inkSummaryJson,
  summarizeInk,
} from "@/features/scratchpad/inkSummary";
import type { Stroke } from "@/features/scratchpad/types";

function stroke(points: number): Stroke {
  return {
    points: Array.from({ length: points }, (_, index) => ({
      x: index,
      y: index,
      pressure: 0.5,
    })),
    width: 1,
    color: "#384248",
  };
}

describe("ink summary", () => {
  it("counts strokes and points rather than keeping the geometry", () => {
    const summary = summarizeInk([stroke(3), stroke(4)], 12.6, false);
    expect(summary).toEqual({ strokes: 2, points: 7, seconds: 13, cleared: false });
  });

  it("stores nothing for an empty pad", () => {
    expect(inkSummaryJson(summarizeInk([], 40, true))).toBe("");
  });

  it("stores JSON once there is ink", () => {
    const json = inkSummaryJson(summarizeInk([stroke(2)], 5, true));
    expect(JSON.parse(json)).toMatchObject({ strokes: 1, points: 2, cleared: true });
  });

  it("reads an empty or corrupt value as nothing, not as a blank answer", () => {
    expect(describeInk("")).toBe("");
    expect(describeInk("not json")).toBe("");
    expect(describeInk(JSON.stringify({ strokes: 0 }))).toBe("");
  });

  it("describes the work in words a model can use", () => {
    expect(describeInk(JSON.stringify({ strokes: 6, seconds: 45 }))).toBe(
      "草稿 6 笔，约 45 秒",
    );
    expect(describeInk(JSON.stringify({ strokes: 9, seconds: 150 }))).toBe(
      "草稿 9 笔，约 3 分钟",
    );
  });
});
