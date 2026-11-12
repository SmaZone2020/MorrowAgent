import { useEffect, useMemo, useState } from "react";
import { Button } from "@/vendor/beui/components/motion/button";
import { Panel } from "@/components/Panel";
import { EmptyState } from "@/components/EmptyState";
import { useScrollMemory } from "@/features/uiState";
import { workspaceScope } from "@/features/uiState/scope";
import {
  useKnowledge,
  useWorkspaceId,
} from "@/features/workspace/WorkspaceContext";
import {
  buildPaper,
  EXAM_MINUTES,
  paperFromIds,
  scoreExam,
} from "@/features/exam/paper";
import {
  gradeExam,
  loadExams,
  startExam,
  submitExam,
  type ExamRun,
} from "@/features/exam/api";
import { recordExamAttempts } from "@/features/exam/record";
import { ExamIntro } from "@/features/exam/ExamIntro";
import { ExamSession } from "@/features/exam/ExamSession";
import { ExamResult } from "@/features/exam/ExamResult";

/**
 * A mock exam, in three states: the brief, the sitting, and the result.
 *
 * The run lives in the database rather than in page state, because the clock
 * must keep running across a reload and the answers must survive one. What the
 * page keeps is only which run is on screen.
 *
 * The sitting is not wrapped in the page's padding or scroll memory: it owns the
 * whole window (see `AppShell`), because a paper with a rail and a breadcrumb
 * beside it is a page, not an exam.
 */
export function ExamPage() {
  const workspaceId = useWorkspaceId();
  const index = useKnowledge();
  const [runs, setRuns] = useState<ExamRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<ExamRun | null>(null);
  const scrollRef = useScrollMemory<HTMLDivElement>(
    workspaceScope(workspaceId, "exam.scrollTop"),
  );

  useEffect(() => {
    setLoaded(false);
    void loadExams(workspaceId).then((rows) => {
      setRuns(rows);
      setLoaded(true);
    });
  }, [workspaceId]);

  const questions = index.view.questions;

  /** The paper a run was sat on, rebuilt from the package rather than stored. */
  const paper = useMemo(
    () => (active ? paperFromIds(questions, active.questionIds) : null),
    [questions, active],
  );

  const refresh = async () => {
    const rows = await loadExams(workspaceId);
    setRuns(rows);
  };

  const start = async () => {
    const built = buildPaper(questions);
    if (built.slots.length === 0) return;
    const run = await startExam(
      workspaceId,
      built.slots.map((slot) => slot.question.id),
      EXAM_MINUTES,
    );
    if (!run) return;
    setActive(run);
    void refresh();
  };

  const submit = async (answers: Record<string, string>) => {
    if (!active || !paper) return;
    // The score at submission is the automatic part; self-marking adds to it.
    const scored = scoreExam(paper, answers, active.marks);
    const closed = await submitExam(active.id, answers, scored.total);
    if (!closed) return;
    setActive(closed);
    void refresh();
    // The attempts are written even if the reader never marks the paper, so a
    // calculation answered correctly still counts once it is marked.
    void recordExamAttempts(workspaceId, closed.id, paper, answers, closed.marks);
  };

  const grade = async (marks: Record<string, boolean>) => {
    if (!active || !paper) return;
    const scored = scoreExam(paper, active.answers, marks);
    const graded = await gradeExam(active.id, marks, scored.total);
    if (!graded) return;
    setActive(graded);
    void refresh();
    void recordExamAttempts(
      workspaceId,
      graded.id,
      paper,
      graded.answers,
      marks,
    );
  };

  if (questions.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7">
        <Panel title="模拟考试">
          <EmptyState mood="confused" title="这个学习包暂无题目" />
        </Panel>
      </div>
    );
  }

  // A sitting owns the window: no page padding, and the status bar is meant to
  // sit against the top edge.
  if (active && paper && !active.submittedAt) {
    return (
      <ExamSession
        run={active}
        paper={paper}
        onSubmit={submit}
        onExit={() => setActive(null)}
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-5 sm:p-7"
    >
      {!loaded ? (
        <Panel title="模拟考试">
          <p className="py-3 text-sm text-muted-foreground">读取中</p>
        </Panel>
      ) : active && paper ? (
        <>
          <ExamResult
            run={active}
            paper={paper}
            onGrade={grade}
            onRestart={() => setActive(null)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-sm"
              onClick={() => setActive(null)}
            >
              回到考试页
            </Button>
          </div>
        </>
      ) : (
        <ExamIntro runs={runs} onStart={start} onOpen={setActive} />
      )}
    </div>
  );
}
