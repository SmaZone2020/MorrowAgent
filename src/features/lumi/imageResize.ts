/**
 * Shrinks a photo before it leaves the machine.
 *
 * A phone photo is several megabytes and a vision model does not need that:
 * the text on a page is legible well below the camera's native resolution, and
 * an oversized upload is the most common reason a provider rejects a request.
 * Scaling is done on a canvas, so the browser does the decode.
 */
export const MAX_IMAGE_EDGE = 1600;

/** Above this a re-encode is worth the quality loss; below it, send as-is. */
const KEEP_BYTES = 900 * 1024;

/** Only these survive a round trip through the wire formats we speak. */
export const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Fits a box of `width × height` inside a square of `maxEdge`, preserving the
 * aspect ratio and never upscaling.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export interface CompressedImage {
  /** Base64 without the `data:` prefix. */
  data: string;
  mimeType: string;
  size: number;
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma === -1 ? "" : result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Re-encodes one image so the longest edge is at most `MAX_IMAGE_EDGE`.
 *
 * A small image is passed through untouched: re-encoding a screenshot only
 * makes the text fuzzier. Anything bigger becomes WebP, which keeps more detail
 * per byte than JPEG at the same size.
 */
export async function compressImage(file: File): Promise<CompressedImage> {
  if (file.size <= KEEP_BYTES) {
    return {
      data: await toBase64(file),
      mimeType: file.type || "image/png",
      size: file.size,
    };
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // A format the browser cannot decode is better sent whole than dropped.
    return {
      data: await toBase64(file),
      mimeType: file.type || "image/png",
      size: file.size,
    };
  }

  const target = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return {
      data: await toBase64(file),
      mimeType: file.type || "image/png",
      size: file.size,
    };
  }
  context.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) {
    return {
      data: await toBase64(file),
      mimeType: file.type || "image/png",
      size: file.size,
    };
  }

  return {
    data: await toBase64(blob),
    mimeType: blob.type || "image/webp",
    size: blob.size,
  };
}
