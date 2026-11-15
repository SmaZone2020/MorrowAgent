import type { ToolCall } from "@/features/settings/aiBridge";
import type { PendingTurn } from "@/features/lumi/conversationCore";

/**
 * The calls of a parked turn that still need a decision.
 *
 * The transcript and the dock both read this: a call already decided keeps its
 * row in the message, and only the undecided ones float above the composer.
 */
export function pendingApprovals(pending: PendingTurn | null): ToolCall[] {
  if (!pending || pending.kind !== "approve") return [];
  return pending.calls.filter((call) => pending.results[call.id] === undefined);
}
