import type { MindNode } from "@/features/mindmap/mindmapSpec";

export interface LaidOutNode {
  node: MindNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
}

export interface LaidOutEdge {
  from: LaidOutNode;
  to: LaidOutNode;
}

export interface MindMapLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

const ROW_GAP = 12;
const COLUMN_GAP = 56;
const NODE_HEIGHT = 34;
const PAD = 24;

/** Rough text width: CJK glyphs are about twice as wide as Latin ones. */
function measure(label: string): number {
  let units = 0;
  for (const char of label) {
    units += /[\u3000-\u9fff\uff00-\uffef]/.test(char) ? 2 : 1;
  }
  return Math.min(280, Math.max(64, units * 7.4 + 24));
}

/**
 * Left-to-right tidy tree: leaves stack vertically, a parent sits centred on
 * its children. Collapsed nodes hide their subtree from the layout entirely, so
 * the canvas shrinks when a branch closes.
 */
export function layoutMindMap(
  root: MindNode,
  collapsed: Set<string>,
): MindMapLayout {
  const nodes: LaidOutNode[] = [];
  const edges: LaidOutEdge[] = [];
  const heights = new Map<string, number>();

  const isCollapsed = (node: MindNode) =>
    collapsed.has(node.id) && node.children.length > 0;

  const measureSubtree = (node: MindNode): number => {
    if (isCollapsed(node) || node.children.length === 0) {
      heights.set(node.id, NODE_HEIGHT + ROW_GAP);
      return NODE_HEIGHT + ROW_GAP;
    }
    const total = node.children.reduce(
      (sum, child) => sum + measureSubtree(child),
      0,
    );
    const height = Math.max(total, NODE_HEIGHT + ROW_GAP);
    heights.set(node.id, height);
    return height;
  };

  measureSubtree(root);

  // Column x is the accumulated widest node per depth, so a deep label in one
  // branch does not overlap a short one in another.
  const columnX: number[] = [];
  const collectWidths = (node: MindNode, depth: number) => {
    columnX[depth] = Math.max(columnX[depth] ?? 0, measure(node.label));
    if (isCollapsed(node)) return;
    for (const child of node.children) collectWidths(child, depth + 1);
  };
  collectWidths(root, 0);

  const offsets: number[] = [];
  let running = PAD;
  for (let depth = 0; depth < columnX.length; depth += 1) {
    offsets[depth] = running;
    running += (columnX[depth] ?? 0) + COLUMN_GAP;
  }

  const place = (node: MindNode, depth: number, top: number): LaidOutNode => {
    const subtreeHeight = heights.get(node.id) ?? NODE_HEIGHT + ROW_GAP;
    const width = measure(node.label);
    const collapsedHere = isCollapsed(node);
    const y = top + subtreeHeight / 2 - NODE_HEIGHT / 2;
    const laid: LaidOutNode = {
      node,
      x: offsets[depth] ?? PAD,
      y,
      width,
      height: NODE_HEIGHT,
      depth,
      hasChildren: node.children.length > 0,
      collapsed: collapsedHere,
    };
    nodes.push(laid);
    if (collapsedHere) return laid;
    let childTop = top;
    for (const child of node.children) {
      const childHeight = heights.get(child.id) ?? NODE_HEIGHT + ROW_GAP;
      const childLaid = place(child, depth + 1, childTop);
      edges.push({ from: laid, to: childLaid });
      childTop += childHeight;
    }
    return laid;
  };

  place(root, 0, PAD);

  const width = Math.max(...nodes.map((node) => node.x + node.width)) + PAD;
  const height = Math.max(...nodes.map((node) => node.y + node.height)) + PAD;
  return { nodes, edges, width, height };
}

/** A smooth S-curve between a parent's right edge and a child's left edge. */
export function edgePath(from: LaidOutNode, to: LaidOutNode): string {
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const mid = (x1 + x2) / 2;
  return `M${x1} ${y1}C${mid} ${y1},${mid} ${y2},${x2} ${y2}`;
}
