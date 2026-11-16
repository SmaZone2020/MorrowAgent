import { useSyncExternalStore } from "react";
import { appScope } from "@/features/uiState/scope";
import { readScope, subscribeUiState, writeScope } from "@/features/uiState/store";
import { builderWorkspaceId, folderName } from "@/features/builder/workspaceId";

/**
 * The folder behind each build workspace.
 *
 * A workspace id is a hash of a path, so without this registry the rail could
 * only label a group with gibberish. It is written whenever a folder is bound,
 * and it outlives the folder on disk: a group whose directory was deleted still
 * names itself instead of showing a hash.
 */

export { builderWorkspaceId, folderName };

const FOLDERS_KEY = appScope("builder.workspaces");

/** A stable empty map: `useSyncExternalStore` compares snapshots by identity. */
const EMPTY_FOLDERS: Record<string, string> = {};

function readFolders(): Record<string, string> {
  return readScope<Record<string, string>>(FOLDERS_KEY, EMPTY_FOLDERS);
}

/** Records which folder a workspace id stands for. */
export function rememberBuilderFolder(folder: string): void {
  const id = builderWorkspaceId(folder);
  const folders = readFolders();
  if (folders[id] === folder) return;
  writeScope(FOLDERS_KEY, { ...folders, [id]: folder });
}

/** The folder behind a workspace id, or null for a row that predates the rule. */
export function builderWorkspaceFolder(workspaceId: string): string | null {
  return readFolders()[workspaceId] ?? null;
}

/**
 * The registry as live state.
 *
 * A label is read during render, and the map is filled in later — on mount, on
 * every folder switch, and by a disk read that resolves after the first paint.
 * Subscribing is what makes a group print its folder name on the frame the map
 * arrives, rather than staying a hash until something else re-renders.
 */
export function useBuilderFolders(): Record<string, string> {
  return useSyncExternalStore(subscribeUiState, readFolders, () => EMPTY_FOLDERS);
}

/** The legacy fixed id every build conversation used before folders were groups. */
export const LEGACY_BUILDER_WORKSPACE = "builder";

/** What the rail calls one build workspace. */
export function builderWorkspaceLabel(
  workspaceId: string,
  folders: Record<string, string> = readFolders(),
): string {
  const folder = folders[workspaceId] ?? builderWorkspaceFolder(workspaceId);
  if (folder) return folderName(folder);
  return workspaceId === LEGACY_BUILDER_WORKSPACE ? "未归档构建" : "未知工作区";
}

/**
 * The full path behind a build workspace, for a hover hint.
 *
 * Two projects are allowed to share a leaf name, and the rail only prints that
 * leaf — the path is what tells them apart without widening the label.
 */
export function builderWorkspaceHint(
  workspaceId: string,
  folders: Record<string, string> = readFolders(),
): string {
  return folders[workspaceId] ?? builderWorkspaceFolder(workspaceId) ?? "";
}
