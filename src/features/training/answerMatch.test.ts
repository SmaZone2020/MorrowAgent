import { describe, expect, it } from "vitest";
import { answersMatch, normalizeAnswer } from "@/features/training/answerMatch";

describe("normalizeAnswer", () => {
  it("drops the dollar signs a LaTeX answer carries", () => {
    expect(normalizeAnswer("$4$")).toBe("4");
  });

  it("turns a fraction into the way people type it", () => {
    expect(normalizeAnswer("$\\frac{3}{2}$")).toBe("3/2");
  });

  it("folds full-width punctuation into ASCII", () => {
    expect(normalizeAnswer("$a=2$，$b=-1$")).toBe("a=2,b=-1");
  });

  it("spells a set interval in the symbols a keyboard can produce", () => {
    expect(normalizeAnswer("$(1,5)\\cup(5,+\\infty)$")).toBe("(1,5)∪(5,+∞)");
  });

  it("ignores spaces and a trailing full stop", () => {
    expect(normalizeAnswer("  1  ")).toBe("1");
    expect(normalizeAnswer("4。")).toBe("4");
  });
});

describe("answersMatch", () => {
  it("accepts the same value written with and without punctuation", () => {
    expect(answersMatch("a=2,b=-1", "$a=2$，$b=-1$")).toBe(true);
  });

  it("accepts a fraction typed as a slash", () => {
    expect(answersMatch("3/2", "$\\frac{3}{2}$")).toBe(true);
  });

  it("accepts an interval typed with the Unicode union sign", () => {
    expect(answersMatch("(1,5)∪(5,+∞)", "$(1,5)\\cup(5,+\\infty)$")).toBe(true);
  });

  it("rejects an empty answer", () => {
    expect(answersMatch("   ", "$1$")).toBe(false);
  });

  it("rejects a different value", () => {
    expect(answersMatch("$\\frac{1}{3}$", "$\\frac{3}{2}$")).toBe(false);
  });
});
