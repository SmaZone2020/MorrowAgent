import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

function collectAllowed(source: string): Set<string> {
  const block = source.split("const ALLOWED_CLASS = new Set([")[1] ?? "";
  const body = block.split("]);")[0] ?? "";
  return new Set([...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]!));
}

function collectGenerated(source: string): Set<string> {
  const groups = source
    .split("@source inline(")
    .slice(1)
    .flatMap((chunk) => [
      ...(chunk.split(");")[0] ?? "").matchAll(/"\{([^}]+)\}"/g),
    ]);
  return new Set(groups.flatMap((match) => match[1]!.split(",")));
}

/**
 * The sanitizer decides which classes survive a reply; Tailwind decides which
 * classes exist in the stylesheet. Neither file can see the other, so this test
 * is the only thing keeping them equal — a class allowed by the sanitizer but
 * missing from `@source inline` renders as unstyled markup at runtime.
 */
describe("html class vocabulary", () => {
  const allowed = collectAllowed(read("../rich/sanitizeHtml.ts"));
  const generated = collectGenerated(read("../../styles/globals.css"));

  it("allows a real vocabulary rather than a handful of classes", () => {
    expect(allowed.size).toBeGreaterThan(80);
  });

  it("generates every class the sanitizer allows", () => {
    expect([...allowed].filter((name) => !generated.has(name))).toEqual([]);
  });

  it("does not ship classes the sanitizer would drop", () => {
    expect([...generated].filter((name) => !allowed.has(name))).toEqual([]);
  });
});
