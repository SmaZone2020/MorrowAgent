import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HTML_CLASSES } from "@/features/rich/htmlClasses";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

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
 *
 * The prompt's vocabulary is generated from the same list, so it is covered by
 * the same check without a second copy to compare.
 */
describe("html class vocabulary", () => {
  const allowed = new Set(HTML_CLASSES);
  const generated = collectGenerated(read("../../styles/globals.css"));

  it("allows a real vocabulary rather than a handful of classes", () => {
    expect(allowed.size).toBeGreaterThan(80);
  });

  it("declares every class only once", () => {
    expect(HTML_CLASSES.length).toBe(allowed.size);
  });

  it("generates every class the sanitizer allows", () => {
    expect([...allowed].filter((name) => !generated.has(name))).toEqual([]);
  });

  it("does not ship classes the sanitizer would drop", () => {
    expect([...generated].filter((name) => !allowed.has(name))).toEqual([]);
  });
});
