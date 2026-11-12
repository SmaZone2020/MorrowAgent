import { createConversationStore } from "@/features/lumi/conversationCore";
import { noteReplySettled } from "@/features/lumi/activity";
import { usePreferences } from "@/features/settings/preferencesStore";
import { buildPrompt, SYSTEM_PROMPT } from "@/features/lumi/prompt";
import { currentProfile } from "@/features/lumi/learnerProfile";
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
 *
 * The system prompt is built per request rather than captured here, because the
 * learner block carries a goal and a weak-point list that change while the app
 * is open.
 */
export const useConversation = createConversationStore({
  scope: "lumi",
  systemPrompt: SYSTEM_PROMPT,
  promptFor: (workspaceId) =>
    buildPrompt("lumi", currentProfile(workspaceId)),
  tools: ALL_TOOL_NAMES,
  context: currentToolContext,
  // A reply keeps streaming after the learner leaves the page, because the store
  // is a module singleton. This is what tells them it arrived.
  onRequestSettled: (workspaceId) => {
    const { lumiDot, lumiToast } = usePreferences.getState();
    noteReplySettled(workspaceId, { dot: lumiDot, toast: lumiToast });
  },
});
