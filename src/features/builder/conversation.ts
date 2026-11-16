import { createConversationStore } from "@/features/lumi/conversationCore";
import { readBoard } from "@/features/builder/board";
import { needsApproval } from "@/features/builder/permission";
import { buildBuilderPrompt } from "@/features/builder/prompt";
import { BUILDER_TOOL_DEFS } from "@/features/builder/toolDefs";
import { runBuilderTool } from "@/features/builder/toolRunner";

/**
 * Builder Mode's transcript.
 *
 * It reuses the Lumi store rather than a parallel one: the loop, the parking
 * mechanism, the history list and the streaming controller are the same problem
 * on both surfaces, and only the prompt, the tools and the gate differ.
 *
 * A build's workspace is the folder it works in, so the page binds the id of
 * the chosen folder rather than one fixed name (`builderWorkspaceId`). That is
 * what lets the rail group builds by project while keeping a transcript in the
 * folder it was written for: a conversation never moves between workspaces.
 */
export const BUILDER_WORKSPACE = "builder";

/**
 * A build is many rounds: read the folder, write nine files, fill content, fix
 * a validation error, pack. Four rounds would stop halfway through the skeleton.
 */
const BUILDER_MAX_ROUNDS = 24;

export const useBuilderConversation = createConversationStore({
  scope: "builder",
  systemPrompt: "你是 Morrow Agent 的学习包构建助手。",
  // Rebuilt per request: the folder, the machine and the permission tier all
  // change while the page is open, and a prompt captured at import time would
  // describe a folder the user has already switched away from.
  promptFor: () => {
    const { folder, env, tier } = readBoard();
    return buildBuilderPrompt(folder || "（尚未选择）", env, tier);
  },
  idPrefix: "build",
  // The rail groups builds by folder, so it holds every workspace's rows; the
  // conversation it reopens is still chosen from the bound folder only.
  listAll: true,
  defs: () => BUILDER_TOOL_DEFS,
  runTool: runBuilderTool,
  // The read-only tools run without asking in either tier; a write or a command
  // parks the turn until the user decides, and the refusal travels back to the
  // model as the tool's result.
  gate: (call) => (needsApproval(call.name, readBoard().tier) ? "approve" : "run"),
  maxRounds: BUILDER_MAX_ROUNDS,
});
