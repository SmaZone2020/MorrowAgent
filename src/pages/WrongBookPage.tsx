import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { LoadingLine } from "@/components/LoadingLine";
import { MathText } from "@/components/MathText";
import { Modal } from "@/components/Modal";
import { findPoint } from "@/features/knowledge";
import { usePersistedState, useScrollMemory } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import { writeScope } from "@/features/uiState/store";
import { workspacePath } from "@/app/navigation";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import {
  forgetAttempt,
  loadWrongAttempts,
  setErrorType,
  type WrongAttempt,
} from "@/features/training/attempts";
import { ErrorTypeSelect } from "@/features/training/ErrorTypeSelect";
import {
  EMPTY_FILTER,
  applyFilter,
  normalizeFilter,
  type WrongBookFilter,
} from "@/features/training/wrongBookFilter";
import { WrongBookFilterBar } from "@/pages/training/WrongBookFilterBar";
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
  // The filter survives a reload: a learner who is working through "计算失误"
  // expects to come back to that list, not to the whole book.
  const [filter, setFilter] = usePersistedState<WrongBookFilter>(
    workspaceScope(workspaceId, "wrongBook.filter"),
    EMPTY_FILTER,
  );
  const active = normalizeFilter(filter);
  const [pendingDrop, setPendingDrop] = useState<WrongAttempt | null>(null);
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

  const shown = useMemo(
    () => applyFilter(attempts, active),
    [attempts, active],
  );

  const drop = async (questionId: string) => {
    setPendingDrop(null);
    setAttempts((rows) => rows.filter((row) => row.questionId !== questionId));
    try {
      await forgetAttempt(workspaceId, questionId);
    } catch {
      // Put the row back from the database instead of leaving the list out of
      // step with what is actually stored.
      void loadWrongAttempts(workspaceId).then(setAttempts);
    }
  };

  // The label is written through immediately and optimistically: it is one
  // string on one row, and waiting for the round trip would make the picker
  // feel like it ignored the click.
  const classify = async (attemptId: string, errorType: string) => {
    setAttempts((rows) =>
      rows.map((row) => (row.id === attemptId ? { ...row, errorType } : row)),
    );
    try {
      await setErrorType(workspaceId, attemptId, errorType);
    } catch {
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
          <AnimatedBadge
            status={shown.length > 0 ? "warning" : "neutral"}
            size="sm"
            contentKey={shown.length}
          >
            {shown.length} 道
          </AnimatedBadge>
        }
      >
        {!loaded ? (
          <LoadingLine className="py-4" />
        ) : attempts.length === 0 ? (
          <EmptyState
            mood="proud"
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
          <div className="flex flex-col gap-3">
            <WrongBookFilterBar
              index={index}
              attempts={attempts}
              filter={active}
              onChange={setFilter}
            />
            {shown.length === 0 ? (
              <EmptyState
                mood="confused"
                title="没有符合筛选条件的错题"
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-sm"
                    onClick={() => setFilter(EMPTY_FILTER)}
                  >
                    清除筛选
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col">
                {shown.map((attempt) => {
                  // The snapshot is what the user answered, so it survives a
                  // package update; the live question only supplies the point
                  // name.
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
                        <ErrorTypeSelect
                          value={attempt.errorType}
                          onChange={(next) => void classify(attempt.id, next)}
                          label="错误类型"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-sm"
                          onClick={() =>
                            navigate(
                              drillQuestionPath(workspaceId, attempt.questionId),
                            )
                          }
                        >
                          重做
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-sm"
                          onClick={() => {
                            // The drill's rail remembers which panel was open,
                            // so writing the scope before navigating is what
                            // opens Lumi on arrival instead of the bare rail.
                            writeScope(
                              workspaceScope(workspaceId, "drill.tool"),
                              "lumi",
                            );
                            navigate(
                              drillQuestionPath(workspaceId, attempt.questionId),
                            );
                          }}
                        >
                          问 Lumi
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-sm"
                          onClick={() => setPendingDrop(attempt)}
                        >
                          移出
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Panel>

      {/* Removing a question also deletes its whole attempt history, so it is
          the one action here that cannot be undone by answering again. */}
      <Modal
        open={pendingDrop !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDrop(null);
        }}
        title="移出错题本"
        footer={
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-sm"
              onClick={() => setPendingDrop(null)}
            >
              取消
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="text-sm"
              onClick={() =>
                pendingDrop && void drop(pendingDrop.questionId)
              }
            >
              移出
            </Button>
          </>
        }
      >
        <p className="text-sm leading-6 text-muted-foreground">
          这道题的作答记录会一起删除，掌握度统计也不再计入。以后再答错才会重新出现在这里。
        </p>
      </Modal>
    </div>
  );
}
