import { describe, expect, it } from "vitest";
import { chapterAxes, pickChapters, shortLabel } from "@/features/profile/radar";
import { masteryOf } from "@/features/training/mastery";
import type { KnowledgeChapter, KnowledgePoint } from "@/features/knowledge";

function chapter(id: string, pointIds: string[]): KnowledgeChapter {
  return { id, name: `第${id}章`, summary: "", order: 0, pointIds };
}

function point(id: string, importance: string): KnowledgePoint {
  return {
    id,
    name: id,
    chapterId: "c1",
    summary: "",
    body: "",
    difficulty: 3,
    examImportance: importance,
    objectives: [],
    prerequisites: [],
    tags: [],
    sources: [],
    commonErrors: [],
    images: [],
    related: [],
  };
}

function mastery(pointId: string, attempts: number, correct: number) {
  return masteryOf({ pointId, attempts, correct, lastAttemptAt: 0 });
}

describe("chapter radar", () => {
  it("puts the chapters the exam weighs most on the axes, in package order", () => {
    const chapters = [chapter("1", ["a"]), chapter("2", ["b"]), chapter("3", ["c"])];
    const points = [
      point("a", "low"),
      point("b", "critical"),
      point("c", "high"),
    ];
    expect(pickChapters(chapters, points, 2).map((entry) => entry.id)).toEqual([
      "2",
      "3",
    ]);
  });

  it("averages the chapter's points and counts a never-tested point as zero", () => {
    const chapters = [chapter("1", ["a", "b"])];
    const points = [point("a", "critical"), point("b", "critical")];
    const axes = chapterAxes(chapters, [mastery("a", 4, 4)], points);

    expect(axes).toHaveLength(1);
    // (83 + 0) / 2, not 83: four right answers smooth to 83%, and the untested
    // point still counts as a zero. Skipping it would make an untouched
    // chapter look like the strongest one.
    expect(axes[0]?.value).toBe(42);
    expect(axes[0]?.tested).toBe(1);
    expect(axes[0]?.total).toBe(2);
  });

  it("drops a chapter with no points at all rather than drawing a zero axis", () => {
    const axes = chapterAxes([chapter("1", []), chapter("2", ["a"])], [], [
      point("a", "high"),
    ]);
    expect(axes.map((axis) => axis.chapterId)).toEqual(["2"]);
  });

  it("shortens a long chapter title for the axis", () => {
    expect(shortLabel("第二章 导数与微分")).toBe("导数与微分");
    expect(shortLabel("一、函数与极限")).toBe("函数与极限");
    expect(shortLabel("第一章 函数、极限与连续的综合应用")).toBe("函数、极限与…");
  });
});
