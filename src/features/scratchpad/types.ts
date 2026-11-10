export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface Stroke {
  points: StrokePoint[];
  /**
   * Nib width used when the stroke was drawn. Optional so ink recorded before
   * the pen had a width control still replays at the default.
   */
  width?: number;
}

/**
 * Serialized stroke data. The version travels with the payload because replays
 * and any future migration must be able to tell which shape they are reading.
 */
export interface StrokeDocument {
  version: 1;
  width: number;
  height: number;
  strokes: Stroke[];
}

export const STROKE_DOCUMENT_VERSION = 1 as const;

export function emptyDocument(width = 0, height = 0): StrokeDocument {
  return { version: STROKE_DOCUMENT_VERSION, width, height, strokes: [] };
}
