import { useEffect, useState } from "react";
import { detectEnvironment, type BuildEnvironment } from "@/features/builder/api";

/** What the probe found, and whether it is still running. */
export interface EnvironmentProbe {
  env: BuildEnvironment | null;
  probing: boolean;
  error: string | null;
}

/**
 * Probes the machine once per folder.
 *
 * Keyed by the folder rather than run once at startup because the answer
 * includes the folder itself: switching workspaces re-asks, and a path that has
 * since been deleted is reported instead of being described as if it existed.
 */
export function useBuildEnvironment(folder: string): EnvironmentProbe {
  const [state, setState] = useState<EnvironmentProbe>({
    env: null,
    probing: false,
    error: null,
  });

  useEffect(() => {
    if (!folder) {
      setState({ env: null, probing: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ env: null, probing: true, error: null });

    void detectEnvironment(folder)
      .then((env) => {
        if (!cancelled) setState({ env, probing: false, error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          env: null,
          probing: false,
          error: `环境探测失败：${error instanceof Error ? error.message : String(error)}`,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [folder]);

  return state;
}
