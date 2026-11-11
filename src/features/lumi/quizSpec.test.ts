import { describe, expect, it } from "vitest";
import {
  isAnswerCorrect,
  isGradable,
  normalizeText,
  parseQuizRequest,
} from "@/features/lumi/quizSpec";

const single = {
  componentId: "set_1",
  questions: [
    {
      id: "q1",
      type: "single_choice",
      stem: "下列哪个是导数定义？",
      options: [
        { key: "A", content: "差商极限", correct: true },
        { key: "B", content: "定积分", correct: false },
      ],
      answer: ["A"],
    },
  ],
};

describe("parseQuizRequest", () => {
  it("reads a well-formed payload", () => {
    const request = parseQuizRequest(single);
    expect(request?.componentId).toBe("set_1");
    expect(request?.questions).toHaveLength(1);
    expect(request?.questions[0]?.options).toHaveLength(2);
    expect(request?.questions[0]?.answer).toEqual(["A"]);
  });

  it("accepts the arguments as a JSON string, which is how tools arrive", () => {
    expect(parseQuizRequest(JSON.stringify(single))?.componentId).toBe("set_1");
  });

  it("rejects a payload with no component id", () => {
    expect(parseQuizRequest({ questions: single.questions })).toBeNull();
  });

  it("rejects a set with no usable question", () => {
    expect(parseQuizRequest({ componentId: "x", questions: [{ type: "board" }] })).toBeNull();
  });

  it("derives the type from the options when the model omits it", () => {
    const request = parseQuizRequest({
      componentId: "c",
      questions: [{ id: "q1", stem: "选一个", options: [{ key: "A", content: "甲", correct: true }] }],
    });
    expect(request?.questions[0]?.type).toBe("single_choice");
  });

  it("keeps option keys unique even when the model repeats one", () => {
    const request = parseQuizRequest({
      componentId: "c",
      questions: [
        {
          id: "q1",
          type: "single_choice",
          stem: "选一个",
          options: [
            { key: "A", content: "甲", correct: true },
            { key: "A", content: "乙", correct: false },
          ],
        },
      ],
    });
    const keys = request?.questions[0]?.options.map((option) => option.key);
    expect(keys).toEqual(["A", "A'"]);
  });

  it("falls back to the correct flags when no answer list is given", () => {
    const request = parseQuizRequest({
      componentId: "c",
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          stem: "选出所有正确的",
          options: [
            { key: "A", content: "甲", correct: true },
            { key: "B", content: "乙", correct: true },
            { key: "C", content: "丙", correct: false },
          ],
        },
      ],
    });
    expect(request?.questions[0]?.answer.sort()).toEqual(["A", "B"]);
  });

  it("clamps difficulty into 1–5", () => {
    const request = parseQuizRequest({
      componentId: "c",
      questions: [{ id: "q1", type: "fill_blank", stem: "1+1", answer: ["2"], difficulty: 99 }],
    });
    expect(request?.questions[0]?.difficulty).toBe(5);
  });
});

describe("isAnswerCorrect", () => {
  const multiple = {
    id: "q2",
    type: "multiple_choice" as const,
    stem: "选出所有正确的",
    options: [
      { key: "A", content: "甲", correct: true, explanation: "" },
      { key: "B", content: "乙", correct: true, explanation: "" },
      { key: "C", content: "丙", correct: false, explanation: "" },
    ],
    answer: ["A", "B"],
    explanation: "",
    knowledgePoints: [],
    difficulty: 3,
  };

  it("需要全对，少选判错", () => {
    expect(isAnswerCorrect(multiple, ["A"])).toBe(false);
  });

  it("多选判错", () => {
    expect(isAnswerCorrect(multiple, ["A", "B", "C"])).toBe(false);
  });

  it("顺序不影响判定", () => {
    expect(isAnswerCorrect(multiple, ["B", "A"])).toBe(true);
  });

  it("填空题按归一化文本比对", () => {
    const blank = {
      ...multiple,
      type: "fill_blank" as const,
      options: [],
      answer: ["x=1"],
    };
    expect(isAnswerCorrect(blank, ["X = 1"])).toBe(true);
    expect(isAnswerCorrect(blank, ["x=2"])).toBe(false);
  });

  it("没有标准答案时一律判错", () => {
    expect(isAnswerCorrect({ ...multiple, answer: [] }, ["A"])).toBe(false);
  });

  it("画板题不参与自动判分", () => {
    expect(isGradable("board")).toBe(false);
    expect(isGradable("fill_blank")).toBe(true);
  });
});

describe("normalizeText", () => {
  it("folds full-width characters and spacing", () => {
    expect(normalizeText("　Ａ ＝ １，")).toBe("a=1,");
  });
});
