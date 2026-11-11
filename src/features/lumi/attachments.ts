import type { MessageAttachment } from "@/features/lumi/history";
import { compressImage, IMAGE_MIMES } from "@/features/lumi/imageResize";
import { extractPdfText } from "@/features/lumi/pdfText";

/**
 * What the composer will accept.
 *
 * The list is closed on purpose: every accepted type has a reader here, and a
 * file that cannot be read would only produce a silent, empty request. `docx`
 * is not in this phase — it needs a separate parser and its layout carries
 * meaning that plain text loses.
 */
export const TEXT_MIMES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
];

export const TEXT_EXTENSIONS = [".md", ".txt", ".csv", ".json"];

/** One upload cap, checked before any parsing happens. */
export const MAX_ATTACHMENT_BYTES = 24 * 1024 * 1024;

export const MAX_ATTACHMENTS = 6;

/** Documents are clipped to what a request can carry without crowding out chat. */
export const MAX_TEXT_CHARS = 40_000;

let counter = 0;

function newId(): string {
  counter += 1;
  return `att-${Date.now()}-${counter}`;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/** True when this client has a reader for the file. */
export function isSupported(file: File): boolean {
  if (IMAGE_MIMES.includes(file.type)) return true;
  if (file.type === "application/pdf") return true;
  if (TEXT_MIMES.includes(file.type)) return true;
  // Browsers report an empty type for a `.md` file on Windows, so the
  // extension is the fallback rather than the primary signal.
  return TEXT_EXTENSIONS.includes(extensionOf(file.name));
}

/**
 * Reads one file into the shape the transcript stores.
 *
 * The result carries what the model needs — image bytes, or the text pulled out
 * of a document — plus enough metadata to draw a chip on screen. Throws with a
 * sentence the user can act on, because every failure here is a file choice.
 */
export async function readAttachment(file: File): Promise<MessageAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} 超过 24 MB`);
  }

  if (IMAGE_MIMES.includes(file.type)) {
    const image = await compressImage(file);
    return {
      id: newId(),
      kind: "image",
      name: file.name,
      mimeType: image.mimeType,
      size: image.size,
      data: image.data,
      text: "",
    };
  }

  if (file.type === "application/pdf") {
    const extracted = await extractPdfText(file);
    if (!extracted.text.trim()) {
      throw new Error(
        `${file.name} 没有可提取的文字（可能是扫描件），请改传截图`,
      );
    }
    return {
      id: newId(),
      kind: "document",
      name: file.name,
      mimeType: "application/pdf",
      size: file.size,
      data: "",
      text: extracted.text.slice(0, MAX_TEXT_CHARS),
    };
  }

  if (TEXT_MIMES.includes(file.type) || TEXT_EXTENSIONS.includes(extensionOf(file.name))) {
    const text = await file.text();
    return {
      id: newId(),
      kind: "document",
      name: file.name,
      mimeType: file.type || "text/plain",
      size: file.size,
      data: "",
      text: text.slice(0, MAX_TEXT_CHARS),
    };
  }

  throw new Error(`暂不支持 ${file.name} 这种格式`);
}

/** Human-readable size, for the chip under the composer. */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
