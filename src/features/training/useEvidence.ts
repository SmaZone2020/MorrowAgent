import { useCallback, useEffect, useState } from "react";
import {
  clearEvidence,
  loadEvidence,
  setEvidence,
} from "@/features/training/attempts";
import type { EvidenceState, PointEvidence } from "@/features/training/evidence";

/**
 * The evidence overlay for one package.
 *
 * It is a separate read from the tallies on purpose: the tallies are counted
 * and never change shape, while this is a set of judgements the learner can
 * overrule at any moment. Keeping them apart means a correction never has to be
 * threaded through the mastery maths.
 */
export function useEvidence(workspaceId: string) {
  const [byPoint, setByPoint] = useState<Map<string, PointEvidence>>(new Map());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    void loadEvidence(workspaceId).then((rows) => {
      if (!alive) return;
      setByPoint(new Map(rows.map((row) => [row.pointId, row])));
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [workspaceId]);

  const mark = useCallback(
    async (pointId: string, state: EvidenceState, note = "") => {
      setByPoint((current) => {
        const next = new Map(current);
        next.set(pointId, {
          pointId,
          state,
          note,
          updatedAt: Date.now(),
        });
        return next;
      });
      try {
        await setEvidence(workspaceId, pointId, state, note);
      } catch {
        void loadEvidence(workspaceId).then((rows) => {
          setByPoint(new Map(rows.map((row) => [row.pointId, row])));
        });
      }
    },
    [workspaceId],
  );

  const unmark = useCallback(
    async (pointId: string) => {
      setByPoint((current) => {
        const next = new Map(current);
        next.delete(pointId);
        return next;
      });
      try {
        await clearEvidence(workspaceId, pointId);
      } catch {
        void loadEvidence(workspaceId).then((rows) => {
          setByPoint(new Map(rows.map((row) => [row.pointId, row])));
        });
      }
    },
    [workspaceId],
  );

  return { byPoint, loaded, mark, unmark };
}
