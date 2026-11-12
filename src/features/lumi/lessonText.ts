/**
 * The text a knowledge point gives to a search index or a tool.
 *
 * A lesson body is Markdown with figures, headings and LaTeX. Keeping it whole
 * would make `search_knowledge` match on markup (`![]`, `$$`) and would spend
 * most of a tool result on syntax the model cannot use. Stripping the markup
 * keeps the words that actually describe the topic.
 */
export function stripMarkdown(body: string): string {
  return body
    // Figures and links keep their alt text but lose the syntax.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    // Display math keeps its contents: it is part of the lesson.
    .replace(/\$\$([\s\S]*?)\$\$/g, " $1 ")
    .replace(/\$([^$\n]*)\$/g, " $1 ")
    // Headings, block quotes, list bullets and emphasis markers. An underscore
    // is kept: inside math it is a subscript, and losing `x_0` would corrupt the
    // very text the model is about to quote back.
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/[*`]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A lesson longer than this is summarised by the model's own reading, not sent whole. */
export const BODY_LIMIT = 4000;

/**
 * Caps a body at a readable size on a paragraph boundary where possible, so the
 * model is not handed a sentence cut in half. The truncation is announced: a
 * silent cut would read as the end of the lesson.
 */
export function truncateBody(body: string, limit = BODY_LIMIT): string {
  if (body.length <= limit) return body;
  const cut = body.slice(0, limit);
  const boundary = Math.max(cut.lastIndexOf("\n\n"), cut.lastIndexOf("。"));
  const kept = boundary > limit * 0.6 ? cut.slice(0, boundary + 1) : cut;
  return `${kept.trimEnd()}\n\n（正文已截断）`;
}
