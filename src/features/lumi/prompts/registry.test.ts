import { describe, expect, it } from "vitest";
import { buildPrompt, EMPTY_PROFILE, PROMPTS } from "@/features/lumi/prompts/registry";
import { HTML_CLASSES } from "@/features/rich/htmlClasses";
import { stripMarkdown, truncateBody } from "@/features/lumi/lessonText";

describe("prompt registry", () => {
  it("registers one prompt per surface, each versioned", () => {
    expect(PROMPTS.map((spec) => spec.surface).sort()).toEqual(["drill", "lumi"]);
    for (const spec of PROMPTS) {
      expect(spec.id).toContain(spec.surface);
      expect(spec.version).toBeGreaterThan(0);
    }
  });

  it("generates the html vocabulary from the sanitizer's own list", () => {
    const prompt = buildPrompt("lumi", EMPTY_PROFILE);
    const missing = HTML_CLASSES.filter((name) => !prompt.includes(name));
    expect(missing).toEqual([]);
  });

  it("tells the model who the learner is when it knows", () => {
    const prompt = buildPrompt("lumi", {
      packageName: "微积分",
      packageVersion: "2.0.0",
      goal: {
        targetScore: 120,
        examDate: "2027-06-07",
        minutesPerDay: 45,
        difficultyFocus: [],
        note: "先把极限补上",
      },
      weakest: [
        { id: "a", name: "极限", score: 32 },
        { id: "b", name: "导数", score: null },
      ],
      teachingStyle: "socratic",
      persona: "sharp",
      nickname: "小明",
      age: 17,
    });

    expect(prompt).toContain("微积分 v2.0.0");
    expect(prompt).toContain("目标 120 分");
    expect(prompt).toContain("极限（32%）");
    expect(prompt).toContain("导数（未测）");
    expect(prompt).toContain("不直接给答案");
    expect(prompt).toContain("称呼：小明");
    expect(prompt).toContain("17 岁");
    expect(prompt).toContain("不要寒暄");
  });

  it("omits the goal block when the learner has not set one", () => {
    const prompt = buildPrompt("lumi", EMPTY_PROFILE);
    expect(prompt).not.toContain("学习目标：");
    expect(prompt).not.toContain("最薄弱的几个知识点");
  });

  it("keeps the drill variant from posing new questions", () => {
    const prompt = buildPrompt("drill", EMPTY_PROFILE);
    expect(prompt).not.toContain("ask_questions");
    expect(prompt).toContain("专项训练");
  });
});

describe("lesson text", () => {
  it("strips markup so a keyword search does not match syntax", () => {
    const body = "## 一、定义\n\n![图](media/a.png) 设 $f(x)$ 在 $x_0$ 可导。\n\n- 结论";
    const text = stripMarkdown(body);
    expect(text).toBe("一、定义 图 设 f(x) 在 x_0 可导。 结论");
    expect(text).not.toContain("![");
  });

  it("keeps a short body whole", () => {
    expect(truncateBody("短正文")).toBe("短正文");
  });

  it("announces a truncation instead of ending mid-sentence", () => {
    const body = `${"甲".repeat(3000)}。${"乙".repeat(3000)}`;
    const cut = truncateBody(body);
    expect(cut).toContain("（正文已截断）");
    expect(cut.length).toBeLessThan(body.length);
    expect(cut.trimEnd().endsWith("。")).toBe(false);
  });
});
