/**
 * The subset of Markdown a tutoring reply actually uses: headings, paragraphs,
 * lists, quotes, rules, tables, fenced blocks and inline emphasis. Writing it
 * here instead of adding a renderer keeps the artifact fences (plot, mindmap,
 * svg) in the same parse pass, which is what lets them stream in place.
 */
export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "fence"; lang: string; content: string }
  | { kind: "list"; ordered: boolean; start: number; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "rule" }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "math"; value: string }
  | { kind: "image"; alt: string; src: string };

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*(\d+)[.)]\s+(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
/** A paragraph that is nothing but one image is promoted to its own block. */
const IMAGE_ONLY = /^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;

export function splitTableRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index]!;
    // `\|` is an escaped pipe inside a cell.
    if (char === "\\" && inner[index + 1] === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  const isTableDivider = (line: string) =>
    /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/.test(line) && line.includes("-");

  while (index < lines.length) {
    const line = lines[index]!;

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1]!;
      const lang = (fence[2] ?? "").toLowerCase();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]!.trim().startsWith(marker)) {
        body.push(lines[index]!);
        index += 1;
      }
      // An unterminated fence is normal mid-stream: show what has arrived.
      index += 1;
      blocks.push({ kind: "fence", lang, content: body.join("\n") });
      continue;
    }

    if (line.trim().startsWith("$$")) {
      const rest = line.trim().slice(2);
      if (rest.endsWith("$$") && rest.length > 2) {
        blocks.push({ kind: "math", value: rest.slice(0, -2) });
        index += 1;
        continue;
      }
      const body: string[] = rest ? [rest] : [];
      index += 1;
      while (index < lines.length && !lines[index]!.includes("$$")) {
        body.push(lines[index]!);
        index += 1;
      }
      if (index < lines.length) {
        body.push(lines[index]!.split("$$")[0]!);
        index += 1;
      }
      blocks.push({ kind: "math", value: body.join("\n").trim() });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1]!.length,
        text: heading[2]!.trim(),
      });
      index += 1;
      continue;
    }

    const image = IMAGE_ONLY.exec(line);
    if (image) {
      blocks.push({ kind: "image", alt: image[1]!.trim(), src: image[2]!.trim() });
      index += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith(">")) {
      const body: string[] = [];
      while (index < lines.length && lines[index]!.trimStart().startsWith(">")) {
        body.push(lines[index]!.trimStart().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "quote", text: body.join("\n").trim() });
      continue;
    }

    if (TABLE_ROW.test(line) && index + 1 < lines.length && isTableDivider(lines[index + 1]!)) {
      const head = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && TABLE_ROW.test(lines[index]!)) {
        rows.push(splitTableRow(lines[index]!));
        index += 1;
      }
      blocks.push({ kind: "table", head, rows });
      continue;
    }

    const ul = UL_ITEM.exec(line);
    const ol = OL_ITEM.exec(line);
    if (ul || ol) {
      const ordered = Boolean(ol);
      const start = ol ? Number(ol[1]) : 1;
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index]!;
        const nextUl = UL_ITEM.exec(current);
        const nextOl = OL_ITEM.exec(current);
        if (ordered ? nextOl : nextUl) {
          const text = ordered ? nextOl?.[2] : nextUl?.[1];
          items.push((text ?? "").trim());
          index += 1;
          continue;
        }
        // An indented line continues the previous item.
        if (current.trim() && /^\s{2,}/.test(current) && items.length > 0) {
          items[items.length - 1] += `\n${current.trim()}`;
          index += 1;
          continue;
        }
        break;
      }
      blocks.push({ kind: "list", ordered, start, items });
      continue;
    }

    // Paragraph: collect until a blank line or something that starts a block.
    const body: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const current = lines[index]!;
      if (
        !current.trim() ||
        FENCE.test(current) ||
        HEADING.test(current) ||
        RULE.test(current) ||
        UL_ITEM.test(current) ||
        OL_ITEM.test(current) ||
        current.trimStart().startsWith(">") ||
        current.trim().startsWith("$$")
      ) {
        break;
      }
      body.push(current);
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: body.join("\n").trim() });
  }

  return blocks;
}
