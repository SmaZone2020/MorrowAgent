import { useEffect } from "react";
import { useKnowledge } from "@/features/workspace/WorkspaceContext";
import { findPoint, findQuestion, questionsFor } from "@/features/knowledge";
import { attemptSnapshot, refreshAttempts } from "@/features/training/attemptCache";
import { setToolContextSource } from "@/features/lumi/toolContext";
import { stripMarkdown, truncateBody } from "@/features/lumi/lessonText";
import type { ToolContext } from "@/features/lumi/tools";

/**
 * Publishes the current package to the tool layer.
 *
 * Tools run inside a streamed reply, far from React, so they cannot call a hook
 * to ask what the package contains. Registering a plain reader here keeps the
 * conversation store free of React context while still answering from the live
 * package rather than a copy taken at mount.
 *
 * `searchText` is precomputed per point: a query arrives mid-reply and the whole
 * package's Markdown would be re-stripped on every keyword.
 */
export function useToolContext(owner: string) {
  const index = useKnowledge();
  const workspaceId = index.view.workspaceId;

  useEffect(() => {
    void refreshAttempts(workspaceId);

    const points = index.view.points.map((point) => ({
      id: point.id,
      name: point.name,
      summary: point.summary,
      searchText: `${point.name} ${point.summary} ${stripMarkdown(point.body)}`,
    }));

    const read = (): ToolContext => ({
      workspaceId,
      points,
      findPoint: (pointId) => {
        const point = findPoint(index, pointId);
        return point ? { name: point.name, summary: point.summary } : undefined;
      },
      readPoint: (pointId) => {
        const point = findPoint(index, pointId);
        if (!point) return undefined;
        return {
          name: point.name,
          summary: point.summary,
          body: truncateBody(point.body),
          objectives: point.objectives,
          prerequisites: point.prerequisites,
        };
      },
      findQuestion: (questionId) => {
        const question = findQuestion(index, questionId);
        return question
          ? {
              id: question.id,
              content: question.content,
              questionType: question.questionType,
              options: question.options,
              difficulty: question.difficulty,
              knowledgeTags: question.knowledgeTags,
            }
          : undefined;
      },
      questionsForPoint: (pointId) =>
        questionsFor(index, pointId).map((question) => ({
          id: question.id,
          content: question.content,
          questionType: question.questionType,
          answer: question.answer,
          difficulty: question.difficulty,
        })),
      stats: attemptSnapshot(workspaceId).stats,
      wrong: attemptSnapshot(workspaceId).wrong,
      recent: attemptSnapshot(workspaceId).recent,
    });

    setToolContextSource(owner, read);
    return () => setToolContextSource(owner, null);
  }, [index, owner, workspaceId]);
}
