import { describe, expect, it } from "vitest";
import {
  BUILDER_TOOL_DEFS,
  BUILDER_TOOL_NAMES,
  INSTALL_PACKAGE,
  TOOL_LABEL,
} from "@/features/builder/toolDefs";
import {
  isReadOnlyTool,
  needsApproval,
  type PermissionTier,
} from "@/features/builder/permission";

/** Keeps the literal type honest: `needsApproval` takes a tier, not a string. */
const tiers: PermissionTier[] = ["approve", "autonomous"];

/**
 * The tool surface is a contract: the prompt describes these names, the runner
 * switches on them and the approval gate classifies them. A def added here and
 * forgotten anywhere else fails silently — the model calls a tool that resolves
 * to "未知工具" — so the three lists are checked against each other.
 */
describe("builder tool surface", () => {
  it("offers a definition and a label for every tool name", () => {
    const defined = BUILDER_TOOL_DEFS.map((def) => def.name).sort();
    expect(defined).toEqual([...BUILDER_TOOL_NAMES].sort());
    for (const name of BUILDER_TOOL_NAMES) {
      expect(TOOL_LABEL[name], `${name} has no label`).toBeTruthy();
    }
  });

  it("describes install_package without requiring a path", () => {
    const def = BUILDER_TOOL_DEFS.find((entry) => entry.name === INSTALL_PACKAGE);
    expect(def).toBeDefined();
    // The whole workspace is a valid package root, so nothing is required.
    expect(def?.parameters.required ?? []).toEqual([]);
  });
});

describe("install_package needs a decision in both tiers", () => {
  it("is not read-only", () => {
    expect(isReadOnlyTool(INSTALL_PACKAGE)).toBe(false);
  });

  it("still asks when the session is autonomous", () => {
    // Writing into the package store is not a change to the folder the user
    // handed over, so the autonomous tier does not cover it.
    for (const tier of tiers) {
      expect(needsApproval(INSTALL_PACKAGE, tier)).toBe(true);
    }
  });

  it("leaves ordinary writes to the tier", () => {
    expect(needsApproval("file_write", "autonomous")).toBe(false);
    expect(needsApproval("file_write", "approve")).toBe(true);
  });
});
