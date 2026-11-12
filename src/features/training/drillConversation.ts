import { createConversationStore } from "@/features/lumi/conversationCore";
import { buildPrompt, TUTOR_PROMPT } from "@/features/lumi/prompt";
import { currentProfile } from "@/features/lumi/learnerProfile";
import { currentToolContext } from "@/features/lumi/toolContext";

/**
 * The drill rail can read the package — it has to, because the composer only
 * carries `@<question id>` rather than the stem — but it must not pose
 * questions: the user is already working through one, and a second card in a
 * side rail would compete with the card on screen.
 */
const DRILL_TOOLS = [
  "read_question",
  "read_point",
  "search_knowledge",
  "get_mastery",
  "list_wrong_questions",
  "get_recent_attempts",
  // A question about a method the package does not cover is still a fair
  // question, so the rail can look it up rather than answer from memory.
  "web_search",
  "fetch_page",
];

/**
 * The drill page's own transcript. It shares the history table but not the
 * remembered conversation, so asking about a question here never pushes the
 * user's general study chat into this rail.
 */
export const useDrillConversation = createConversationStore({
  scope: "drill.lumi",
  systemPrompt: TUTOR_PROMPT,
  promptFor: (workspaceId) =>
    buildPrompt("drill", currentProfile(workspaceId)),
  idPrefix: "drill",
  tools: DRILL_TOOLS,
  context: currentToolContext,
});
