import { createConversationStore } from "@/features/lumi/conversationCore";
import { SYSTEM_PROMPT } from "@/features/lumi/prompt";
import { ALL_TOOL_NAMES } from "@/features/lumi/tools";
import { currentToolContext } from "@/features/lumi/toolContext";

export type {
  ConversationState,
  ConversationTurn,
} from "@/features/lumi/conversationCore";

/**
 * The Lumi page's transcript, remembered per package (D-068).
 *
 * It is the only surface that offers the full tool set: the drill rail answers
 * questions about one problem and has no business posing new ones.
 */
export const useConversation = createConversationStore({
  scope: "lumi",
  systemPrompt: SYSTEM_PROMPT,
  tools: ALL_TOOL_NAMES,
  context: currentToolContext,
});
