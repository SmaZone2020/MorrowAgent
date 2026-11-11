import type { ToolContext } from "@/features/lumi/tools";

/**
 * The one live tool context, set by the page that owns the package.
 *
 * A conversation store is created at module scope so a stream survives a
 * re-render, which means it cannot close over React context. This slot is how
 * the store still reaches the package: the page registers a reader on mount and
 * clears it on unmount, and a tool call during that window reads real content.
 */
let source: (() => ToolContext | null) | null = null;

export function setToolContextSource(next: (() => ToolContext | null) | null) {
  source = next;
}

export function currentToolContext(): ToolContext | null {
  return source?.() ?? null;
}
