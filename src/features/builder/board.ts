import type { BuildEnvironment } from "@/features/builder/api";
import type { PermissionTier } from "@/features/builder/permission";

/**
 * What the current Builder Mode conversation is working on.
 *
 * This is module state rather than React state because two callers outlive a
 * render: the request loop reads it while building a prompt, and the tool
 * handlers read it while answering a call. The page is the only writer.
 */
export interface BuilderBoard {
  /** The folder the user picked; empty until they do. */
  folder: string;
  tier: PermissionTier;
  /** Probed once per folder; null while the probe is in flight or failed. */
  env: BuildEnvironment | null;
}

let board: BuilderBoard = { folder: "", tier: "approve", env: null };

export function readBoard(): BuilderBoard {
  return board;
}

export function writeBoard(patch: Partial<BuilderBoard>): void {
  board = { ...board, ...patch };
}

/**
 * The folder, or a sentence the model can read instead of a crash.
 *
 * A tool call can arrive before a folder is bound — a conversation restored from
 * disk re-enters the loop before the page has had a chance to write the board —
 * and throwing there would end the turn over something one click can fix.
 */
export function requireFolder(): string {
  if (!board.folder) {
    throw new Error("还没有选择工作区文件夹，请先在工作区面板里选择一个文件夹。");
  }
  return board.folder;
}
