import { chapters, questions, type KnowledgeChapter } from "@/features/knowledge";

/**
 * Display metadata per subject. The bundle only carries `subjectId`, so the
 * human-facing name lives here; a new subject shows up with its id until an
 * entry is added, which is better than hiding it.
 */
const SUBJECT_META: Record<string, { name: string; tagline: string }> = {
  math_higher: {
    name: "高等数学",
    tagline: "极限、导数与微分",
  },
};

export interface SubjectSummary {
  id: string;
  name: string;
  tagline: string;
  chapters: KnowledgeChapter[];
  pointCount: number;
  questionCount: number;
}

/**
 * Subjects that actually have content. A subject with no chapters would open a
 * shelf card that leads nowhere, so it is not listed at all (D-078).
 */
export const subjects: SubjectSummary[] = Object.values(
  chapters.reduce<Record<string, KnowledgeChapter[]>>((groups, chapter) => {
    const list = groups[chapter.subjectId] ?? [];
    list.push(chapter);
    groups[chapter.subjectId] = list;
    return groups;
  }, {}),
).map((group) => {
  const id = group[0]!.subjectId;
  const pointIds = new Set(group.flatMap((chapter) => chapter.points.map((point) => point.id)));
  const meta = SUBJECT_META[id];
  return {
    id,
    name: meta?.name ?? id,
    tagline: meta?.tagline ?? "",
    chapters: group,
    pointCount: pointIds.size,
    questionCount: questions.filter((question) =>
      question.knowledgeTags.some((tag) => pointIds.has(tag)),
    ).length,
  };
});

const byId = new Map(subjects.map((subject) => [subject.id, subject]));

export function findSubject(id: string): SubjectSummary | undefined {
  return byId.get(id);
}

/** Every point in a subject, in chapter order. */
export function subjectPoints(subject: SubjectSummary) {
  return subject.chapters.flatMap((chapter) => chapter.points);
}

/** Questions belonging to a subject, matched through its knowledge tags. */
export function subjectQuestions(subject: SubjectSummary) {
  const pointIds = new Set(subjectPoints(subject).map((point) => point.id));
  return questions.filter((question) =>
    question.knowledgeTags.some((tag) => pointIds.has(tag)),
  );
}
