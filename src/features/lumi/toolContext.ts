import type { ToolContext } from "@/features/lumi/tools";

/**
 * The live tool contexts, keyed by the surface that published them.
 *
 * A conversation store is created at module scope so a stream survives a
 * re-render, which means it cannot close over React context. This registry is
 * how a store still reaches the package: a page registers a reader on mount and
 * removes it on unmount, and a tool call during that window reads real content.
 *
 * It is a map rather than one slot because the Lumi page and the drill rail each
 * mount their own publisher. Only one package is on screen at a time, so the
 * most recently registered reader is the current one; keying them means a
 * leaving surface deletes its own entry instead of clearing everyone's.
 */
const sources = new Map<string, () => ToolContext | null>();

export function setToolContextSource(
  owner: string,
  next: (() => ToolContext | null) | null,
) {
  if (next) sources.set(owner, next);
  else sources.delete(owner);
}

export function currentToolContext(): ToolContext | null {
  // `Map` keeps insertion order, so the last registered is the newest mount.
  let latest: (() => ToolContext | null) | undefined;
  for (const reader of sources.values()) latest = reader;
  return latest?.() ?? null;
}
