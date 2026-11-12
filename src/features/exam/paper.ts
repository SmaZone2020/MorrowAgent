import type { Question } from "@/features/knowledge";
import { answersMatch } from "@/features/training/answerMatch";

/**
 * The paper's shape, taken from the 2021 真题.
 *
 * A mock exam is only useful if it feels like the real thing: the same four
 * sections, the same per-question marks, the same 150 points and 120 minutes.
 * The package rarely has enough questions to fill every slot, so a section can
 * come up short — the paper says so rather than silently shrinking the total.
 */
export interface ExamSection {
  key: string;
  title: string;
  /** Question types this section draws from, in preference order. */
  types: string[];
  /** Slots the real paper has. */
  slots: number;
  /** Marks per question. */
  points: number;
  /** A calculation or proof is marked by the reader, not by the app. */
  selfAssessed: boolean;
}

export const EXAM_SECTIONS: ExamSection[] = [
  {
    key: "choice",
    title: "一、选择题",
    types: ["single_choice"],
    slots: 5,
    points: 5,
    selfAssessed: false,
  },
  {
    key: "blank",
    title: "二、填空题",
    types: ["fill_blank"],
    slots: 5,
    points: 5,
    selfAssessed: false,
  },
  {
    key: "calculation",
    title: "三、计算题",
    types: ["calculation"],
    slots: 10,
    points: 8,
    selfAssessed: true,
  },
  {
    key: "proof",
    title: "四、应用题与证明题",
    types: ["proof", "application", "short_answer"],
    slots: 2,
    points: 10,
    selfAssessed: true,
  },
];

export const EXAM_MINUTES = 120;
export const EXAM_FULL_MARKS = EXAM_SECTIONS.reduce(
  (sum, section) => sum + section.slots * section.points,
  0,
);

export interface PaperSlot {
  question: Question;
  sectionKey: string;
  points: number;
  selfAssessed: boolean;
}

export interface ExamPaper {
  slots: PaperSlot[];
  /** Slots the package could not fill, per section key. */
  short: { sectionKey: string; missing: number }[];
  /** Marks the assembled paper is worth, which is the full 150 when it is full. */
  total: number;
}

/** Hardest first inside a section: the easy ones are worth the same marks. */
function byDifficultyDescending(a: Question, b: Question): number {
  if (a.difficulty !== b.difficulty) return b.difficulty - a.difficulty;
  return a.id.localeCompare(b.id);
}

/**
 * Assembles the paper.
 *
 * Questions are taken hardest-first so a short section still tests the material
 * the exam actually weighs, and each question appears at most once: a paper
 * that repeats a question is not a paper.
 */
export function buildPaper(questions: Question[]): ExamPaper {
  const taken = new Set<string>();
  const slots: PaperSlot[] = [];
  const short: ExamPaper["short"] = [];

  for (const section of EXAM_SECTIONS) {
    const pool = questions
      .filter(
        (question) =>
          section.types.includes(question.questionType) && !taken.has(question.id),
      )
      .sort(byDifficultyDescending);
    const picked = pool.slice(0, section.slots);
    for (const question of picked) {
      taken.add(question.id);
      slots.push({
        question,
        sectionKey: section.key,
        points: section.points,
        selfAssessed: section.selfAssessed,
      });
    }
    if (picked.length < section.slots) {
      short.push({ sectionKey: section.key, missing: section.slots - picked.length });
    }
  }

  return {
    slots,
    short,
    total: slots.reduce((sum, slot) => sum + slot.points, 0),
  };
}

export function sectionOf(key: string): ExamSection | undefined {
  return EXAM_SECTIONS.find((section) => section.key === key);
}

/** The section a question type belongs to; undefined for an unplaced type. */
export function sectionOfType(questionType: string): ExamSection | undefined {
  return EXAM_SECTIONS.find((section) => section.types.includes(questionType));
}

/**
 * Rebuilds a paper from the question ids a sitting stored.
 *
 * The run keeps ids, not slots, because the package is the source of truth: a
 * later edit to a question's marks must not be frozen into an old paper. The
 * section is recovered from the question's type, which is exactly how it was
 * chosen in the first place, so a resumed paper matches the one that started.
 */
