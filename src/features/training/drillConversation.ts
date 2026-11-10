import { createConversationStore } from "@/features/lumi/conversationCore";
import { TUTOR_PROMPT } from "@/features/lumi/prompt";

/**
 * The drill page's own transcript. It shares the history table but not the
 * remembered conversation, so asking about a question here never pushes the
 * user's general study chat into this rail.
 */
export const useDrillConversation = createConversationStore({
  scope: "drill.lumi",
  systemPrompt: TUTOR_PROMPT,
  idPrefix: "drill",
});
