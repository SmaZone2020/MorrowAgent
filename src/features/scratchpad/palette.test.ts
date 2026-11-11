import { describe, expect, it } from "vitest";
import {
  DEFAULT_INK_COLOR,
  INK_COLORS,
  labelOf,
  strokeColor,
  swatchOf,
} from "@/features/scratchpad/palette";

describe("ink palette", () => {
  it("stores the default nib as an empty value so it follows the theme", () => {
    expect(DEFAULT_INK_COLOR).toBe("");
    expect(strokeColor(DEFAULT_INK_COLOR, "#384248")).toBe("#384248");
    expect(strokeColor(undefined, "#e8e3da")).toBe("#e8e3da");
  });

  it("keeps a chosen colour even when the theme flips", () => {
    expect(strokeColor("#c0564a", "#e8e3da")).toBe("#c0564a");
  });

  it("resolves a swatch and a label for every entry", () => {
    for (const entry of INK_COLORS) {
      expect(swatchOf(entry.value)).toBe(entry.swatch);
      expect(labelOf(entry.value)).toBe(entry.label);
    }
  });

  it("falls back instead of throwing on an unknown value", () => {
    expect(swatchOf("#123456")).toBe("#123456");
    expect(labelOf("#123456")).toBe("墨色");
  });
});
