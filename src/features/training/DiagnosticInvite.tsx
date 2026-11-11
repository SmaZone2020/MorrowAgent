import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { LumiMood } from "@/features/lumi/LumiMood";
import { SquircleWrapper } from "@/components/SquircleWrapper";
import { workspacePath } from "@/app/navigation";
import { useHasAttempts } from "@/features/training/useHasAttempts";
import { usePersistedState } from "@/features/uiState/usePersistedState";
import { workspaceScope } from "@/features/uiState/scope";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";

/**
 * The one time Lumi admits it does not know the learner yet.
 *
 * Evidence is per package, so this is too: a fresh install asks, and a package
 * the reader has already answered in never does. "下次" is remembered in that
 * package's own scope — declining once must not mean declining in every
 * package.
 *
 * It lives on the package dashboard, where the reader lands first, and is
 * drawn on the project's squircle surface.
 */
export function DiagnosticInvite() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const hasAttempts = useHasAttempts(workspaceId);
  const [declined, setDeclined] = usePersistedState(
    workspaceScope(workspaceId, "diagnostic.inviteDeclined"),
    false,
  );

  // `null` is "still reading the record", which must not flash the card.
  if (declined || hasAttempts !== false) return null;
  // A package with no questions has nothing to measure against.
  if (index.view.questions.length === 0) return null;

  return (
    <SquircleWrapper radius={24} className="w-full">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <LumiMood state="confused" surface="card" className="size-20" />
        <p className="max-w-md text-sm leading-6 text-foreground">
          Lumi 还不太了解你对《{index.view.name}》的学习情况，需要检测一下吗？
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-sm"
            onClick={() => setDeclined(true)}
          >
            下次
          </Button>
          <Button
            size="sm"
            className="text-sm"
            onClick={() => navigate(workspacePath(workspaceId, "/diagnostic"))}
          >
            检测
          </Button>
        </div>
      </div>
    </SquircleWrapper>
  );
}
