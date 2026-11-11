import { useEffect, useState } from "react";
import { coverData } from "@/features/library/api";

/** The only parts of a workspace a cover needs. */
export interface CoverSource {
  id: string;
  coverPath: string | null;
  orphaned: boolean;
}

/**
 * A cover is decorative: no cover, a broken cover and a slow cover all fall
 * back to the package's accent colour. Kept in one place so the shelf card and
 * the dashboard show the same picture instead of fetching it twice with
 * different fallbacks.
 */
export function useCover(source: CoverSource | null): string | null {
  const [uri, setUri] = useState<string | null>(null);
  const id = source?.id ?? null;
  const coverPath = source?.coverPath ?? null;
  const orphaned = source?.orphaned ?? false;

  useEffect(() => {
    let cancelled = false;
    if (!id || !coverPath || orphaned) {
      setUri(null);
      return;
    }
    void coverData(id, coverPath).then((next) => {
      if (!cancelled) setUri(next);
    });
    return () => {
      cancelled = true;
    };
  }, [id, coverPath, orphaned]);

  return uri;
}
