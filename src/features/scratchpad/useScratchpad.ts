import { useCallback, useEffect, useRef, useState } from "react";
import {
  IDENTITY_VIEW,
  isIdentityView,
  normalizeWidth,
  pointFromEvent,
  strokeToPath,
  zoomAt,
  type InkWidth,
  type ViewTransform,
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
import { summarizeInk, type InkSummary } from "@/features/scratchpad/inkSummary";
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
  onAuxClick: (event: React.MouseEvent<HTMLCanvasElement>) => void;
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
  /** Sheet zoom and pan; strokes themselves never move. */
  view: ViewTransform;
  /** True while the middle button is dragging the sheet. */
  panning: boolean;
  /** True when the sheet has been zoomed or panned away from its home view. */
  moved: boolean;
  resetView: () => void;
  toDocument: () => StrokeDocument;
  /** How much work the pad holds, for the attempt row. */
  summary: () => InkSummary;
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

  /**
   * The sheet's zoom and pan.
   *
   * Kept out of the persisted strokes on purpose: where the learner happened to
   * be looking is a property of the visit, not of the work. A reload opens at
   * home, where the ink that was drawn is certainly in view.
   */
  const [view, setView] = useState<ViewTransform>(IDENTITY_VIEW);
  const viewRef = useRef(view);
  viewRef.current = view;

  /** Middle-button drag: the offset the gesture started from. */
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  // Time with the pen actually down. Wall-clock since the first stroke would
  // count however long the tab sat open, and restored ink from a previous
  // session has no duration at all — this stays honest in both cases.
  const penDownAtRef = useRef<number | null>(null);
  const inkSecondsRef = useRef(0);
  const clearedRef = useRef(false);
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

  const paint = useCallback(
    (committed: Stroke[], live?: Stroke, view: ViewTransform = IDENTITY_VIEW) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      const ratio = window.devicePixelRatio || 1;
      context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

      // The sheet transform applies to the ink only: the clear above is in
      // canvas space, so a zoomed sheet still wipes the whole pad.
      context.save();
      context.translate(view.x, view.y);
      context.scale(view.scale, view.scale);

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

      context.restore();
    },
    [],
  );

  useEffect(() => {
    paint(strokes, undefined, view);
  }, [strokes, view, paint]);

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
      paint(strokesRef.current, undefined, viewRef.current);
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

      // Middle button drags the sheet. It is checked before the pen so a pan
      // never leaves a dot where the gesture started.
      if (event.button === 1) {
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        panRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          originX: viewRef.current.x,
          originY: viewRef.current.y,
        };
        setPanning(true);
        return;
      }
      // Right-click belongs to the browser; only the left button draws.
      if (event.button !== 0) return;

      // A second finger must not restart the stroke under the first one.
      if (drawingRef.current) return;
      touchedRef.current = true;
      canvas.setPointerCapture(event.pointerId);
      const rect = canvas.getBoundingClientRect();
      drawingRef.current = {
        points: [pointFromEvent(event, rect, viewRef.current)],
        width: widthRef.current,
        color: colorRef.current,
      };
      // Show the first dot immediately; without this a tap paints nothing
      // until pointerup commits the stroke.
      paint(strokesRef.current, drawingRef.current, viewRef.current);
      penDownAtRef.current = Date.now();
    },
    [paint],
  );

  const pointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const pan = panRef.current;
      if (pan && pan.pointerId === event.pointerId) {
        setView((current) => ({
          ...current,
          x: pan.originX + (event.clientX - pan.startX),
          y: pan.originY + (event.clientY - pan.startY),
        }));
        return;
      }

      const current = drawingRef.current;
      const canvas = canvasRef.current;
      if (!current || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      current.points.push(pointFromEvent(event, rect, viewRef.current));
      // The live stroke is repainted whole because its outline keeps changing
      // shape as points arrive; partial painting would leave tapered fragments.
      paint(strokesRef.current, current, viewRef.current);
    },
    [paint],
  );

  const pointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const pan = panRef.current;
      if (pan && pan.pointerId === event.pointerId) {
        panRef.current = null;
        setPanning(false);
        if (canvas?.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        return;
      }

      const current = drawingRef.current;
      drawingRef.current = null;
      if (!current) return;
      if (penDownAtRef.current !== null) {
        inkSecondsRef.current += (Date.now() - penDownAtRef.current) / 1000;
        penDownAtRef.current = null;
      }
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
    if (penDownAtRef.current !== null) {
      inkSecondsRef.current += (Date.now() - penDownAtRef.current) / 1000;
      penDownAtRef.current = null;
    }
    drawingRef.current = null;
    panRef.current = null;
    setPanning(false);
    paint(strokesRef.current, undefined, viewRef.current);
  }, [paint]);

  /**
   * The wheel is the zoom control.
   *
   * A native listener is required rather than `onWheel`: React attaches wheel
   * as a passive listener, so `preventDefault` inside the handler is ignored and
   * the page behind the pad scrolls while the sheet zooms.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      // Trackpad deltas are small and frequent, mouse wheels are large and
      // rare; scaling by the delta keeps both feeling proportional.
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) =>
        zoomAt(
          current,
          factor,
          event.clientX - rect.left,
          event.clientY - rect.top,
        ),
      );
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  /**
   * Middle click pastes on Linux and starts autoscroll in WebView2. Both would
   * fight the pan, so the default is cancelled; the browser's own paste target
   * is a text field, and a canvas has nothing to paste into.
   */
  const auxClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 1) event.preventDefault();
  }, []);

  const resetView = useCallback(() => setView(IDENTITY_VIEW), []);

  const undo = useCallback(() => {
    touchedRef.current = true;
    setStrokes((previous) => previous.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    touchedRef.current = true;
    clearedRef.current = true;
    setStrokes([]);
  }, []);

  const toDocument = useCallback((): StrokeDocument => {
    const canvas = canvasRef.current;
    if (!canvas) return emptyDocument();
    const rect = canvas.getBoundingClientRect();
    const view = viewRef.current;
    // The sheet's own extent, not the window's: strokes are in sheet space, so
    // a zoomed view must not claim the pad is smaller than the ink on it.
    return {
      ...emptyDocument(
        Math.round(rect.width / view.scale),
        Math.round(rect.height / view.scale),
      ),
      strokes: strokesRef.current,
    };
  }, []);

  const summary = useCallback((): InkSummary => {
    // A pen still down when the answer is submitted has been working the whole
    // time, so its elapsed seconds count too.
    const inFlight =
      penDownAtRef.current === null
        ? 0
        : (Date.now() - penDownAtRef.current) / 1000;
    return summarizeInk(
      strokesRef.current,
      inkSecondsRef.current + inFlight,
      clearedRef.current,
    );
  }, []);

  return {
    canvasRef,
    handlers: {
      onPointerDown: pointerDown,
      onPointerMove: pointerMove,
      onPointerUp: pointerUp,
      onPointerCancel: pointerCancel,
      onAuxClick: auxClick,
    },
    strokes,
    isEmpty: strokes.length === 0,
    width,
    setWidth: chooseWidth,
    color,
    setColor: chooseColor,
    undo,
    clear,
    view,
    panning,
    moved: !isIdentityView(view),
    resetView,
    toDocument,
    summary,
  };
}

/** Ink follows the foreground token so it stays readable on any card colour. */
function inkColor(): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
  return value || "#384248";
}
