import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/vendor/beui/components/motion/animated-toast-stack";
import { useLumiActivity } from "@/features/lumi/activity";
import { workspacePath } from "@/app/navigation";

/**
 * Announces replies that finished on a page the learner was not looking at.
 *
 * The toast is hosted here, at the root, rather than on the Lumi page: the whole
 * point is that the page is gone. The activity store is the queue, this is the
 * speaker.
 *
 * Notices are consumed on arrival, so a re-render cannot announce the same reply
 * twice.
 */
export function LumiNoticeHost() {
  const navigate = useNavigate();
  const notices = useLumiActivity((state) => state.notices);
  const dismissNotice = useLumiActivity((state) => state.dismissNotice);
  const { toasts, showToast, dismissToast, clearToasts } = useAnimatedToastStack({
    defaultDuration: 6000,
    limit: 3,
  });

  // Opening the page clears the dot, which is the same act as reading it.
  const openLumi = useCallback(
    (workspaceId: string) => {
      useLumiActivity.getState().clearUnread(workspaceId);
      clearToasts();
      navigate(workspacePath(workspaceId, "/lumi"));
    },
    [clearToasts, navigate],
  );

  useEffect(() => {
    if (notices.length === 0) return;

    for (const notice of notices) {
      showToast({
        status: "success",
        title: "Lumi 回完了",
        description: notice.packageName
          ? `${notice.packageName} 的回复还在等着你看。`
          : "刚才那条回复还在等着你看。",
        action: {
          label: "去看看",
          onClick: () => openLumi(notice.workspaceId),
        },
      });
      dismissNotice(notice.id);
    }
  }, [notices, showToast, dismissNotice, openLumi]);

  return (
    <AnimatedToastStack
      toasts={toasts}
      onDismiss={dismissToast}
      position="bottom-right"
      placement="fixed"
      maxVisible={3}
    />
  );
}
