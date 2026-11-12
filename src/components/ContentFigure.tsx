import katex from "katex";
import type { ContentImage } from "@/features/knowledge";
import { MathText } from "@/components/MathText";
import { useMediaSource } from "@/features/library/media";

/**
 * Renders one authored figure. The `kind` decides how `content` is interpreted,
 * so a formula never has to be wrapped as markup and a URL never goes through
 * the LaTeX path.
 */
export function ContentFigure({ image }: { image: ContentImage }) {
  const label = image.alt ?? image.caption ?? image.type;

  const body = (() => {
    switch (image.kind) {
      case "latex":
        return (
          <span
            role="img"
            aria-label={label}
            className="block overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderLatex(image.content) }}
          />
        );
      case "svg":
        // Authored SVG is data, not prose: it is inlined so it scales with the
        // surrounding text and picks up the current theme colour.
        return (
          <span
            role="img"
            aria-label={label}
            className="block max-w-full [&>svg]:h-auto [&>svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: image.content }}
          />
        );
      case "data_uri":
      case "url":
      case "path":
      default:
        return <FigureImage image={image} label={label} />;
    }
  })();

  return (
    <figure className="flex flex-col items-center gap-1 py-1">
      {body}
      {image.caption ? (
        <figcaption className="text-sm text-muted-foreground">
          <MathText>{image.caption}</MathText>
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * A package figure is a logical path (`media/…`), which only the backend can
 * read, so it goes through the same workspace-scoped cache the Markdown body
 * uses. Data URIs and remote URLs pass straight through.
 */
function FigureImage({ image, label }: { image: ContentImage; label: string }) {
  const media = useMediaSource(resolveSource(image));
  if (!media.url) {
    return (
      <span className="py-2 text-sm text-muted-foreground">
        {media.status === "loading" ? "正在读取配图…" : "配图无法显示。"}
      </span>
    );
  }
  return (
    <img
      src={media.url}
      alt={label}
      width={image.width}
      loading="lazy"
      decoding="async"
      className="h-auto max-w-full rounded-lg"
    />
  );
}

export function ContentFigures({
  images,
  className,
}: {
  images: ContentImage[];
  className?: string;
}) {
  if (images.length === 0) return null;
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {images.map((image, index) => (
        <ContentFigure key={`${image.kind}-${index}`} image={image} />
      ))}
    </div>
  );
}

function resolveSource(image: ContentImage): string {
  if (image.kind === "data_uri") {
    // Authors may paste the payload alone; the mime hint keeps the browser from
    // rejecting a bare base64 string.
    return image.content.startsWith("data:")
      ? image.content
      : `data:${mimeFor(image)};base64,${image.content}`;
  }
  return image.content;
}

function mimeFor(image: ContentImage): string {
  if (image.type === "formula" || image.type === "figure") {
    return image.content.startsWith("iVBOR") ? "image/png" : "image/svg+xml";
  }
  return "image/png";
}

function renderLatex(source: string): string {
  try {
    return katex.renderToString(source, {
      displayMode: true,
      throwOnError: false,
      strict: false,
      output: "html",
    });
  } catch {
    return source;
  }
}
