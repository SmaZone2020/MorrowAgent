/**
 * The goal's shape, kept free of IPC so the plan can be tested without a window.
 *
 * Every field is optional: a package can be read and practised without a goal,
 * and the plan then falls back to ranking weak points instead of refusing to
 * render. The goal is per workspace, so two packages never share a deadline.
 */
export interface StudyGoal {
  targetScore: number | null;
  /** `YYYY-MM-DD`, or null when no exam is scheduled. */
  examDate: string | null;
  minutesPerDay: number;
  /** `basic` / `advanced` / `challenging`. */
  difficultyFocus: string[];
  note: string;
}

/** One day of practice; days without attempts are simply absent. */
export interface TrendPoint {
  date: string;
  attempts: number;
  correct: number;
}

export const MINUTES_CHOICES = [15, 30, 60, 90] as const;

export const defaultGoal: StudyGoal = {
  targetScore: null,
  examDate: null,
  minutesPerDay: 30,
  difficultyFocus: [],
  note: "",
};
