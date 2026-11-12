import { useEffect, useState } from "react";
import { Clock, Pause } from "@gravity-ui/icons";
import { formatClock, remainingSeconds } from "@/features/exam/paper";

/**
 * The exam clock.
 *
 * It re-renders once a second but never accumulates: every frame recomputes the
 * remaining time from `startedAt`, so closing the window, sleeping the machine
 * or reloading the page cannot pause the paper or drift the count. A pause is
 * passed in as time owed back, which keeps the same derivation honest while the
 * paper is stopped. The last five minutes turn to a warning colour because that
 * is when a learner needs to know to stop writing.
 */
export function ExamClock({
  startedAt,
  minutes,
  frozenAt,
  pausedMs = 0,
  paused = false,
  onExpire,
}: {
  startedAt: number;
  minutes: number;
  /** Set once the paper is submitted, so the clock stops moving. */
  frozenAt?: number | null;
  /** Total paused time so far, including the pause that is still open. */
  pausedMs?: number;
  /** True while the paper is stopped; the clock then shows its frozen value. */
  paused?: boolean;
  /** Fires once when the paper runs out, so the exam can close itself. */
  onExpire?: () => void;
}) {
  const [now, setNow] = useState(() => frozenAt ?? Date.now());

  useEffect(() => {
    if (frozenAt || paused) {
      setNow(frozenAt ?? Date.now());
      return;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [frozenAt, paused]);

  const left = remainingSeconds(startedAt, minutes, now, pausedMs);
  const low = left <= 5 * 60;

  // A paper that runs out while the window is open must close by itself; the
  // clock is the only thing that knows the limit was reached.
  const expired = left === 0;
  useEffect(() => {
    if (expired && !frozenAt && !paused) onExpire?.();
  }, [expired, frozenAt, paused, onExpire]);

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm tabular-nums ${
        paused
          ? "border-border/70 bg-muted text-muted-foreground"
          : low
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : "border-border/70 bg-card text-foreground"
      }`}
      aria-live={low && !paused ? "polite" : "off"}
    >
      {paused ? <Pause className="size-4" /> : <Clock className="size-4" />}
      {formatClock(left)}
    </span>
  );
}
