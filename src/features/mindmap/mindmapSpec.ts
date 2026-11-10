export interface MindNode {
  id: string;
  label: string;
  children: MindNode[];
}

export interface MindMapSpec {
  title: string;
  root: MindNode;
}

/** Depth guard: a runaway tree would freeze the layout, not just look bad. */
const MAX_DEPTH = 6;
const MAX_NODES = 120;

function readNode(
  raw: unknown,
  path: string,
  depth: number,
  budget: { left: number },
): MindNode | null {
  if (!raw || typeof raw !== "object" || depth > MAX_DEPTH || budget.left <= 0) {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const label =
    typeof record.label === "string"
      ? record.label
      : typeof record.text === "string"
        ? record.text
        : typeof record.name === "string"
          ? record.name
          : "";
  if (!label.trim()) return null;
  budget.left -= 1;
  const rawChildren = Array.isArray(record.children) ? record.children : [];
  const children = rawChildren.flatMap((child, index) => {
    const parsed = readNode(child, `${path}-${index}`, depth + 1, budget);
    return parsed ? [parsed] : [];
  });
  return { id: path, label: label.trim(), children };
}

/**
 * Reads a `mindmap` block. Both `{"root": {...}}` and a bare node object are
 * accepted, because the shape is obvious from the tree itself.
 */
export function parseMindMapSpec(source: string): MindMapSpec | null {
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title : "";
  const rootSource = record.root ?? record;
  const root = readNode(rootSource, "n", 0, { left: MAX_NODES });
  if (!root) return null;
  return { title, root };
}