export function paperFromIds(questions: Question[], ids: string[]): ExamPaper {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const slots: PaperSlot[] = [];
  const filled = new Map<string, number>();

  for (const id of ids) {
    const question = byId.get(id);
    if (!question) continue;
    const section = sectionOfType(question.questionType);
    if (!section) continue;
    filled.set(section.key, (filled.get(section.key) ?? 0) + 1);
    slots.push({
      question,
      sectionKey: section.key,
      points: section.points,
      selfAssessed: section.selfAssessed,
    });
  }

  const short = EXAM_SECTIONS.map((section) => ({
    sectionKey: section.key,
    missing: section.slots - (filled.get(section.key) ?? 0),
  })).filter((entry) => entry.missing > 0);

  return {
    slots,
    short,
    total: slots.reduce((sum, slot) => sum + slot.points, 0),
  };
}

/**
 * What the app can score by itself.
 *
 * A calculation's answer cannot be compared as text — `3/2` and `\frac{3}{2}`
 * are the same work — so those points only count once the reader marks them.
 * The score therefore reports both halves, and the page shows which is which
 * instead of pretending the number is final.
 */
export interface ExamScore {
  auto: number;
  /** Points available from questions the app can grade. */
  autoTotal: number;
  /** Points already awarded by the reader. */
  manual: number;
  manualTotal: number;
  total: number;
}

export function scoreExam(
  paper: ExamPaper,
  answers: Record<string, string>,
  marks: Record<string, boolean>,
): ExamScore {
  let auto = 0;
  let autoTotal = 0;
  let manual = 0;
  let manualTotal = 0;

  for (const slot of paper.slots) {
    if (slot.selfAssessed) {
      manualTotal += slot.points;
      if (marks[slot.question.id] === true) manual += slot.points;
      continue;
    }
    autoTotal += slot.points;
    const given = answers[slot.question.id] ?? "";
    if (given && answersMatch(given, slot.question.answer)) auto += slot.points;
  }

  return { auto, autoTotal, manual, manualTotal, total: auto + manual };
}

/** One section's share of the score, for the result page's breakdown. */
export interface SectionScore {
  section: ExamSection;
  score: number;
  total: number;
  /** Slots the assembled paper actually had in this section. */
  count: number;
}

export function sectionScores(
  paper: ExamPaper,
  answers: Record<string, string>,
  marks: Record<string, boolean>,
): SectionScore[] {
  return EXAM_SECTIONS.map((section) => {
    const slots = paper.slots.filter((slot) => slot.sectionKey === section.key);
    let score = 0;
    for (const slot of slots) {
      if (slot.selfAssessed) {
        if (marks[slot.question.id] === true) score += slot.points;
        continue;
      }
      const given = answers[slot.question.id] ?? "";
      if (given && answersMatch(given, slot.question.answer)) score += slot.points;
    }
    return {
      section,
      score,
      total: slots.reduce((sum, slot) => sum + slot.points, 0),
      count: slots.length,
    };
  }).filter((entry) => entry.count > 0);
}

/** Which objective questions were answered wrong, for the result's redo list. */
export function missedQuestions(
  paper: ExamPaper,
  answers: Record<string, string>,
  marks: Record<string, boolean>,
): Question[] {
  return paper.slots
    .filter((slot) => {
      if (slot.selfAssessed) return marks[slot.question.id] === false;
      const given = answers[slot.question.id] ?? "";
      return given !== "" && !answersMatch(given, slot.question.answer);
    })
    .map((slot) => slot.question);
}

/** How many slots are still blank, which is what "交卷" warns about. */
export function unanswered(paper: ExamPaper, answers: Record<string, string>): number {
  return paper.slots.filter((slot) => !(answers[slot.question.id] ?? "").trim())
    .length;
}

/**
 * Seconds left, computed from the start time.
 *
 * A counter incremented every tick drifts, and it keeps counting after the app
 * is closed. Deriving from `startedAt` means a reload, a sleep or a closed
 * window all show the truth: the clock kept running while the paper was open.
 *
 * A pause is added back in rather than subtracted from a counter: the total
 * paused time is what the paper is owed, so a reload mid-pause still restores
 * the right clock.
 */
export function remainingSeconds(
  startedAt: number,
  limitMinutes: number,
  now = Date.now(),
  pausedMs = 0,
): number {
  const endsAt = startedAt + limitMinutes * 60_000 + Math.max(0, pausedMs);
  return Math.max(0, Math.round((endsAt - now) / 1000));
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${pad(minutes)}:${pad(rest)}`;
}
