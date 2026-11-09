import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { MathText } from "@/components/MathText";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { findPoint, questions } from "@/features/knowledge";
import {
  forgetAttempt,
  loadWrongAttempts,
  type WrongAttempt,
} from "@/features/training/attempts";

/**
 * The wrong book is a view over answer attempts, not a separate collection:
 * a question leaves the list as soon as a later attempt on it is correct.
 */
export function WrongBookPage() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<WrongAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [],
  );

  useEffect(() => {
    void loadWrongAttempts().then((rows) => {
      setAttempts(rows);
      setLoaded(true);
    });
  }, []);

  const drop = async (questionId: string) => {
    setAttempts((rows) => rows.filter((row) => row.questionId !== questionId));
    try {
      await forgetAttempt(questionId);
    } catch {
      // Put the row back from the database instead of leaving the list out of
      // step with what is actually stored.
      void loadWrongAttempts().then(setAttempts);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
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
          <EmptyState title="还没有做错的题" />
        ) : (
          <ul className="flex flex-col">
            {attempts.map((attempt) => {
              const question = questionById.get(attempt.questionId);
              const point = findPoint(attempt.knowledgePointId);
              return (
                <li
                  key={attempt.id}
                  className="flex flex-col gap-2 border-b border-border/60 py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <MathText className="block text-sm leading-6 text-foreground">
                    {attempt.questionSnapshot}
                  </MathText>

                  {question ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        你的答案{" "}
                        <MathText className="font-medium text-foreground">
                          {attempt.answer}
                        </MathText>
                      </span>
                      <span>
                        正确答案{" "}
                        <MathText className="font-medium text-foreground">
                          {question.answer}
                        </MathText>
                      </span>
                      {point ? <span>{point.name}</span> : null}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      该题已不在当前知识包中，仅保留作答快照。
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigate(`/training/drill?question=${attempt.questionId}`)
                      }
                    >
                      去重做
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void drop(attempt.questionId)}
                    >
                      移出错题本
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
