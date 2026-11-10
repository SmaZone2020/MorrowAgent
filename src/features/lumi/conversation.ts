import { createConversationStore } from "@/features/lumi/conversationCore";
import { SYSTEM_PROMPT } from "@/features/lumi/prompt";

export type {
  ConversationState,
  ConversationTurn,
} from "@/features/lumi/conversationCore";

/** The Lumi page's transcript, remembered per package (D-068). */
export const useConversation = createConversationStore({
  scope: "lumi",
  systemPrompt: SYSTEM_PROMPT,
});
