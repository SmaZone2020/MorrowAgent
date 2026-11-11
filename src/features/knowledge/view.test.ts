import { describe, expect, it } from "vitest";
import { indexKnowledge, toKnowledgeView } from "@/features/knowledge/view";
import type { PackageContent } from "@/features/library/api";

function content(): PackageContent {
  return {
    manifest: {
      id: "cn.morrow.test",
      name: "测试学习包",
      version: "1.0.0",
      description: "",
      subject: "mathematics",
      tags: ["tag-a", "tag-b"],
      author: "test",
      accent: "#123456",
      coverFile: null,
      coverAlt: null,
      focus: null,
    },
    chapters: [
      {
        id: "test.chapter.one",
        name: "第一章",
        summary: "",
        order: 1,
        pointIds: ["test.point.a", "test.point.missing", "test.point.b"],
      },
    ],
    points: [
      {
        id: "test.point.a",
        name: "A",
        chapterId: "test.chapter.one",
        summary: "摘要 A",
        body: "",
        difficulty: 2,
        examImportance: "high",
        objectives: [],
        prerequisites: [],
        tags: [],
        sources: [],
      },
      {
        id: "test.point.b",
        name: "B",
        chapterId: "test.chapter.one",
        summary: "摘要 B",
        body: "",
        difficulty: 3,
        examImportance: "low",
        objectives: [],
        prerequisites: [],
        tags: [],
        sources: [],
      },
    ],
    questions: [
      {
        id: "test.q.1",
        type: "single_choice",
        content: "题干",
        options: [
          { key: "A", content: "甲" },
          { key: "B", content: "乙" },
        ],
        answerType: "single",
        answer: ["B"],
        knowledgePoints: ["test.point.a"],
        tags: [],
        difficulty: 2,
        status: "published",
        sourceType: "original",
        sourceId: null,
        estimatedMinutes: 3,
      },
      {
        id: "test.q.2",
        type: "multiple_choice",
        content: "题干二",
        options: [
          { key: "A", content: "甲" },
          { key: "B", content: "乙" },
        ],
        answerType: "multiple",
        answer: ["A", "B"],
        knowledgePoints: ["test.point.a", "test.point.b"],
        tags: [],
        difficulty: 4,
        status: "published",
        sourceType: "original",
        sourceId: null,
        estimatedMinutes: null,
      },
    ],
    relations: [
      {
        id: "test.rel.1",
        from: "test.point.a",
        to: "test.point.b",
        type: "prerequisite",
        strength: 0.8,
      },
    ],
    tags: [],
    sources: [{ id: "src.1", title: "来源", license: "public_domain" }],
    stats: { chapters: 1, points: 2, questions: 2, relations: 1 },
  };
}

describe("toKnowledgeView", () => {
  it("carries the workspace id and manifest through", () => {
    const view = toKnowledgeView("ws-1", content());
    expect(view.workspaceId).toBe("ws-1");
    expect(view.packageId).toBe("cn.morrow.test");
    expect(view.accent).toBe("#123456");
    expect(view.tags).toEqual(["tag-a", "tag-b"]);
  });

  it("links points in both directions and never to itself", () => {
    const view = toKnowledgeView("ws-1", content());
    const a = view.points.find((point) => point.id === "test.point.a");
    const b = view.points.find((point) => point.id === "test.point.b");
    expect(a?.related).toEqual(["test.point.b"]);
    expect(b?.related).toEqual(["test.point.a"]);
  });

  it("joins a multi-select answer in option order", () => {
    const view = toKnowledgeView("ws-1", content());
    const question = view.questions.find((entry) => entry.id === "test.q.2");
    expect(question?.answer).toBe("AB");
  });

  it("drops an author-declared estimated time of null", () => {
    const view = toKnowledgeView("ws-1", content());
    expect(view.questions[0]?.estimatedMinutes).toBe(3);
    expect(view.questions[1]?.estimatedMinutes).toBeUndefined();
  });
});

describe("indexKnowledge", () => {
  it("resolves a chapter's points in the authored order and skips unknown ids", () => {
    const index = indexKnowledge(toKnowledgeView("ws-1", content()));
    const points = index.pointsOfChapter.get("test.chapter.one");
    expect(points?.map((point) => point.id)).toEqual([
      "test.point.a",
      "test.point.b",
    ]);
  });

  it("groups every question under each of its knowledge points", () => {
    const index = indexKnowledge(toKnowledgeView("ws-1", content()));
    expect(index.questionsOfPoint.get("test.point.a")?.map((q) => q.id)).toEqual([
      "test.q.1",
      "test.q.2",
    ]);
    expect(index.questionsOfPoint.get("test.point.b")?.map((q) => q.id)).toEqual([
      "test.q.2",
    ]);
  });

  it("has no entry for a point that no question mentions", () => {
    const index = indexKnowledge(toKnowledgeView("ws-1", content()));
    expect(index.questionsOfPoint.has("test.point.unknown")).toBe(false);
  });
});
