import { createConversationStore } from "@/features/lumi/conversationCore";
import { SYSTEM_PROMPT } from "@/features/lumi/prompt";
import { currentToolContext } from "@/features/lumi/toolContext";

export type {
  ConversationState,
  ConversationTurn,
} from "@/features/lumi/conversationCore";

/**
 * The Lumi page's transcript, remembered per package (D-068).
 *
 * It is the only surface that offers tools: the drill rail answers questions
 * about one problem and has no business posing new ones.
 */
export const useConversation = createConversationStore({
  scope: "lumi",
  systemPrompt: SYSTEM_PROMPT,
  tools: true,
  context: currentToolContext,
});
