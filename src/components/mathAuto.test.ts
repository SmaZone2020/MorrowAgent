import { describe, expect, it } from "vitest";
import { autoMath } from "@/components/mathAuto";

describe("autoMath", () => {
  it("leaves text that already carries delimiters alone", () => {
    expect(autoMath("$y = x^2$")).toBe("$y = x^2$");
    expect(autoMath("混合 $a$ 和 $b$")).toBe("混合 $a$ 和 $b$");
  });

  it("wraps a formula run but not the prose around it", () => {
    expect(autoMath("函数 y = x^2 的图像")).toBe("函数 $y = x^2$ 的图像");
    expect(autoMath("斜率 k = 2")).toBe("斜率 $k = 2$");
  });

  it("keeps a bare letter as text", () => {
    expect(autoMath("已知 x")).toBe("已知 x");
    expect(autoMath("曲线 A")).toBe("曲线 A");
  });

  it("converts unicode superscripts to a latex exponent", () => {
    expect(autoMath("y = x²")).toBe("$y = x^{2}$");
    expect(autoMath("e⁻¹")).toBe("$e^{-1}$");
  });

  it("rewrites a parenthesised exponent as a group", () => {
    expect(autoMath("y = e^(-k·x)")).toBe("$y = e^{-k\\cdot x}$");
  });

  it("maps the multiplication and division signs", () => {
    expect(autoMath("a × b ÷ c")).toBe("$a \\times b \\div c$");
  });

  it("keeps the spaces that surrounded the formula outside the delimiters", () => {
    expect(autoMath("a = b 中")).toBe("$a = b$ 中");
    expect(autoMath("设 a = b")).toBe("设 $a = b$");
  });

  it("collapses the whitespace inside a run", () => {
    expect(autoMath("a  =   b")).toBe("$a = b$");
  });

  it("returns an empty string unchanged", () => {
    expect(autoMath("")).toBe("");
  });
});
