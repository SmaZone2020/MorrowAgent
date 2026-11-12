import { Fragment, useState, type ReactNode } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { ExternalLink } from "@/features/rich/LinkGuard";
import { ArtifactOverlay } from "@/features/rich/ArtifactFrame";
import { QuestionReference } from "@/features/knowledge/QuestionReference";
import { referenceAt } from "@/features/knowledge/reference";
import { useMediaSource } from "@/features/library/media";

type Inline =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] }
  | { kind: "image"; src: string; alt: string }
  | { kind: "math"; value: string; display: boolean }
  | { kind: "question"; id: string };

const INLINE_MATH = /^(\$[^$\n]+\$|\\\(.+?\\\))/;
const LINK = /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/;
const STRONG = /^(\*\*|__)(?=\S)([\s\S]*?\S)\1/;
const EM = /^(\*|_)(?=\S)([\s\S]*?\S)\1/;
const CODE = /^`([^`\n]+)`/;
/** A bare URL in prose is still a link; the model rarely brackets every one. */
const BARE_URL = /^https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?'"，。；：！？）】]/;

/** Only http(s) and in-page links: a reply has no business opening other schemes. */
function safeHref(href: string): string | null {
  const value = href.trim();
  if (value.startsWith("#")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let rest = source;

  const pushText = (value: string) => {
    if (!value) return;
    const last = out.at(-1);
    if (last?.kind === "text") last.value += value;
    else out.push({ kind: "text", value });
  };

  while (rest.length > 0) {
    const math = INLINE_MATH.exec(rest);
    if (math) {
      const raw = math[0];
      const value = raw.startsWith("\\(") ? raw.slice(2, -2) : raw.slice(1, -1);
      out.push({ kind: "math", value, display: false });
      rest = rest.slice(raw.length);
      continue;
    }

    const code = CODE.exec(rest);
    if (code) {
      out.push({ kind: "code", value: code[1]! });
      rest = rest.slice(code[0].length);
      continue;
    }

    const image = IMAGE.exec(rest);
    if (image) {
      out.push({ kind: "image", alt: image[1]!, src: image[2]! });
      rest = rest.slice(image[0].length);
      continue;
    }

    const link = LINK.exec(rest);
    if (link) {
      const href = safeHref(link[2]!);
      if (href) {
        out.push({
          kind: "link",
          href,
          children: parseInline(link[1]!),
        });
        rest = rest.slice(link[0].length);
        continue;
      }
    }

    const strong = STRONG.exec(rest);
    if (strong) {
      out.push({ kind: "strong", children: parseInline(strong[2]!) });
      rest = rest.slice(strong[0].length);
      continue;
    }

    const em = EM.exec(rest);
    if (em) {
      out.push({ kind: "em", children: parseInline(em[2]!) });
      rest = rest.slice(em[0].length);
      continue;
    }

    const bare = BARE_URL.exec(rest);
    if (bare) {
      out.push({ kind: "link", href: bare[0], children: [{ kind: "text", value: bare[0] }] });
      rest = rest.slice(bare[0].length);
      continue;
    }

    // A question reference is a pointer into the package, so it becomes a chip
    // instead of a run of hex in the sentence.
    if (rest.startsWith("@")) {
      const questionId = referenceAt(rest);
      if (questionId) {
        out.push({ kind: "question", id: questionId });
        rest = rest.slice(questionId.length + 1);
        continue;
      }
      // Not a question id: the character is prose, and stepping over it keeps
      // the next token (math, a link) from being swallowed by the text run.
      pushText("@");
      rest = rest.slice(1);
      continue;
    }

    // Consume plain text up to the next thing that might start a token.
    const marker = rest.slice(1).search(/[$`*_![\\@]/);
    const scheme = rest.slice(1).search(/https?:\/\//);
    const candidates = [marker, scheme].filter((index) => index !== -1);
    const take = candidates.length === 0 ? rest.length : Math.min(...candidates) + 1;
    pushText(rest.slice(0, take));
    rest = rest.slice(take);
  }

  return out;
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
    return value;
  }
}

function InlineImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const media = useMediaSource(src);
  if (!media.url) {
    return (
      <span className="my-1 block text-sm text-muted-foreground">
        {media.status === "loading" ? "正在读取图片…" : "图片无法显示。"}
      </span>
    );
  }
  return (
    <>
      <span className="my-2 block">
        <img
          src={media.url}
          alt={alt}
          onClick={() => setOpen(true)}
          className="mx-auto h-auto max-h-[320px] w-auto max-w-full cursor-zoom-in rounded-lg"
        />
      </span>
      <ArtifactOverlay
        open={open}
        title={alt || "图片"}
        heading={alt || "图片"}
        onClose={() => setOpen(false)}
      >
        <img
          src={media.url}
          alt={alt}
          className="mx-auto h-auto max-h-[70vh] w-auto max-w-full rounded-lg"
        />
      </ArtifactOverlay>
    </>
  );
}

function render(inline: Inline, key: string): ReactNode {
  switch (inline.kind) {
    case "text":
      return <Fragment key={key}>{inline.value}</Fragment>;
    case "image":
      return <InlineImage key={key} src={inline.src} alt={inline.alt} />;
    case "code":
      return (
        <code
          key={key}
          className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
        >
          {inline.value}
        </code>
      );
    case "strong":
      return (
        <strong key={key} className="font-semibold text-foreground">
          {inline.children.map((child, index) => render(child, `${key}-${index}`))}
        </strong>
      );
    case "em":
      return (
        <em key={key} className="italic">
          {inline.children.map((child, index) => render(child, `${key}-${index}`))}
        </em>
      );
    case "link":
      return (
        <ExternalLink key={key} href={inline.href}>
          {inline.children.map((child, index) => render(child, `${key}-${index}`))}
        </ExternalLink>
      );
    case "math":
      return (
        <span
          key={key}
          className={inline.display ? "my-1 block overflow-x-auto" : "inline-block"}
          dangerouslySetInnerHTML={{ __html: renderMath(inline.value, inline.display) }}
        />
      );
    case "question":
      return <QuestionReference key={key} id={inline.id} />;
  }
}

/** Inline Markdown plus `$…$` / `\(…\)` math, in one pass. */
export function InlineText({ text }: { text: string }) {
  const inline = parseInline(text);
  return <>{inline.map((entry, index) => render(entry, String(index)))}</>;
}
