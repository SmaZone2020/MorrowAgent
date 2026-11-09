import type { ResizeEdge } from "@/app/shell/windowControls";
import { startWindowResize } from "@/app/shell/windowControls";

interface EdgeSpec {
  direction: ResizeEdge;
  className: string;
}

const edges: EdgeSpec[] = [
  { direction: "North", className: "inset-x-2 top-0 h-1 cursor-ns-resize" },
  { direction: "South", className: "inset-x-2 bottom-0 h-1 cursor-ns-resize" },
  { direction: "West", className: "inset-y-2 left-0 w-1 cursor-ew-resize" },
  { direction: "East", className: "inset-y-2 right-0 w-1 cursor-ew-resize" },
  { direction: "NorthWest", className: "left-0 top-0 size-2 cursor-nwse-resize" },
  { direction: "NorthEast", className: "right-0 top-0 size-2 cursor-nesw-resize" },
  { direction: "SouthWest", className: "bottom-0 left-0 size-2 cursor-nesw-resize" },
  { direction: "SouthEast", className: "bottom-0 right-0 size-2 cursor-nwse-resize" },
];

export function ResizeHandles() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      {edges.map((edge) => (
        <div
          key={edge.direction}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            void startWindowResize(edge.direction);
          }}
          className={`pointer-events-auto absolute ${edge.className}`}
        />
      ))}
    </div>
  );
}
