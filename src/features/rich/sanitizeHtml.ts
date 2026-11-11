/**
 * Model-authored HTML is untrusted markup: it arrives inside a reply, and a
 * reply can be influenced by anything the model read. It is parsed in an inert
 * document and rebuilt from an allow-list, so what reaches the page is a static
 * layout — never a script, an event handler or a link that leaves silently.
 *
 * The class attribute is passed through but constrained to a published
 * vocabulary (see `ALLOWED_CLASS`): Tailwind only ships classes it saw at build
 * time, so anything outside the list would render unstyled anyway.
 */
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
 * The Tailwind subset the reply may use.
 *
 * It is a real allow-list rather than a prefix check: `bg-red-500` is a valid
 * class but not in the theme, and letting it through would make one reply look
 * like a different product.
 */
const ALLOWED_CLASS = new Set([
  // layout
  "block", "inline-block", "inline", "flex", "inline-flex", "grid", "hidden",
  "flex-row", "flex-col", "flex-wrap", "items-start", "items-center", "items-end",
  "justify-start", "justify-center", "justify-between", "justify-end",
  "gap-1", "gap-2", "gap-3", "gap-4", "gap-6",
  "grid-cols-1", "grid-cols-2", "grid-cols-3",
  "flex-1", "shrink-0", "min-w-0", "w-full", "h-full",
  "relative", "absolute", "overflow-hidden", "overflow-x-auto",
  // spacing
  "mt-1", "mt-2", "mt-3", "mt-4", "mb-1", "mb-2", "mb-3", "mb-4",
  "ml-1", "ml-2", "mr-1", "mr-2", "my-1", "my-2", "my-3",
  "p-1", "p-2", "p-3", "p-4", "px-2", "px-3", "px-4", "py-1", "py-2", "py-3",
  // type
  "text-sm", "text-base", "text-lg", "text-xl",
  "font-normal", "font-medium", "font-semibold", "font-bold",
  "text-center", "text-right", "text-left",
  "leading-6", "leading-7", "leading-relaxed",
  "tabular-nums", "font-mono", "font-serif", "truncate", "whitespace-pre-wrap",
  "uppercase", "tracking-wide",
  // colour: semantic tokens only, so both themes work
  "bg-background", "bg-card", "bg-muted", "bg-primary", "bg-accent",
  "bg-success/10", "bg-warning/10", "bg-info/10", "bg-destructive/10",
  "bg-muted/50", "bg-muted/60",
  "text-foreground", "text-muted-foreground", "text-primary", "text-accent-foreground",
  "text-success", "text-warning", "text-info", "text-destructive",
  "text-primary-foreground", "text-card",
  // borders and shape
  "border", "border-t", "border-b", "border-l-2", "border-l-4",
  "border-border", "border-border/60", "border-border/70",
  "border-success/40", "border-warning/40", "border-info/40", "border-destructive/40",
  "rounded", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl", "rounded-full",
  // effects
  "shadow-surface", "opacity-70", "opacity-80",
]);

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
