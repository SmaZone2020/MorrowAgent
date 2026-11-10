import type {
  ContentStats,
  PackageContent,
  PackagePoint,
  PackageQuestion,
} from "@/features/library/api";
import type {
  KnowledgeChapter,
  KnowledgePoint,
  KnowledgeRelation,
  Question,
} from "@/features/knowledge/types";

/**
 * One workspace's content, resolved into the shapes the pages read.
 *
 * The package is the only source: there is no global bundle any more, because
 * two installed packages must never leak into each other's knowledge tree or
 * question list (MLPS §1.2).
 */
export interface KnowledgeView {
  workspaceId: string;
  packageId: string;
  name: string;
  version: string;
  description: string;
  accent: string | null;
  tags: string[];
  chapters: KnowledgeChapter[];
  points: KnowledgePoint[];
  questions: Question[];
  relations: KnowledgeRelation[];
  sources: { id: string; title: string; license: string }[];
  stats: ContentStats;
}

const EMPTY_STATS: ContentStats = {
  chapters: 0,
  points: 0,
  questions: 0,
  relations: 0,
};

/** Prerequisites plus every relation pointing at the point, de-duplicated. */
function neighbours(relations: KnowledgeRelation[], pointId: string): string[] {
  const linked = new Set<string>();
  for (const relation of relations) {
    if (relation.from === pointId) linked.add(relation.to);
    else if (relation.to === pointId) linked.add(relation.from);
  }
  linked.delete(pointId);
  return [...linked];
}

function toPoint(
  point: PackagePoint,
  relations: KnowledgeRelation[],
): KnowledgePoint {
  return {
    id: point.id,
    name: point.name,
    chapterId: point.chapterId,
    summary: point.summary,
    body: point.body,
    difficulty: point.difficulty,
    examImportance: point.examImportance,
    objectives: point.objectives,
    prerequisites: point.prerequisites,
    tags: point.tags,
    sources: point.sources,
    related: neighbours(relations, point.id),
  };
}

/**
 * A question's answer arrives as a list because the format allows multi-select.
 * The UI compares one string, so a multi-select answer is joined in option
 * order — the same way the author wrote it.
 */
function answerText(question: PackageQuestion): string {
  return question.answer.join("");
}

function toQuestion(question: PackageQuestion): Question {
  return {
    id: question.id,
    content: question.content,
    questionType: question.type,
    explanation: "",
    options: question.options,
    answer: answerText(question),
    images: [],
    knowledgeTags: question.knowledgePoints,
    commonErrors: [],
    estimatedMinutes: question.estimatedMinutes ?? undefined,
    sourceType: question.sourceType,
    sourceReference: question.sourceId ?? undefined,
    version: "",
  };
}

export function toKnowledgeView(
  workspaceId: string,
  content: PackageContent,
): KnowledgeView {
  const relations: KnowledgeRelation[] = content.relations.map((relation) => ({
    id: relation.id,
    from: relation.from,
    to: relation.to,
    type: relation.type,
    strength: relation.strength,
  }));

  const points = content.points.map((point) => toPoint(point, relations));

  return {
    workspaceId,
    packageId: content.manifest.id,
    name: content.manifest.name,
    version: content.manifest.version,
    description: content.manifest.description,
    accent: content.manifest.accent,
    tags: content.manifest.tags,
    chapters: content.chapters.map((chapter) => ({
      id: chapter.id,
      name: chapter.name,
      summary: chapter.summary,
      order: chapter.order,
      pointIds: chapter.pointIds,
    })),
    points,
    questions: content.questions.map(toQuestion),
    relations,
    sources: content.sources.map((source) => ({
      id: source.id,
      title: source.title,
      license: source.license,
    })),
    stats: content.stats ?? EMPTY_STATS,
  };
}

/** Index lookups shared by the pages, built once per view. */
export interface KnowledgeIndex {
  view: KnowledgeView;
  pointsById: Map<string, KnowledgePoint>;
  questionsById: Map<string, Question>;
  pointsOfChapter: Map<string, KnowledgePoint[]>;
  questionsOfPoint: Map<string, Question[]>;
}

export function indexKnowledge(view: KnowledgeView): KnowledgeIndex {
  const pointsById = new Map(view.points.map((point) => [point.id, point]));
  const questionsById = new Map(
    view.questions.map((question) => [question.id, question]),
  );

  // Chapters own an ordered id list; resolving it here keeps every page from
  // repeating the mapping and keeps the authored order.
  const pointsOfChapter = new Map<string, KnowledgePoint[]>();
  for (const chapter of view.chapters) {
    pointsOfChapter.set(
      chapter.id,
      chapter.pointIds
        .map((id) => pointsById.get(id))
        .filter((point): point is KnowledgePoint => Boolean(point)),
    );
  }

  const questionsOfPoint = new Map<string, Question[]>();
  for (const question of view.questions) {
    for (const tag of question.knowledgeTags) {
      const list = questionsOfPoint.get(tag) ?? [];
      list.push(question);
      questionsOfPoint.set(tag, list);
    }
  }

  return { view, pointsById, questionsById, pointsOfChapter, questionsOfPoint };
}
