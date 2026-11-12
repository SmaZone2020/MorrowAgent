/**
 * Model-authored HTML is untrusted markup: it arrives inside a reply, and a
 * reply can be influenced by anything the model read. It is parsed in an inert
 * document and rebuilt from an allow-list, so what reaches the page is a static
 * layout — never a script, an event handler or a link that leaves silently.
 *
 * The class attribute is passed through but constrained to a published
 * vocabulary (see `htmlClasses.ts`): Tailwind only ships classes it saw at build
 * time, so anything outside the list would render unstyled anyway. The same file
 * generates the list the prompt shows the model, so the two cannot drift.
 */
import { HTML_CLASSES } from "@/features/rich/htmlClasses";

const BLOCKED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "select",
  "option",
  "textarea",
  "audio",
  "video",
  "source",
  "track",
  "canvas",
  "svg",
  "math",
  "template",
  "slot",
  "portal",
]);

const ALLOWED_TAGS = new Set([
  "div",
  "span",
  "p",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "code",
  "kbd",
  "sup",
  "sub",
  "small",
  "mark",
  "abbr",
  "br",
  "hr",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "figure",
  "figcaption",
  "blockquote",
  "q",
  "cite",
]);

/**
 * The set the sanitizer checks each token against. It is derived, never written
 * twice: `htmlClasses.ts` is the one place a class is declared.
 */
const ALLOWED_CLASS = new Set<string>(HTML_CLASSES);

/** Attributes that survive the rebuild, per tag family. */
const ALLOWED_ATTRIBUTES = new Set([
  "class",
  "colspan",
  "rowspan",
  "scope",
  "title",
  "lang",
  "dir",
]);

function scrubAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    if (name.startsWith("on") || name === "style" || name === "id") {
      element.removeAttribute(attribute.name);
      continue;
    }
    if (!ALLOWED_ATTRIBUTES.has(name)) {
      element.removeAttribute(attribute.name);
      continue;
    }
    if (name === "class") {
      const kept = attribute.value
        .split(/\s+/)
        .filter((token) => ALLOWED_CLASS.has(token));
      if (kept.length > 0) element.setAttribute("class", kept.join(" "));
      else element.removeAttribute("class");
    }
  }
}

/**
 * Rebuilds a subtree into `output`. Only allowed tags are copied; a disallowed
 * one is unwrapped rather than dropped, so its text content survives.
 */
function rebuild(source: Element, output: Element): void {
  for (const node of Array.from(source.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      output.appendChild(document.createTextNode(node.textContent ?? ""));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) continue;

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap: keep what the user can read, drop the container.
      rebuild(element, output);
      continue;
    }

    const copy = document.createElement(tag);
    scrubAttributes(element);
    for (const attribute of Array.from(element.attributes)) {
      copy.setAttribute(attribute.name, attribute.value);
    }
    rebuild(element, copy);
    output.appendChild(copy);
  }
}

/**
 * Returns safe markup, or null when the source is empty or not HTML at all.
 */
export function sanitizeHtml(source: string): string | null {
  const trimmed = source.trim();
  if (!trimmed) return null;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(trimmed, "text/html");
  } catch {
    return null;
  }
  if (doc.getElementsByTagName("parsererror").length > 0) return null;

  const output = document.createElement("div");
  rebuild(doc.body, output);
  // An empty rebuild means everything was blocked; showing nothing is honest.
  if (!output.textContent?.trim() && output.childElementCount === 0) return null;
  return output.innerHTML;
}
