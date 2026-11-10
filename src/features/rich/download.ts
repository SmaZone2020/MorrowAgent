/**
 * Files produced by a rich block (an SVG figure, a plot, a mind map) are handed
 * to the webview as a blob. Downloading through an anchor keeps the path out of
 * the app: no file-system permission, no dialog plugin, and it works the same
 * in the browser preview.
 */
export function downloadText(filename: string, text: string, type = "text/plain"): void {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // The blob must outlive the click handler that started the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Makes a serialized SVG self-contained so it opens on its own. */
export function standaloneSvg(svg: string): string {
  if (/xmlns=/.test(svg)) return svg;
  return svg.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
}

export function safeFileName(title: string, extension: string): string {
  const base = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 60);
  return `${base || "figure"}.${extension}`;
}

export function downloadSvg(title: string, svg: string): void {
  downloadText(safeFileName(title, "svg"), standaloneSvg(svg), "image/svg+xml");
}
