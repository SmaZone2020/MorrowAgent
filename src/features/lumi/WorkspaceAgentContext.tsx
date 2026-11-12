import { useToolContext } from "@/features/lumi/useToolContext";
import { useLearnerProfile } from "@/features/lumi/useLearnerProfile";

/**
 * Publishes the package to Lumi for as long as the workspace is open.
 *
 * These used to be called from the Lumi page, which was wrong in one specific
 * way: a reply keeps streaming after the learner navigates away — the store is a
 * module singleton, so the request is not tied to the component — and the very
 * next tool call would find no reader and answer 「当前学习包没有可查询的内容」.
 * A half-finished answer is worse than a slow one.
 *
 * Mounting them on the workspace shell means the tool layer and the learner
 * block describe the same package whether or not its page is on screen. The
 * drill rail still registers its own `drill` reader on top while it is open,
 * which is what keeps `currentToolContext` pointing at the newest surface.
 */
export function WorkspaceAgentContext() {
  useToolContext("lumi");
  useLearnerProfile();
  return null;
}
