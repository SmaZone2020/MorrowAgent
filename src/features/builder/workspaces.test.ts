import { describe, expect, it } from "vitest";
import { builderWorkspaceId, folderName } from "@/features/builder/workspaceId";

const A = "C:\\Users\\me\\projects\\algebra";
const B = "C:\\Users\\me\\projects\\geometry";

describe("builderWorkspaceId", () => {
  it("is stable for the same folder", () => {
    expect(builderWorkspaceId(A)).toBe(builderWorkspaceId(A));
  });

  it("differs for two folders with the same leaf name", () => {
    const left = builderWorkspaceId("C:\\one\\app");
    const right = builderWorkspaceId("D:\\two\\app");
    expect(left).not.toBe(right);
  });

  it("ignores a trailing separator, so a re-pick is the same workspace", () => {
    expect(builderWorkspaceId(`${A}\\`)).toBe(builderWorkspaceId(A));
  });

  it("keeps the row legible beside the hash", () => {
    expect(builderWorkspaceId(A)).toMatch(/^builder-algebra-[0-9a-f]{8}$/);
    expect(builderWorkspaceId(B)).toMatch(/^builder-geometry-[0-9a-f]{8}$/);
  });

  it("starts with a letter for a non-latin folder name", () => {
    // The slug is latin-only, but the id must never start with the hash, which
    // a package id prefix would reject.
    expect(builderWorkspaceId("D:\\学习包\\高等数学")).toMatch(/^builder-folder-/);
  });
});

describe("folderName", () => {
  it("prints the leaf, which is what a group header has room for", () => {
    expect(folderName("C:\\Users\\me\\projects\\algebra-notes")).toBe("algebra-notes");
    expect(folderName("/home/me/projects/algebra-notes/")).toBe("algebra-notes");
  });

  it("handles a mixed separator", () => {
    expect(folderName("C:\\Users\\me/projects/algebra")).toBe("algebra");
  });
});
