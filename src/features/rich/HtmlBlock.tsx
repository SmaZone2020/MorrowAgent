import { useMemo } from "react";
import { sanitizeHtml } from "@/features/rich/sanitizeHtml";

/**
 * A small layout the model wrote.
 *
 * It is rendered inside the reply flow rather than in an artifact frame: the
 * point is to show information in place, and a frame with a title bar would
 * make a two-row comparison look like a document. Links are not allowed at all
 * — a reply that needs one writes a normal Markdown link, which goes through
 * the confirmation dialog.
 */
export function HtmlBlock({ source }: { source: string }) {
  const markup = useMemo(() => sanitizeHtml(source), [source]);

  if (!markup) {
    return (
      <pre className="my-3 overflow-x-auto rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
        <code>{source}</code>
      </pre>
    );
  }

  return (
    // No width cap: this is text and tables, and the reply column already
    // bounds it. Only pictures get their own limit (see `ArtifactFrame`), since
    // a figure wider than the column would force horizontal scrolling.
    <div
      className="my-3 text-sm leading-6 text-foreground [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-border/60 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_th]:border-b [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium"
      // The markup has already been rebuilt from an allow-list, so nothing
      // executable can reach the document through it.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
