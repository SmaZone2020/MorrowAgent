/**
 * Tool arguments arrive as model-authored JSON: they may be the wrong type, out
 * of range, or not JSON at all. Every reader here is total — it returns a usable
 * value rather than throwing, so a malformed call costs a tool result, not the
 * turn.
 */
export function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function count(value: unknown, fallback: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.round(parsed)));
}

/** Reads a tool's arguments without trusting their shape. */
export function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
