import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { MathText } from "@/components/MathText";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { findPoint } from "@/features/knowledge";
import { useScrollMemory } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import { workspacePath } from "@/app/navigation";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import {
  forgetAttempt,
  loadWrongAttempts,
  type WrongAttempt,
} from "@/features/training/attempts";
import { drillQuestionPath } from "@/pages/training/DrillPage";

/**
 * The wrong book is a view over answer attempts, not a separate collection:
 * a question leaves the list as soon as a later attempt on it is correct.
 *
 * Attempts are scoped to this package, so a question answered in another
 * workspace never appears here (MLPS §1.2).
 */
export function WrongBookPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const [attempts, setAttempts] = useState<WrongAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useScrollMemory<HTMLDivElement>(
    workspaceScope(workspaceId, "wrongBook.scrollTop"),
  );

  useEffect(() => {
    setLoaded(false);
    void loadWrongAttempts(workspaceId).then((rows) => {
      setAttempts(rows);
      setLoaded(true);
    });
  }, [workspaceId]);

  const drop = async (questionId: string) => {
    setAttempts((rows) => rows.filter((row) => row.questionId !== questionId));
    try {
      await forgetAttempt(workspaceId, questionId);
    } catch {
      // Put the row back from the database instead of leaving the list out of
      // step with what is actually stored.
      void loadWrongAttempts(workspaceId).then(setAttempts);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7"
    >
      <Panel
        title="错题本"
        action={
          isTauriRuntime ? (
            <AnimatedBadge
              status={attempts.length > 0 ? "warning" : "neutral"}
              size="sm"
              contentKey={attempts.length}
            >
              {attempts.length} 道
            </AnimatedBadge>
          ) : null
        }
      >
        {!isTauriRuntime ? (
          <EmptyState title="浏览器预览中不读取本地作答记录" />
        ) : !loaded ? (
          <p className="py-4 text-sm text-muted-foreground">读取中</p>
        ) : attempts.length === 0 ? (
          <EmptyState
            title="没有错题"
            action={
              <Button
                size="sm"
                variant="secondary"
                className="text-sm"
                onClick={() => navigate(workspacePath(workspaceId, "/drill"))}
              >
                去专项训练
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col">
            {attempts.map((attempt) => {
              // The snapshot is what the user answered, so it survives a
              // package update; the live question only supplies the point name.
              const point = attempt.knowledgePointId
                ? findPoint(index, attempt.knowledgePointId)
                : undefined;
              return (
                <li
                  key={attempt.id}
                  className="flex flex-col gap-2 border-b border-border/60 py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                      <MathText>{attempt.questionSnapshot}</MathText>
                    </span>
                    <AnimatedBadge
                      status="warning"
                      size="sm"
                      contentKey={attempt.id}
                    >
                      最近一次答错
                    </AnimatedBadge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {point ? (
                      <span className="text-sm text-muted-foreground">
                        {point.name}
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-sm"
                      onClick={() =>
                        navigate(drillQuestionPath(workspaceId, attempt.questionId))
                      }
                    >
                      重做
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-sm"
                      onClick={() => void drop(attempt.questionId)}
                    >
                      移出
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
