import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isTauriRuntime } from "@/app/shell/windowControls";
import { mediaData } from "@/features/library/api";

/**
 * Figures inside a learning package are referenced as `media/…`. The webview
 * cannot read them: a package lives in the app data directory and the path is a
 * logical one. They are therefore fetched once through a Tauri command and
 * cached as data URIs, keyed by workspace so two packages never share a hit.
 */
const MediaContext = createContext<string | null>(null);
const cache = new Map<string, string>();

export function WorkspaceMediaProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  return (
    <MediaContext.Provider value={workspaceId}>{children}</MediaContext.Provider>
  );
}

export type MediaStatus = "loading" | "ready" | "failed";

export interface MediaSource {
  url: string | null;
  status: MediaStatus;
}

/** Inline and remote sources pass through; a package path is resolved. */
export function isPackageMedia(src: string): boolean {
  return !/^(data:|https?:|blob:)/i.test(src);
}

export function useMediaSource(raw: string): MediaSource {
  const workspaceId = useContext(MediaContext);
  const relative = isPackageMedia(raw);
  const [state, setState] = useState<MediaSource>(() => {
    if (!relative) return { url: raw, status: "ready" };
    const hit = workspaceId ? cache.get(`${workspaceId}:${raw}`) : undefined;
    return hit ? { url: hit, status: "ready" } : { url: null, status: "loading" };
  });

  useEffect(() => {
    if (!relative) {
      setState({ url: raw, status: "ready" });
      return;
    }
    if (!workspaceId || !isTauriRuntime) {
      setState({ url: null, status: "failed" });
      return;
    }

    const key = `${workspaceId}:${raw}`;
    const hit = cache.get(key);
    if (hit) {
      setState({ url: hit, status: "ready" });
      return;
    }

    let alive = true;
    setState({ url: null, status: "loading" });
    void mediaData(workspaceId, raw)
      .then((data) => {
        if (!data) throw new Error("empty");
        cache.set(key, data);
        if (alive) setState({ url: data, status: "ready" });
      })
      .catch(() => {
        if (alive) setState({ url: null, status: "failed" });
      });

    return () => {
      alive = false;
    };
  }, [raw, relative, workspaceId]);

  return state;
}
