import { describe, expect, it } from "vitest";
import {
  EXAM_FULL_MARKS,
  EXAM_MINUTES,
  buildPaper,
  formatClock,
  missedQuestions,
  paperFromIds,
  remainingSeconds,
  scoreExam,
  sectionScores,
  unanswered,
} from "@/features/exam/paper";
import type { Question } from "@/features/knowledge";

function question(
  id: string,
  type: string,
  answer: string,
  difficulty = 3,
): Question {
  return {
    id,
    content: `题干 ${id}`,
    questionType: type,
    explanation: "",
    options:
      type === "single_choice"
        ? [
            { key: "A", content: "1" },
            { key: "B", content: "2" },
          ]
        : [],
    answer,
    images: [],
    knowledgeTags: ["limit"],
    commonErrors: [],
    difficulty,
    sourceType: "generated",
    version: "1.0.0",
  };
}

describe("exam paper", () => {
  it("matches the real paper's structure and total", () => {
    expect(EXAM_MINUTES).toBe(120);
    expect(EXAM_FULL_MARKS).toBe(150);
  });

  it("fills each section and never repeats a question", () => {
    const pool = [
      ...Array.from({ length: 6 }, (_, index) =>
        question(`c${index}`, "single_choice", "A"),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        question(`b${index}`, "fill_blank", "1"),
      ),
    ];
    const paper = buildPaper(pool);
    const ids = paper.slots.map((slot) => slot.question.id);
    expect(new Set(ids).size).toBe(ids.length);
    // 5 of the 6 choices, all 3 blanks, nothing for the empty sections.
    expect(paper.slots.filter((slot) => slot.sectionKey === "choice")).toHaveLength(5);
    expect(paper.slots.filter((slot) => slot.sectionKey === "blank")).toHaveLength(3);
    expect(paper.short.map((entry) => entry.sectionKey)).toEqual([
      "blank",
      "calculation",
      "proof",
    ]);
    expect(paper.total).toBe(5 * 5 + 3 * 5);
  });

  it("takes the hardest questions first inside a section", () => {
    const pool = [
      question("easy", "single_choice", "A", 1),
      question("hard", "single_choice", "A", 5),
    ];
    expect(buildPaper(pool).slots[0]?.question.id).toBe("hard");
  });

  it("scores what it can and leaves the rest for the reader", () => {
    const pool = [
      question("c1", "single_choice", "A"),
      question("p1", "proof", "证明略"),
    ];
    const paper = buildPaper(pool);
    const score = scoreExam(paper, { c1: "A", p1: "因为……" }, {});
    expect(score.auto).toBe(5);
    expect(score.autoTotal).toBe(5);
    expect(score.manual).toBe(0);
    // One proof question at 10 marks; the second slot stayed empty.
    expect(score.manualTotal).toBe(10);

    const marked = scoreExam(paper, { c1: "A" }, { p1: true });
    expect(marked.total).toBe(15);
  });

  it("counts a blank answer as unanswered", () => {
    const paper = buildPaper([question("c1", "single_choice", "A")]);
    expect(unanswered(paper, {})).toBe(1);
    expect(unanswered(paper, { c1: "A" })).toBe(0);
  });

  it("derives the clock from the start time instead of counting ticks", () => {
    const startedAt = Date.UTC(2026, 10, 12, 9, 0, 0);
    expect(remainingSeconds(startedAt, 120, startedAt)).toBe(7200);
    // Ten minutes of wall clock have passed, including any time the app was
    // closed: the paper does not pause.
    expect(remainingSeconds(startedAt, 120, startedAt + 600_000)).toBe(6600);
    expect(remainingSeconds(startedAt, 120, startedAt + 8_000_000)).toBe(0);
  });

  it("formats the clock with hours only when there are any", () => {
    expect(formatClock(7200)).toBe("2:00:00");
    expect(formatClock(305)).toBe("05:05");
    expect(formatClock(-4)).toBe("00:00");
  });

  it("rebuilds a sitting from its question ids", () => {
    const pool = [
      question("c1", "single_choice", "A"),
      question("b1", "fill_blank", "1"),
      question("p1", "proof", "证明略"),
    ];
    const paper = paperFromIds(pool, ["b1", "p1", "gone"]);
    // The missing id is dropped instead of leaving an empty slot on screen.
    expect(paper.slots.map((slot) => slot.question.id)).toEqual(["b1", "p1"]);
    expect(paper.slots[1]?.sectionKey).toBe("proof");
    expect(paper.total).toBe(15);
  });

  it("splits the score by section and names what was missed", () => {
    const pool = [
      question("c1", "single_choice", "A"),
      question("c2", "single_choice", "B"),
      question("p1", "proof", "证明略"),
    ];
    const paper = buildPaper(pool);
    const answers = { c1: "A", c2: "C", p1: "因为……" };
    const sections = sectionScores(paper, answers, { p1: true });
    expect(sections.map((entry) => entry.section.key)).toEqual([
      "choice",
      "proof",
    ]);
    expect(sections[0]?.score).toBe(5);
    expect(missedQuestions(paper, answers, { p1: true }).map((entry) => entry.id)).toEqual([
      "c2",
    ]);
  });
});
