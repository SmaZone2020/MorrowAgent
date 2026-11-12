import { describe, expect, it } from "vitest";
import {
  referenceAt,
  referenceLabel,
  splitReferences,
} from "@/features/knowledge/reference";

const id = "calculus.limit.q.000001";

describe("referenceAt", () => {
  it("reads a question id at the start", () => {
    expect(referenceAt(`@${id}`)).toBe(id);
  });

  it("stops at the sentence's full stop", () => {
    expect(referenceAt(`@${id}.`)).toBe(id);
    expect(referenceAt(`@${id}。`)).toBe(id);
  });

  it("ignores a mention that is not a question", () => {
    expect(referenceAt("@someone")).toBeNull();
    expect(referenceAt("@")).toBeNull();
    // A point id is a reference too, but not to a question.
    expect(referenceAt("@calculus.limit.derivative")).toBeNull();
  });
});

describe("splitReferences", () => {
  it("splits prose around one reference", () => {
    expect(splitReferences(`看 ${"@"}${id} 这道题`)).toEqual([
      { kind: "text", value: "看 " },
      { kind: "reference", id },
      { kind: "text", value: " 这道题" },
    ]);
  });

  it("keeps an unresolved mention as text", () => {
    expect(splitReferences("@someone 你好")).toEqual([
      { kind: "text", value: "@someone 你好" },
    ]);
  });

  it("keeps the text after an id that ends the string", () => {
    expect(splitReferences(`@${id}`)).toEqual([{ kind: "reference", id }]);
  });

  it("handles two references in a row", () => {
    const second = "calculus.limit.q.000002";
    expect(splitReferences(`@${id} 与 @${second}`)).toEqual([
      { kind: "reference", id },
      { kind: "text", value: " 与 " },
      { kind: "reference", id: second },
    ]);
  });
});

describe("referenceLabel", () => {
  it("shows the number a reader recognises", () => {
    expect(referenceLabel(id)).toBe("000001");
    expect(referenceLabel("bare")).toBe("bare");
  });
});
