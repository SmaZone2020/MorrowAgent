/**
 * The shapes the reading and drilling screens work with.
 *
 * These are deliberately not the wire shapes from `features/library/api`: a
 * package stores a Markdown body and numeric difficulty, while the UI wants
 * resolved neighbour ids and a string answer. One adapter (`view.ts`) sits
 * between them so no page has to know how a package is serialised.
 */
export interface KnowledgePoint {
  id: string;
  name: string;
  chapterId: string;
  summary: string;
  /** Markdown, with MathJax-style `$…$` inline. */
  body: string;
  /** 1–5, as declared by the package author. */
  difficulty: number;
  examImportance: string;
  objectives: string[];
  prerequisites: string[];
  tags: string[];
  sources: string[];
  /** Frequent mistakes the package author calls out for this point. */
  commonErrors: string[];
  images: ContentImage[];
  /** Point ids this one is linked to, in either direction. */
  related: string[];
}

export interface KnowledgeChapter {
  id: string;
  name: string;
  summary: string;
  order: number;
  pointIds: string[];
}

export interface QuestionOption {
  key: string;
  content: string;
}

export type ImageKind = "latex" | "svg" | "data_uri" | "url" | "path";

/** Where an image sits: the stem, the explanation, or one specific option. */
export type ImagePosition = "stem" | "explanation" | `option:${string}`;

export interface ContentImage {
  type: "formula" | "figure" | "screenshot" | "other";
  kind: ImageKind;
  content: string;
  position: ImagePosition;
  caption?: string;
  alt?: string;
  width?: number;
}

/**
 * A worked solution shipped beside the questions (MLPS §9). Absent for most
 * questions today: a question must stay usable without one, so nothing may
 * require this to be present.
 */
export interface QuestionSolution {
  summary: string;
  steps: { index: number; content: string }[];
  finalAnswer: string;
  alternatives: string[];
}

export interface Question {
  id: string;
  content: string;
  questionType: string;
  /** Empty when the package ships no worked solution for this question. */
  explanation: string;
  options: QuestionOption[];
  /** The accepted answer; a choice question stores its option key. */
  answer: string;
  images: ContentImage[];
  knowledgeTags: string[];
  commonErrors: { errorType: string; description: string }[];
  /** Present only when the package has a solution file for this question. */
  solution?: QuestionSolution;
  /** 1–5, as declared by the package author. */
  difficulty: number;
  estimatedMinutes?: number;
  sourceType: string;
  sourceReference?: string;
  version: string;
}

export interface KnowledgeRelation {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
}
