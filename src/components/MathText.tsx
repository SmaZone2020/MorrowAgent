import { useMemo } from "react";
import type { CSSProperties } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { splitMath } from "@/components/splitMath";

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
