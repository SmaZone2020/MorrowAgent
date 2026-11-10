import { useMemo, useRef, useState } from "react";
import { Minus, Plus, ArrowRotateLeft } from "@gravity-ui/icons";
import { Button } from "@/vendor/beui/components/motion/button";
import { edgePath, layoutMindMap } from "@/features/mindmap/mindmapLayout";
import type { MindMapSpec } from "@/features/mindmap/mindmapSpec";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.4;

/**
 * An interactive tree: drag to pan, wheel or buttons to zoom, click a node with
 * children to fold that branch. Collapsing is the interaction that matters on a
 * knowledge map — the whole point is hiding detail until it is wanted.
 */
export function MindMap({ spec }: { spec: MindMapSpec }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);

  const layout = useMemo(() => layoutMindMap(spec.root, collapsed), [spec, collapsed]);

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCollapsed(new Set());
  };

  const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={spec.title || "思维导图"}
        className="h-auto max-h-[420px] w-full cursor-grab touch-none active:cursor-grabbing"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top left",
          transition: drag.current ? "none" : "transform 160ms ease-out",
        }}
        onWheel={(event) => {
          // Ctrl is the browser zoom gesture; plain wheel pans the canvas
          // instead of scrolling the chat past the diagram.
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setZoom((current) => clampZoom(current - event.deltaY * 0.002));
            return;
          }
          setPan((current) => ({
            x: current.x - event.deltaX,
            y: current.y - event.deltaY,
          }));
        }}
        onPointerDown={(event) => {
          if ((event.target as Element).closest("[data-node]")) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            originX: pan.x,
            originY: pan.y,
          };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          setPan({
            x: start.originX + (event.clientX - start.x),
            y: start.originY + (event.clientY - start.y),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {layout.edges.map((edge) => (
          <path
            key={`${edge.from.node.id}-${edge.to.node.id}`}
            d={edgePath(edge.from, edge.to)}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeWidth={1.5}
          />
        ))}

        {layout.nodes.map((laid) => {
          const isRoot = laid.depth === 0;
          return (
            <g
              key={laid.node.id}
              data-node
              transform={`translate(${laid.x}, ${laid.y})`}
              role="button"
              tabIndex={0}
              aria-label={
                laid.hasChildren
                  ? `${laid.node.label}，${laid.collapsed ? "展开" : "折叠"}`
                  : laid.node.label
              }
              onClick={() => {
                if (laid.hasChildren) toggle(laid.node.id);
              }}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && laid.hasChildren) {
                  event.preventDefault();
                  toggle(laid.node.id);
                }
              }}
              className="cursor-pointer outline-none focus-visible:[&>rect]:stroke-[3]"
            >
              <rect
                width={laid.width}
                height={laid.height}
                rx={10}
                className={
                  isRoot
                    ? "fill-primary stroke-primary"
                    : laid.depth === 1
                      ? "fill-muted stroke-border"
                      : "fill-card stroke-border"
                }
                strokeWidth={1.5}
              />
              <text
                x={laid.width / 2}
                y={laid.height / 2 + 4}
                textAnchor="middle"
                fontSize={13}
                className={
                  isRoot
                    ? "fill-primary-foreground"
                    : "fill-foreground"
                }
              >
                {laid.node.label.length > 18
                  ? `${laid.node.label.slice(0, 17)}…`
                  : laid.node.label}
              </text>
              {laid.hasChildren ? (
                <g transform={`translate(${laid.width + 8}, ${laid.height / 2 - 6})`}>
                  <circle r={6} className="fill-muted stroke-border" strokeWidth={1} />
                  <text
                    y={3.5}
                    textAnchor="middle"
                    fontSize={10}
                    className="fill-muted-foreground"
                  >
                    {laid.collapsed ? "+" : "−"}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-xl border border-border/70 bg-card/90 p-1 backdrop-blur">
        <Button
          size="sm"
          variant="ghost"
          aria-label="缩小"
          className="size-8 p-0"
          onClick={() => setZoom((current) => clampZoom(current - 0.2))}
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-10 text-center text-sm tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          size="sm"
          variant="ghost"
          aria-label="放大"
          className="size-8 p-0"
          onClick={() => setZoom((current) => clampZoom(current + 0.2))}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="复位"
          className="size-8 p-0"
          onClick={reset}
        >
          <ArrowRotateLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
