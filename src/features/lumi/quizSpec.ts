/**
 * The shape `ask_questions` carries.
 *
 * The model writes this as tool arguments, so nothing may be assumed: every
 * field is read defensively and a malformed option is dropped rather than
 * blanking the whole set. A card the user cannot answer is worse than a card
 * with one option missing.
 */
export type QuizQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "fill_blank"
  | "board";

export interface QuizOption {
  key: string;
  content: string;
  correct: boolean;
  /** Why this option is right, or where it goes wrong. */
  explanation: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  stem: string;
  options: QuizOption[];
  /** Accepted answers: option keys for a choice, text values for a blank. */
  answer: string[];
  explanation: string;
  knowledgePoints: string[];
  difficulty: number;
  estimatedMinutes?: number;
}

export interface QuizRequest {
  componentId: string;
  title: string;
  questions: QuizQuestion[];
}

const TYPES: QuizQuestionType[] = [
  "single_choice",
  "multiple_choice",
  "fill_blank",
  "board",
];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : fallback;
}

function readStrings(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((entry) => asString(entry)).filter(Boolean);
  }
  const single = asString(raw);
  return single ? [single] : [];
}

function readOptions(raw: unknown): QuizOption[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  return raw.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const content = asString(record.content ?? record.text);
    if (!content) return [];
    // Keys are the user's answer vocabulary, so they must stay unique even
    // when the model repeats one.
    let key = asString(record.key ?? record.id) || String.fromCharCode(65 + index);
    while (used.has(key)) key = `${key}'`;
    used.add(key);
    return [
      {
        key,
        content,
        correct: record.correct === true,
        explanation: asString(record.explanation),
      },
    ];
  });
}

function readQuestion(raw: unknown, index: number): QuizQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const stem = asString(record.stem ?? record.content ?? record.question);
  if (!stem) return null;

  const declared = asString(record.type);
  const options = readOptions(record.options);
  // A choice question without options is unanswerable, and a question that
  // says it is a blank but ships options is a choice in disguise.
  const type: QuizQuestionType = TYPES.includes(declared as QuizQuestionType)
    ? (declared as QuizQuestionType)
    : options.length > 0
      ? "single_choice"
      : "fill_blank";

  const marks = options.filter((option) => option.correct).map((option) => option.key);
  const declaredAnswer = readStrings(record.answer ?? record.answers);
  // Prefer the explicit answer list; fall back to the option flags so a model
  // that only marked `correct` still produces a gradable question.
  const answer = declaredAnswer.length > 0 ? declaredAnswer : marks;

  return {
    id: asString(record.id) || `q${index + 1}`,
    type,
    stem,
    options,
    answer,
    explanation: asString(record.explanation),
    knowledgePoints: readStrings(record.knowledgePoints ?? record.knowledge_points),
    difficulty: Math.min(5, Math.max(1, Math.round(asNumber(record.difficulty, 3)))),
    estimatedMinutes:
      record.estimatedMinutes === undefined
        ? undefined
        : Math.round(asNumber(record.estimatedMinutes, 0)) || undefined,
  };
}

/**
 * Reads one `ask_questions` payload. `componentId` is required: it is how the
 * answered state is found again after a re-render or a reload, so a payload
 * without one is rejected outright rather than rendered unanswerable.
 */
export function parseQuizRequest(raw: unknown): QuizRequest | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  const componentId = asString(record.componentId);
  if (!componentId) return null;

  const source = Array.isArray(record.questions) ? record.questions : [];
  const questions = source
    .map(readQuestion)
    .filter((question): question is QuizQuestion => question !== null);
  if (questions.length === 0) return null;

  return {
    componentId,
    title: asString(record.title) || "练习",
    questions,
  };
}

/**
 * Normalizes a written answer: full-width punctuation and spacing differ
 * between what a user types and what the model wrote, and neither difference
 * should decide whether the maths is right.
 */
export function normalizeText(value: string): string {
  return value
    .replace(/[\uFF01-\uFF5E]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(/[\s$\u3000]/g, "")
    .replace(/，/g, ",")
    .replace(/。/g, ".")
    .toLowerCase();
}

/** True when this question type can be graded without the model's judgement. */
export function isGradable(type: QuizQuestionType): boolean {
  return type !== "board";
}

/**
 * A question is correct only when the selection matches exactly: a multiple
 * choice with a missed option is wrong, matching how the exam is marked.
 *
 * A blank is compared after normalization, because "x=1" and "X = 1" are the
 * same answer and the user should not be marked down for spacing.
 */
export function isAnswerCorrect(question: QuizQuestion, selected: string[]): boolean {
  if (question.answer.length === 0) return false;

  if (question.type === "fill_blank") {
    const given = selected.map(normalizeText).filter(Boolean);
    if (given.length === 0) return false;
    return question.answer.some((entry) => given.includes(normalizeText(entry)));
  }

  const wanted = new Set(question.answer.map((entry) => entry.trim()));
  const given = new Set(selected.map((entry) => entry.trim()));
  if (wanted.size !== given.size) return false;
  for (const key of wanted) if (!given.has(key)) return false;
  return true;
}

