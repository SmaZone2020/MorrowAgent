import type { Mastery } from "@/features/training/mastery";
import { weakestFirst } from "@/features/training/mastery";
import type { StudyGoal } from "@/features/plan/types";
import { daysUntil } from "@/features/plan/calendar";

/**
 * Today's plan is computed, never stored.
 *
 * A stored plan would go stale the moment the learner answers a question, and
 * a stale checklist is worse than none: it asks for work that is already done.
 * Everything here is a pure function of the goal, the record and the calendar,
 * so the page can recompute on every render and always agree with the profile.
 */
export interface PlanPoint {
  id: string;
  name: string;
  examImportance: string;
  difficulty: number;
}

export type PlanReason = "untested" | "weak" | "review";

export interface PlanTask {
  pointId: string;
  name: string;
  reason: PlanReason;
  /** How many questions to attempt, scaled to the daily minutes. */
  questions: number;
}

export interface Plan {
  tasks: PlanTask[];
  /** Days left before the exam; null when no date is set. */
  daysLeft: number | null;
  /** Minutes the plan is sized for. */
  minutes: number;
  /** Points the package has no question for, so the plan cannot include them. */
  untestable: string[];
}

const TASK_COUNT: Record<number, number> = {
  15: 2,
  30: 3,
  60: 4,
  90: 5,
};

/** A goal may hold any number of minutes; pick the closest ladder step. */
function taskCount(minutes: number): number {
  const steps = Object.keys(TASK_COUNT)
    .map(Number)
    .sort((a, b) => a - b);
  let best = steps[0]!;
  for (const step of steps) {
    if (Math.abs(step - minutes) < Math.abs(best - minutes)) best = step;
  }
  return TASK_COUNT[best]!;
}

function questionsFor(minutes: number, tasks: number): number {
  // Roughly one question per eight minutes, never fewer than two per point.
  const perPoint = Math.round(minutes / 8 / Math.max(1, tasks));
  return Math.min(12, Math.max(2, perPoint));
}

/** The goal speaks in bands; the package declares 1–5, so map between them. */
export function difficultyBand(difficulty: number): string {
  if (difficulty <= 2) return "basic";
  if (difficulty <= 4) return "advanced";
  return "challenging";
}

/**
 * Ranked so a point with no evidence comes first: the plan is where the learner
 * finds out what they do not know, so an unknown outranks a measured weakness.
 * The exam date only stretches the list when it is close.
 */
export function buildPlan(input: {
  goal: StudyGoal | null;
  masteries: Mastery[];
  points: PlanPoint[];
  /** Points that have at least one question in the package. */
  testable: Set<string>;
  today?: Date;
}): Plan {
  const goal = input.goal;
  const minutes = goal?.minutesPerDay ?? 30;
  const daysLeft = daysUntil(goal?.examDate ?? null, input.today);
  const pointsById = new Map(input.points.map((point) => [point.id, point]));

  const testable = input.masteries.filter((entry) =>
    input.testable.has(entry.pointId),
  );
  const untestable = input.points
    .filter((point) => !input.testable.has(point.id))
    .map((point) => point.id);

  // Close to the exam, cover more of the paper's likely ground; far out, keep
  // the list short enough to actually finish in one sitting.
  const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
  const wanted = taskCount(minutes) + (urgent ? 2 : 0);

  const ranked = weakestFirst(testable);
  // The focus list narrows the practice to a difficulty band, but never below a
  // usable list: an empty band falls back to the whole ranking.
  const focus = goal?.difficultyFocus ?? [];
  const banded =
    focus.length > 0
      ? ranked.filter((entry) => {
          const point = pointsById.get(entry.pointId);
          return point ? focus.includes(difficultyBand(point.difficulty)) : false;
        })
      : [];
  const pool = banded.length >= wanted ? banded : ranked;

  const tasks: PlanTask[] = pool.slice(0, wanted).map((entry) => {
    const point = pointsById.get(entry.pointId)!;
    const reason: PlanReason =
      entry.attempts === 0
        ? "untested"
        : entry.confidence < 0.3
          ? "weak"
          : entry.score < 70
            ? "weak"
            : "review";
    return {
      pointId: entry.pointId,
      name: point.name,
      reason,
      questions: questionsFor(minutes, wanted),
    };
  });

  return { tasks, daysLeft, minutes, untestable };
}

export const PLAN_REASON_LABEL: Record<PlanReason, string> = {
  untested: "还没测过",
  weak: "薄弱",
  review: "巩固",
};
