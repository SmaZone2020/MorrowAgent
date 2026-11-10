import { useCallback, useEffect, useRef, useState } from "react";
import { strokeToPath, pointFromEvent } from "@/features/scratchpad/geometry";
import {
  emptyDocument,
  type Stroke,
  type StrokeDocument,
} from "@/features/scratchpad/types";

export interface ScratchpadHandlers {
  pointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  pointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  pointerUp: () => void;
}

export interface ScratchpadApi {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handlers: ScratchpadHandlers;
  strokes: Stroke[];
  isEmpty: boolean;
  undo: () => void;
  clear: () => void;
  toDocument: () => StrokeDocument;
}

/**
 * Owns the ink state and canvas painting for one scratchpad. Strokes are stored
 * as point lists, never as bitmaps, so undo is a pop and the same data can be
 * replayed or sent to Lumi later.
 */
export function useScratchpad(): ScratchpadApi {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);
  const strokesRef = useRef<Stroke[]>([]);

  strokesRef.current = strokes;

  const paint = useCallback((committed: Stroke[], live?: Stroke) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    context.fillStyle = inkColor();
    for (const stroke of committed) context.fill(strokeToPath(stroke));
    if (live) context.fill(strokeToPath(live));
  }, []);

  useEffect(() => {
    paint(strokes);
  }, [strokes, paint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // The backing store must match the CSS box times the DPR, otherwise ink is
    // either blurry or offset from the pointer.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const context = canvas.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(strokesRef.current);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  const pointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(event.pointerId);
      const rect = canvas.getBoundingClientRect();
      drawingRef.current = { points: [pointFromEvent(event, rect)] };
    },
    [],
  );

  const pointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const current = drawingRef.current;
      const canvas = canvasRef.current;
      if (!current || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      current.points.push(pointFromEvent(event, rect));
      // The live stroke is repainted whole because its outline keeps changing
      // shape as points arrive; partial painting would leave tapered fragments.
      paint(strokesRef.current, current);
    },
    [paint],
  );

  const pointerUp = useCallback(() => {
    const current = drawingRef.current;
    drawingRef.current = null;
    if (!current) return;
    // A tap with no movement still deserves a dot, so single-point strokes are
    // kept instead of discarded as empty.
    setStrokes((previous) => [...previous, current]);
  }, []);

  const undo = useCallback(() => {
    setStrokes((previous) => previous.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);
  }, []);

  const toDocument = useCallback((): StrokeDocument => {
    const canvas = canvasRef.current;
    if (!canvas) return emptyDocument();
    const rect = canvas.getBoundingClientRect();
    return {
      ...emptyDocument(Math.round(rect.width), Math.round(rect.height)),
      strokes: strokesRef.current,
    };
  }, []);

  return {
    canvasRef,
    handlers: { pointerDown, pointerMove, pointerUp },
    strokes,
    isEmpty: strokes.length === 0,
    undo,
    clear,
    toDocument,
  };
}

/** Ink follows the foreground token so it stays readable on any card colour. */
function inkColor(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
  return value || "#384248";
}
