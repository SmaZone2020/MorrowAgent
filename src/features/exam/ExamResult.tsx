import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/vendor/beui/components/motion/button";
import { AnimatedBadge } from "@/vendor/beui/components/motion/animated-badge";
import { Panel } from "@/components/Panel";
import { InfoHint } from "@/components/InfoHint";
import { MathText } from "@/components/MathText";
import { QuestionExplanation } from "@/features/training/QuestionExplanation";
import {
  EXAM_FULL_MARKS,
  missedQuestions,
  scoreExam,
  sectionScores,
} from "@/features/exam/paper";
import type { ExamPaper } from "@/features/exam/paper";
import type { ExamRun } from "@/features/exam/api";
import { workspacePath } from "@/app/navigation";
import { drillQuestionPath } from "@/pages/training/DrillPage";
import { useWorkspaceId } from "@/features/workspace/WorkspaceContext";

/**
 * The paper's result.
 *
 * Two numbers, not one: what the app could grade and what the reader marked.
 * A calculation cannot be compared as text, so pretending the automatic part is
 * the score would either flatter or rob the reader. The self-marking controls
 * stay on this page because the marking is part of the sitting, not a separate
 * chore on another screen.
 */
export function ExamResult({
  run,
  paper,
  onGrade,
  onRestart,
}: {
  run: ExamRun;
  paper: ExamPaper;
  onGrade: (marks: Record<string, boolean>) => void;
  onRestart: () => void;
}) {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const [marks, setMarks] = useState<Record<string, boolean>>(run.marks);
  const [openId, setOpenId] = useState<string | null>(null);

  const score = useMemo(
    () => scoreExam(paper, run.answers, marks),
    [paper, run.answers, marks],
  );
  const sections = useMemo(
    () => sectionScores(paper, run.answers, marks),
    [paper, run.answers, marks],
  );
  const missed = useMemo(
    () => missedQuestions(paper, run.answers, marks),
    [paper, run.answers, marks],
  );
  const selfAssessed = paper.slots.filter((slot) => slot.selfAssessed);
  const pending = selfAssessed.filter((slot) => !(slot.question.id in marks));

  const mark = (questionId: string, correct: boolean) => {
    const next = { ...marks, [questionId]: correct };
    setMarks(next);
    onGrade(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="考试成绩"
        action={
          <Button
            size="sm"
            variant="secondary"
            className="text-sm"
            onClick={onRestart}
          >
            再来一次
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <span className="text-4xl font-semibold tabular-nums text-foreground">
              {score.total}
            </span>
            <span className="pb-1 text-sm tabular-nums text-muted-foreground">
              / {EXAM_FULL_MARKS}
            </span>
            {paper.short.length > 0 ? (
              <AnimatedBadge
                status="warning"
                size="sm"
                contentKey={paper.short.length}
              >
                缺题，卷面 {paper.total} 分
              </AnimatedBadge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="tabular-nums">
              自动判分 {score.auto} / {score.autoTotal}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              自评 {score.manual} / {score.manualTotal}
              <InfoHint label="计算题、应用题和证明题由你自己对照答案打分。自评分数同样记进作答记录，计入掌握度。" />
            </span>
          </div>

          <ul className="flex flex-col">
            {sections.map((entry) => (
              <li
                key={entry.section.key}
                className="flex items-center gap-3 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 text-sm text-foreground">
                  {entry.section.title}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {entry.count} 题
                </span>
                <span className="w-20 shrink-0 text-right text-sm tabular-nums text-foreground">
                  {entry.score} / {entry.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {selfAssessed.length > 0 ? (
        <Panel
          title="自评"
          action={
            pending.length > 0 ? (
              <AnimatedBadge
                status="warning"
                size="sm"
                contentKey={pending.length}
              >
                还有 {pending.length} 题
              </AnimatedBadge>
            ) : (
              <AnimatedBadge status="success" size="sm" contentKey="done">
                已评完
              </AnimatedBadge>
            )
          }
        >
          <ul className="flex flex-col">
            {selfAssessed.map((slot) => {
              const marked = marks[slot.question.id];
              const open = openId === slot.question.id;
              return (
                <li
                  key={slot.question.id}
                  className="flex flex-col gap-2 border-b border-border/60 py-3 first:pt-0 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {slot.question.content}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {slot.points} 分
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-sm"
                      onClick={() => setOpenId(open ? null : slot.question.id)}
                    >
                      {open ? "收起" : "看答案"}
                    </Button>
                    <Button
                      size="sm"
                      variant={marked === false ? "primary" : "secondary"}
                      className="text-sm"
                      onClick={() => mark(slot.question.id, false)}
                    >
                      做错了
                    </Button>
                    <Button
                      size="sm"
                      variant={marked === true ? "primary" : "secondary"}
                      className="text-sm"
                      onClick={() => mark(slot.question.id, true)}
                    >
                      做对了
                    </Button>
                  </div>
                  {open ? (
                    <QuestionExplanation
                      question={slot.question}
                      verdict={marked === true ? "correct" : "wrong"}
                      scale={1}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}

      <Panel title="错题">
        {missed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            没有算错的题，去专项训练巩固一下。
          </p>
        ) : (
          <ul className="flex flex-col">
            {missed.map((question) => (
              <li
                key={question.id}
                className="flex items-center gap-3 border-b border-border/60 py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <MathText className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {question.content}
                </MathText>
                <span className="shrink-0 text-sm text-muted-foreground">
                  你的答案 {run.answers[question.id] || "空"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-sm"
                  onClick={() =>
                    navigate(drillQuestionPath(workspaceId, question.id))
                  }
                >
                  重做
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="text-sm"
          onClick={() => navigate(workspacePath(workspaceId, "/wrong-book"))}
        >
          去错题本
        </Button>
        <Button
          size="sm"
          className="text-sm"
          onClick={() => navigate(workspacePath(workspaceId, "/report"))}
        >
          看学习报告
        </Button>
      </div>
    </div>
  );
}
