/**
 * Model-authored SVG is untrusted markup. It is parsed in an inert document and
 * rebuilt from an allow-list: no scripts, no foreign HTML, no event handlers,
 * no external references. What comes back is a static drawing.
 */
const BLOCKED_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "animate",
  "set",
  "handler",
]);

const ALLOWED_URL = /^(#|data:image\/(png|jpeg|gif|webp|svg\+xml);)/i;

function scrub(element: Element): void {
  for (const child of Array.from(element.children)) {
    if (BLOCKED_TAGS.has(child.tagName.toLowerCase())) {
      child.remove();
      continue;
    }
    for (const attribute of Array.from(child.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith("on")) {
        child.removeAttribute(attribute.name);
        continue;
      }
      if ((name === "href" || name === "xlink:href" || name === "src") && !ALLOWED_URL.test(value.trim())) {
        child.removeAttribute(attribute.name);
        continue;
      }
      if (name === "style" && /url\s*\(\s*['"]?\s*(javascript|https?:)/i.test(value)) {
        child.removeAttribute(attribute.name);
      }
    }
    scrub(child);
  }
}

/**
 * Returns standalone SVG markup, or null when the source is not an `<svg>`
 * element at all. A drawing that fails to parse is dropped rather than shown
 * as escaped source.
 */
export function sanitizeSvg(source: string): string | null {
  const trimmed = source.trim();
  if (!trimmed.startsWith("<")) return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(trimmed, "image/svg+xml");
  } catch {
    return null;
  }
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") return null;
  if (doc.getElementsByTagName("parsererror").length > 0) return null;

  scrub(root);
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  // A viewBox keeps the drawing scalable once the block controls its width.
  if (!root.getAttribute("viewBox")) {
    const width = Number.parseFloat(root.getAttribute("width") ?? "");
    const height = Number.parseFloat(root.getAttribute("height") ?? "");
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      root.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
  }
  root.removeAttribute("width");
  root.removeAttribute("height");
  return new XMLSerializer().serializeToString(root);
}
