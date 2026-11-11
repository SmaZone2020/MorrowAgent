import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizeWidth,
  pointFromEvent,
  strokeToPath,
  type InkWidth,
} from "@/features/scratchpad/geometry";
import {
  DEFAULT_INK_COLOR,
  strokeColor,
} from "@/features/scratchpad/palette";
import {
  emptyDocument,
  type Stroke,
  type StrokeDocument,
} from "@/features/scratchpad/types";
import {
  loadUiState,
  peekScope,
  readScope,
  writeScope,
} from "@/features/uiState/store";
import { appScope } from "@/features/uiState/scope";

export interface ScratchpadHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLCanvasElement>) => void;
}

export interface ScratchpadApi {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handlers: ScratchpadHandlers;
  strokes: Stroke[];
  isEmpty: boolean;
  width: InkWidth;
  setWidth: (width: InkWidth) => void;
  color: string;
  setColor: (color: string) => void;
  undo: () => void;
  clear: () => void;
  toDocument: () => StrokeDocument;
}

/**
 * Owns the ink state and canvas painting for one scratchpad. Strokes are stored
 * as point lists, never as bitmaps, so undo is a pop and the same data can be
 * replayed or sent to Lumi later.
 *
 * `persistKey` binds the ink to an interface-state scope. Passing the question
 * id is what makes a half-finished answer survive a reload (T-02): the strokes
 * are the answer, so losing them is losing work, not a lost scroll position.
 */
export function useScratchpad(persistKey?: string): ScratchpadApi {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() =>
    persistKey ? readScope<Stroke[]>(persistKey, []) : [],
  );
  // The nib width is a tool setting, not a property of one pad, so every pad on
  // screen follows the same choice.
  const [width, setWidth] = useState<InkWidth>(() =>
    normalizeWidth(readScope<number>(appScope("inkWidth"), 1)),
  );
  const widthRef = useRef(width);
  widthRef.current = width;

  // Like the nib width, the colour is a tool setting shared by every pad.
  const [color, setColorState] = useState<string>(() =>
    readScope<string>(appScope("inkColor"), DEFAULT_INK_COLOR),
  );
  const colorRef = useRef(color);
  colorRef.current = color;

  const chooseWidth = useCallback((next: InkWidth) => {
    setWidth(next);
    writeScope(appScope("inkWidth"), next);
  }, []);
  const chooseColor = useCallback((next: string) => {
    setColorState(next);
    writeScope(appScope("inkColor"), next);
  }, []);
  const drawingRef = useRef<Stroke | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  // Writes stay off until the stored ink has been read. The state file is
  // loaded asynchronously at boot, and a write before that would replace the
  // saved strokes with the empty initial value.
  const readyRef = useRef(!persistKey || peekScope(persistKey) !== undefined);
  // Set as soon as the reader draws, so the late disk read cannot replace a
  // stroke that is already on the canvas.
  const touchedRef = useRef(false);

  strokesRef.current = strokes;

  useEffect(() => {
    if (!persistKey) return;
    let cancelled = false;

    if (!readyRef.current) {
      void loadUiState().then(() => {
        if (cancelled) return;
        readyRef.current = true;
        if (!touchedRef.current) {
          setStrokes(readScope<Stroke[]>(persistKey, []));
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey || !readyRef.current) return;
    writeScope(persistKey, strokes);
  }, [persistKey, strokes]);

  const paint = useCallback((committed: Stroke[], live?: Stroke) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    const themeInk = inkColor();
    for (const stroke of committed) {
      // The colour is per stroke, not per pass: recolouring the pen must not
      // repaint work that was already done in another colour.
      context.fillStyle = strokeColor(stroke.color, themeInk);
      context.fill(strokeToPath(stroke, normalizeWidth(stroke.width)));
    }
    if (live) {
      context.fillStyle = strokeColor(live.color, themeInk);
      context.fill(strokeToPath(live, normalizeWidth(live.width)));
    }
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
      // A second finger must not restart the stroke under the first one.
      if (drawingRef.current) return;
      touchedRef.current = true;
      canvas.setPointerCapture(event.pointerId);
      const rect = canvas.getBoundingClientRect();
      drawingRef.current = {
        points: [pointFromEvent(event, rect)],
        width: widthRef.current,
        color: colorRef.current,
      };
      // Show the first dot immediately; without this a tap paints nothing
      // until pointerup commits the stroke.
      paint(strokesRef.current, drawingRef.current);
    },
    [paint],
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

  const pointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const current = drawingRef.current;
      drawingRef.current = null;
      if (!current) return;
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      // A tap with no movement still deserves a dot, so single-point strokes
      // are kept instead of discarded as empty.
      setStrokes((previous) => [...previous, current]);
    },
    [],
  );

  // A cancelled gesture (the OS took the pointer, the window lost focus) must
  // not leave the pen down, or the next move would draw a line to the cursor.
  const pointerCancel = useCallback(() => {
    drawingRef.current = null;
    paint(strokesRef.current);
  }, [paint]);

  const undo = useCallback(() => {
    touchedRef.current = true;
    setStrokes((previous) => previous.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    touchedRef.current = true;
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
    handlers: { onPointerDown: pointerDown, onPointerMove: pointerMove, onPointerUp: pointerUp, onPointerCancel: pointerCancel },
    strokes,
    isEmpty: strokes.length === 0,
    width,
    setWidth: chooseWidth,
    color,
    setColor: chooseColor,
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
