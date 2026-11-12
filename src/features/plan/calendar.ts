/**
 * Date arithmetic for the goal, kept apart from the IPC layer so the plan can
 * be unit-tested without a Tauri window.
 */

/** Local `YYYY-MM-DD`, matching how the backend groups attempts by day. */
export function isoDay(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Whole days from today to the exam; null when no usable date is set. */
export function daysUntil(
  examDate: string | null,
  today = new Date(),
): number | null {
  if (!examDate) return null;
  const target = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
