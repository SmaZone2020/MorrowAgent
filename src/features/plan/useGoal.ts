import { useCallback, useEffect, useState } from "react";
import {
  defaultGoal,
  type StudyGoal,
} from "@/features/plan/types";
import { loadGoal, saveGoal } from "@/features/plan/goal";

/**
 * The goal is read once per workspace and written straight through.
 *
 * There is no store: nothing else in the app reads the goal except the plan and
 * the dashboard, and both re-read on mount, so a cached copy would only be a
 * second source of truth to keep in step.
 */
export function useGoal(workspaceId: string) {
  const [goal, setGoal] = useState<StudyGoal | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    void loadGoal(workspaceId).then((stored) => {
      if (!alive) return;
      setGoal(stored);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [workspaceId]);

  const update = useCallback(
    (patch: Partial<StudyGoal>) => {
      setGoal((current) => {
        const next = { ...(current ?? defaultGoal), ...patch };
        void saveGoal(workspaceId, next).catch(() => undefined);
        return next;
      });
    },
    [workspaceId],
  );

  return { goal: goal ?? defaultGoal, hasGoal: goal !== null, loaded, update };
}
