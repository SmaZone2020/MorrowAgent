import { describe, expect, it } from "vitest";
import { WEB_TOOL_NAMES, withoutWebTools } from "@/features/lumi/webTools";
import type { ToolDef } from "@/features/settings/aiBridge";

const def = (name: string): ToolDef => ({
  name,
  description: "",
  parameters: { type: "object", properties: {} },
});

describe("the search switch", () => {
  const defs = [
    def("search_knowledge"),
    def("web_search"),
    def("fetch_page"),
    def("read_point"),
  ];

  it("drops both web tools when the switch is off", () => {
    const kept = withoutWebTools(defs, false) ?? [];
    expect(kept.map((tool) => tool.name)).toEqual([
      "search_knowledge",
      "read_point",
    ]);
  });

  it("leaves the list untouched when the switch is on", () => {
    expect(withoutWebTools(defs, true)).toBe(defs);
  });

  it("keeps a surface that offers no tools at all", () => {
    expect(withoutWebTools(undefined, false)).toBeUndefined();
  });

  it("turns off the pair together, so a url is never guessed", () => {
    expect(WEB_TOOL_NAMES.sort()).toEqual(["fetch_page", "web_search"]);
  });
});
