export type {
  ContentImage,
  ImageKind,
  ImagePosition,
  KnowledgeChapter,
  KnowledgePoint,
  KnowledgeRelation,
  Question,
  QuestionOption,
} from "@/features/knowledge/types";

export type { KnowledgeIndex, KnowledgeView } from "@/features/knowledge/view";

export { indexKnowledge, toKnowledgeView } from "@/features/knowledge/view";

import type { KnowledgeIndex } from "@/features/knowledge/view";
import type {
  ContentImage,
  ImagePosition,
  KnowledgePoint,
  Question,
} from "@/features/knowledge/types";

/**
 * Pages never hold their own copy of the package, so every lookup goes through
 * the index the workspace context built once. These are plain functions rather
 * than hooks: a component that already has the index should not subscribe again.
 */
export function findPoint(
  index: KnowledgeIndex,
  pointId: string,
): KnowledgePoint | undefined {
  return index.pointsById.get(pointId);
}

export function findQuestion(
  index: KnowledgeIndex,
  questionId: string,
): Question | undefined {
  return index.questionsById.get(questionId);
}

export function questionsFor(
  index: KnowledgeIndex,
  pointId: string,
): Question[] {
  return index.questionsOfPoint.get(pointId) ?? [];
}

/** Every point in a chapter, in the order the package declared. */
export function pointsOfChapter(
  index: KnowledgeIndex,
  chapterId: string,
): KnowledgePoint[] {
  return index.pointsOfChapter.get(chapterId) ?? [];
}

/** Images attached to one anchor. Missing anchors return an empty list. */
export function imagesAt(
  images: ContentImage[] | undefined,
  position: ImagePosition,
): ContentImage[] {
  return (images ?? []).filter(
    (image) => (image.position ?? "stem") === position,
  );
}

/** Points ranked by exam importance, which is how the profile sorts them. */
export function rankByImportance(points: KnowledgePoint[]): KnowledgePoint[] {
  const rank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...points].sort(
    (a, b) => (rank[a.examImportance] ?? 9) - (rank[b.examImportance] ?? 9),
  );
}
