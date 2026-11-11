import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { findPoint } from "@/features/knowledge";
import type { Question } from "@/features/knowledge";
import { levelOf, masteryOf } from "@/features/training/mastery";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import { workspacePath } from "@/app/navigation";
import type {
  DiagnosticRun,
  DiagnosticVerdict,
} from "@/features/training/diagnosticRun";

const VERDICT_STATUS: Record<
  DiagnosticVerdict,
  "success" | "danger" | "neutral"
> = {
  correct: "success",
  wrong: "danger",
  revealed: "neutral",
};

const VERDICT_LABEL: Record<DiagnosticVerdict, string> = {
  correct: "正确",
  wrong: "错误",
  revealed: "看答案",
};

/**
 * The paper's scorecard.
 *
 * It answers two questions and nothing more: how many did I get, and which
 * points should I work on. A point that was only looked at is not scored, so
 * the count of scored questions is printed beside the correct one.
 */
export function DiagnosticResult({
  paper,
  run,
  onRestart,
}: {
  paper: Question[];
  run: DiagnosticRun;
  onRestart: () => void;
}) {
  const navigate = useNavigate();
  const index = useKnowledge();
  const workspaceId = useWorkspaceId();

  const scored = paper.filter(
    (entry) =>
      run.results[entry.id] === "correct" || run.results[entry.id] === "wrong",
  );
  const correct = paper.filter((entry) => run.results[entry.id] === "correct");
  const weakPoints = new Set(
    paper
      .filter((entry) => run.results[entry.id] === "wrong")
      .map((entry) => entry.knowledgeTags[0])
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <Panel
      title="诊断结果"
      action={
        <Button size="sm" variant="ghost" className="text-sm" onClick={onRestart}>
          重新开始
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <AnimatedBadge
            status={
              scored.length === 0
                ? "neutral"
                : correct.length === scored.length
                  ? "success"
                  : "warning"
            }
            size="sm"
            contentKey={`${correct.length}-${scored.length}`}
          >
            {scored.length === 0
              ? "没有计分题"
              : `${correct.length} / ${scored.length} 正确`}
          </AnimatedBadge>
          <span className="text-sm text-muted-foreground">
            覆盖 {new Set(paper.map((entry) => entry.knowledgeTags[0])).size}{" "}
            个知识点
          </span>
        </div>

        {weakPoints.size > 0 ? (
          <p className="text-sm leading-6 text-foreground">
            建议先练：
            {[...weakPoints]
              .map((id) => findPoint(index, id)?.name ?? id)
              .join("、")}
          </p>
        ) : null}

        <ul className="flex flex-col">
          {paper.map((entry) => {
            const verdict = run.results[entry.id] ?? "revealed";
            // One answered question is not a mastery claim; the row says
            // whether the point needs work, which is what the reader acts on.
            const mastery = masteryOf({
              pointId: entry.knowledgeTags[0] ?? "",
              attempts: verdict === "revealed" ? 0 : 1,
              correct: verdict === "correct" ? 1 : 0,
              lastAttemptAt: 0,
            });
            const needsWork = levelOf(mastery) === "learning";

            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {entry.content}
                </span>
                {needsWork ? (
                  <span className="text-sm text-muted-foreground">需巩固</span>
                ) : null}
                <AnimatedBadge
                  status={VERDICT_STATUS[verdict]}
                  size="sm"
                  contentKey={`${entry.id}-${verdict}`}
                >
                  {VERDICT_LABEL[verdict]}
                </AnimatedBadge>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="text-sm"
            onClick={() =>
              navigate(workspacePath(workspaceId, "/profile"))
            }
          >
            看知识画像
          </Button>
          <Button
            size="sm"
            className="text-sm"
            onClick={() =>
              navigate(
                weakPoints.size > 0
                  ? `${workspacePath(workspaceId, "/drill")}?point=${[...weakPoints][0]}`
                  : workspacePath(workspaceId, "/drill"),
              )
            }
          >
            去专项训练
          </Button>
        </div>
      </div>
    </Panel>
  );
}
