/**
 * A build's workspace id is derived from its folder path.
 *
 * This lives apart from the folder registry in `workspaces.ts` because it is
 * pure: the registry reads the interface-state store, which needs a browser, and
 * a path-to-id function is worth testing without one.
 */

/** The last segment of a path, for a chip that has no room for the whole one. */
export function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

/** FNV-1a, enough to keep two same-named folders from sharing a group. */
function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * The stable workspace id for one folder.
 *
 * Every conversation belongs to exactly one folder and never moves, so this has
 * to be a function of the path alone: the same folder always lands in the same
 * history group, and a re-pick of it reopens the same transcripts. The readable
 * slug is only there to make a hand-inspected row legible; the hash is what
 * keeps `C:\one\app` and `D:\two\app` apart.
 */
export function builderWorkspaceId(folder: string): string {
  const path = folder.replace(/[\\/]+$/, "");
  const slug =
    folderName(path)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "folder";
  return `builder-${slug}-${fingerprint(path)}`;
}
