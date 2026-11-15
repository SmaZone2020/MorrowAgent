/**
 * What Builder Mode may do without asking.
 *
 * Two tiers, not a per-tool switch: the real question is "do I want to see every
 * write before it happens", and a learner either wants that or has decided the
 * folder is disposable. A per-call prompt for a chain of forty files would train
 * them to click through it.
 */
export type PermissionTier = "approve" | "autonomous";

export interface TierDescription {
  id: PermissionTier;
  label: string;
  /** One line, the choice itself. */
  summary: string;
  /** What actually changes, in the user's terms. */
  detail: string;
}

export const TIERS: TierDescription[] = [
  {
    id: "approve",
    label: "操作审批",
    summary: "读文件、文件夹与网页只读，其余每次都要你同意",
    detail: "Lumi 进行写文件、改文件、执行命令需要你的审批。",
  },
  {
    id: "autonomous",
    label: "自主进行",
    summary: "读写和命令都不再询问",
    detail:
      "Lumi可以在工作区文件夹里自由读、写、改、执行，适合你完全信任的临时目录",
  },
];

export function isPermissionTier(value: unknown): value is PermissionTier {
  return value === "approve" || value === "autonomous";
}

/** Tools that only read: they run in either tier without asking. */
const READ_ONLY_TOOLS = new Set([
  "dir_read",
  "file_read",
  "file2md",
  // Reading the web is a read, and the composer's search switch is already the
  // consent for it: asking again on every search would train the user to click
  // through the cards that do guard writes.
  "web_search",
  "fetch_page",
]);

export function isReadOnlyTool(name: string): boolean {
  return READ_ONLY_TOOLS.has(name);
}

/** True when this call has to wait for the user's decision. */
export function needsApproval(name: string, tier: PermissionTier): boolean {
  if (isReadOnlyTool(name)) return false;
  return tier === "approve";
}
