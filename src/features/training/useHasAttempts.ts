import { useEffect, useState } from "react";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { loadPointStats } from "@/features/training/attempts";

/**
 * Whether this package has any answer on record.
 *
 * The Lumi page uses it to decide whether to offer the diagnostic: a learner
 * with no evidence is the one who needs it, and one who has been practising
 * does not want to be asked again. A failure reads as "unknown" rather than
 * "none", so a broken database does not nag a returning user.
 */
export function useHasAttempts(workspaceId: string): boolean | null {
  const [hasAttempts, setHasAttempts] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isTauriRuntime) {
      setHasAttempts(null);
      return;
    }
    let alive = true;
    setHasAttempts(null);
    void loadPointStats(workspaceId)
      .then((rows) => {
        if (alive) setHasAttempts(rows.length > 0);
      })
      .catch(() => {
        if (alive) setHasAttempts(null);
      });
    return () => {
      alive = false;
    };
  }, [workspaceId]);

  return hasAttempts;
}
