/**
 * Pulls the text out of a PDF, in the browser.
 *
 * The point is not to render the page: a model that can read is cheaper and
 * more accurate on text than on a photograph of that text, and a 30-page paper
 * would not fit in a request as images anyway. Scanned pages have no text
 * layer, so the result is empty for them and the caller falls back to saying
 * so rather than silently sending nothing.
 */
export interface ExtractedPdf {
  text: string;
  /** Pages whose text layer was empty, which usually means a scan. */
  scannedPages: number;
  pages: number;
}

/** Enough for a chapter; a whole book would not fit in a request anyway. */
export const MAX_PDF_CHARS = 40_000;

/**
 * Reads one PDF file into plain text.
 *
 * `pdfjs-dist` is imported lazily so a PDF-free session never pays for the
 * parser, and the worker is bundled by Vite rather than fetched from a CDN.
 */
export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data: bytes });
  const doc = await task.promise;

  const parts: string[] = [];
  let scanned = 0;
  let total = 0;

  try {
    for (let page = 1; page <= doc.numPages; page += 1) {
      const loaded = await doc.getPage(page);
      const content = await loaded.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (text) {
        // A blank line between pages keeps the structure readable for the
        // model, which is the only consumer of this string.
        parts.push(text);
        total += text.length;
      } else {
        scanned += 1;
      }

      if (total >= MAX_PDF_CHARS) {
        parts.push(`（已截断，原文共 ${doc.numPages} 页）`);
        break;
      }
    }
  } finally {
    await task.destroy().catch(() => undefined);
  }

  return {
    text: parts.join("\n\n").slice(0, MAX_PDF_CHARS),
    scannedPages: scanned,
    pages: doc.numPages,
  };
}
