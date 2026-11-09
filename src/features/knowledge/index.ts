import bundle from "@/features/knowledge/generated/knowledge.json";

export interface KnowledgePoint {
  id: string;
  name: string;
  chapterId: string;
  description: string;
  objectives: string[];
  prerequisites: string[];
  related: string[];
  difficulty: string;
  examImportance: string;
  examLevels: string[];
  commonErrors: string[];
}

export interface KnowledgeChapter {
  id: string;
  name: string;
  subjectId: string;
  version: string;
  points: KnowledgePoint[];
}

export interface QuestionOption {
  key: string;
  content: string;
}

export interface Question {
  id: string;
  content: string;
  questionType: string;
  difficulty: string;
  examLevel?: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  knowledgeTags: string[];
  solutionMethods: string[];
  commonErrors: { errorType: string; description: string }[];
  estimatedMinutes?: number;
  sourceType: string;
  sourceReference?: string;
}

export interface KnowledgeBundle {
  chapters: KnowledgeChapter[];
  questions: Question[];
}

// The bundle is generated at build time by scripts/buildKnowledge.mjs and is
// typed at this boundary, so a hand-edited YAML field cannot silently reach the
// UI under a name it never had.
const data = bundle as unknown as KnowledgeBundle;

export const chapters = data.chapters;
export const questions = data.questions;

export const knowledgePoints: KnowledgePoint[] = chapters.flatMap(
  (chapter) => chapter.points,
);

const pointsById = new Map(knowledgePoints.map((point) => [point.id, point]));

export function findPoint(id: string): KnowledgePoint | undefined {
  return pointsById.get(id);
}

export function questionsFor(pointId: string): Question[] {
  return questions.filter((question) =>
    question.knowledgeTags.includes(pointId),
  );
}

/** Points grouped by exam importance, which is how the dashboard ranks them. */
export function weakPointCandidates(): KnowledgePoint[] {
  const rank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...knowledgePoints].sort(
    (a, b) => (rank[a.examImportance] ?? 9) - (rank[b.examImportance] ?? 9),
  );
}
