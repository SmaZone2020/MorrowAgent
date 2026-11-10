import { useMemo } from "react";
import type { CSSProperties } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Splits `$...$` and `$$...$$` out of a string. The question bank stores stems
 * as plain text with LaTeX inline, which is the format authors already write;
 * this is the only place that knows about it.
 */
interface Segment {
  math: boolean;
  display: boolean;
  value: string;
}

export function splitMath(text: string): Segment[] {
  const segments: Segment[] = [];
  let index = 0;

  while (index < text.length) {
    const blockStart = text.indexOf("$$", index);
    const inlineStart = text.indexOf("$", index);

    // A single `$` inside a `$$` pair must not win, so the block search runs
    // first and only falls back to inline when it opens earlier.
    const opensBlock = blockStart !== -1 && (inlineStart === -1 || blockStart <= inlineStart);
    const start = opensBlock ? blockStart : inlineStart;
    if (start === -1) {
      segments.push({ math: false, display: false, value: text.slice(index) });
      break;
    }

    if (start > index) {
      segments.push({ math: false, display: false, value: text.slice(index, start) });
    }

    const delimiter = opensBlock ? "$$" : "$";
    const end = text.indexOf(delimiter, start + delimiter.length);
    if (end === -1) {
      // Unclosed delimiter: keep the rest as text rather than dropping it.
      segments.push({ math: false, display: false, value: text.slice(start) });
      break;
    }

    segments.push({
      math: true,
      display: opensBlock,
      value: text.slice(start + delimiter.length, end),
    });
    index = end + delimiter.length;
  }

  return segments;
}

function renderMath(value: string, display: boolean): string {
  try {
    return katex.renderToString(value, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    // KaTeX with throwOnError:false rarely throws, but a malformed source must
    // still show something readable instead of blanking the question.
    return value;
  }
}

export function MathText({
  children,
  className,
  style,
}: {
  children: string;
  className?: string;
  style?: CSSProperties;
}) {
  const segments = useMemo(() => splitMath(children), [children]);

  return (
    <span className={className} style={style}>
      {segments.map((segment, index) =>
        segment.math ? (
          <span
            key={index}
            className={segment.display ? "my-1 block overflow-x-auto" : undefined}
            dangerouslySetInnerHTML={{
              __html: renderMath(segment.value, segment.display),
            }}
          />
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </span>
  );
}
