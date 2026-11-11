import { describe, expect, it } from "vitest";
import { splitMath } from "@/components/splitMath";

describe("splitMath", () => {
  it("returns one text segment when there is no maths", () => {
    expect(splitMath("纯文本")).toEqual([
      { math: false, display: false, value: "纯文本" },
    ]);
  });

  it("splits inline maths out of the prose", () => {
    expect(splitMath("设 $a=b$ 成立")).toEqual([
      { math: false, display: false, value: "设 " },
      { math: true, display: false, value: "a=b" },
      { math: false, display: false, value: " 成立" },
    ]);
  });

  it("treats a double delimiter as display maths", () => {
    expect(splitMath("$$x^2$$")).toEqual([
      { math: true, display: true, value: "x^2" },
    ]);
  });

  it("prefers the block delimiter when both open at the same index", () => {
    expect(splitMath("$$a$$").map((segment) => segment.display)).toEqual([true]);
  });

  it("handles several inline runs", () => {
    const values = splitMath("$a$ 与 $b$");
    expect(values.filter((segment) => segment.math)).toHaveLength(2);
  });

  it("keeps an unclosed delimiter as text instead of dropping it", () => {
    expect(splitMath("从 $x^2 开始")).toEqual([
      { math: false, display: false, value: "从 " },
      { math: false, display: false, value: "$x^2 开始" },
    ]);
  });

  it("returns nothing for an empty string", () => {
    expect(splitMath("")).toEqual([]);
  });
});
