import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { InlineText } from "@/features/rich/InlineText";
import { FenceBlock, ImageBlock } from "@/features/rich/ArtifactBlock";
import { parseMarkdown } from "@/features/rich/markdownBlocks";

function DisplayMath({ value }: { value: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(value, {
        displayMode: true,
        throwOnError: false,
        strict: false,
        output: "html",
      });
    } catch {
      return value;
    }
  }, [value]);
  return (
    <div
      className="my-2 overflow-x-auto text-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "mt-4 text-lg font-semibold",
  2: "mt-3.5 text-base font-semibold",
  3: "mt-3 text-sm font-semibold",
  4: "mt-2.5 text-sm font-semibold",
  5: "mt-2 text-sm font-medium",
  6: "mt-2 text-sm font-medium",
};

/**
 * Renders one assistant reply. Blocks stream in as they arrive, so nothing here
 * caches across renders beyond the parse itself.
 */
export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  return (
    <div className="flex flex-col gap-2 text-sm leading-7 text-foreground">
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;
        switch (block.kind) {
          case "heading": {
            const Tag = (`h${Math.min(6, block.level + 1)}`) as "h2";
            return (
              <Tag
                key={key}
                className={`${HEADING_CLASS[block.level] ?? "mt-2 text-sm font-semibold"} text-foreground`}
              >
                <InlineText text={block.text} />
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={key} className="whitespace-pre-wrap">
                <InlineText text={block.text} />
              </p>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={key}
                start={block.ordered ? block.start : undefined}
                className={`flex flex-col gap-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="whitespace-pre-wrap pl-0.5">
                    <InlineText text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-2 border-border pl-3 text-muted-foreground"
              >
                <InlineText text={block.text} />
              </blockquote>
            );
          case "rule":
            return <hr key={key} className="my-2 border-border/70" />;
          case "table":
            return (
              <div key={key} className="my-2 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th
                          key={cellIndex}
                          className="border-b border-border px-2 py-1.5 text-left font-medium text-foreground"
                        >
                          <InlineText text={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border-b border-border/60 px-2 py-1.5 align-top"
                          >
                            <InlineText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "math":
            return <DisplayMath key={key} value={block.value} />;
          case "fence":
            return (
              <FenceBlock
                key={key}
                lang={block.lang}
                content={block.content}
                index={index}
              />
            );
          case "image":
            return <ImageBlock key={key} src={block.src} alt={block.alt} />;
        }
      })}
    </div>
  );
}
