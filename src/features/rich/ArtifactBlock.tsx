import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownToLine, ChevronsExpandHorizontal } from "@gravity-ui/icons";
import { MathLabel } from "@/components/MathLabel";
import {
  ArtifactAction,
  ArtifactFrame,
  ArtifactOverlay,
} from "@/features/rich/ArtifactFrame";
import { downloadSvg } from "@/features/rich/download";
import { sanitizeSvg } from "@/features/rich/sanitizeSvg";
import { FunctionPlot } from "@/features/plot/FunctionPlot";
import { parsePlotSpec } from "@/features/plot/plotSpec";
import { MindMap } from "@/features/mindmap/MindMap";
import { parseMindMapSpec } from "@/features/mindmap/mindmapSpec";

/** Serializes whatever SVG is on screen, so a download matches the current view. */
function useSvgDownload(title: string) {
  const ref = useRef<HTMLDivElement>(null);
  return {
    ref,
    save: () => {
      const svg = ref.current?.querySelector("svg");
      if (!svg) return;
      const clone = svg.cloneNode(true) as SVGElement;
      // A viewBox lets the saved file scale; the on-screen transform does not.
      if (!clone.getAttribute("viewBox")) {
        const box = svg.getBoundingClientRect();
        clone.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      }
      clone.removeAttribute("style");
      downloadSvg(title, clone.outerHTML);
    },
  };
}

function Frame({
  title,
  onSave,
  body,
  full,
}: {
  /** Plain name, used for the download filename and the dialog's aria-label. */
  title: string;
  onSave: () => void;
  body: ReactNode;
  full: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // A model-written title often carries maths (`y = e^(-k·x²)`), so the visible
  // heading is typeset while the plain string stays behind for aria and files.
  const heading = <MathLabel>{title}</MathLabel>;
  return (
    <>
      <ArtifactFrame
        title={heading}
        actions={
          <>
            <ArtifactAction label="下载" onClick={onSave}>
              <ArrowDownToLine className="size-4" />
            </ArtifactAction>
            <ArtifactAction label="放大" onClick={() => setOpen(true)}>
              <ChevronsExpandHorizontal className="size-4" />
            </ArtifactAction>
          </>
        }
      >
        {body}
      </ArtifactFrame>
      <ArtifactOverlay
        open={open}
        title={title}
        heading={heading}
        onClose={() => setOpen(false)}
      >
        {full}
      </ArtifactOverlay>
    </>
  );
}

function SvgBlock({ source, index }: { source: string; index: number }) {
  const markup = useMemo(() => sanitizeSvg(source), [source]);
  const title = `SVG 图 ${index + 1}`;
  const download = useSvgDownload(title);

  if (!markup) {
    return (
      <pre className="my-3 overflow-x-auto rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
        <code>{source}</code>
      </pre>
    );
  }

  const body = (
    <div
      ref={download.ref}
      className="[&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[380px] [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );

  return (
    <Frame
      title={title}
      onSave={download.save}
      body={body}
      full={
        <div
          className="[&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-h-[70vh] [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      }
    />
  );
}

function PlotBlock({ source }: { source: string }) {
  const spec = useMemo(() => parsePlotSpec(source), [source]);
  const download = useSvgDownload(spec?.title || "函数图像");

  if (!spec) {
    return (
      <pre className="my-3 overflow-x-auto rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
        <code>{source}</code>
      </pre>
    );
  }

  const title = spec.title || "函数图像";
  return (
    <Frame
      title={title}
      onSave={download.save}
      body={
        <div ref={download.ref}>
          <FunctionPlot spec={spec} />
        </div>
      }
      full={
        <div className="mx-auto max-w-3xl">
          <FunctionPlot spec={spec} />
        </div>
      }
    />
  );
}

function MindMapBlock({ source }: { source: string }) {
  const spec = useMemo(() => parseMindMapSpec(source), [source]);
  const download = useSvgDownload(spec?.title || "思维导图");

  if (!spec) {
    return (
      <pre className="my-3 overflow-x-auto rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
        <code>{source}</code>
      </pre>
    );
  }

  const title = spec.title || "思维导图";
  return (
    <Frame
      title={title}
      onSave={download.save}
      body={
        <div ref={download.ref}>
          <MindMap spec={spec} />
        </div>
      }
      full={
        <div className="mx-auto max-w-4xl">
          <MindMap spec={spec} />
        </div>
      }
    />
  );
}

function ImageBlock({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const title = alt || "图片";
  // Only inline and local data are drawn: a reply cannot point the app at an
  // arbitrary remote host.
  const allowed = /^(data:image\/|https?:\/\/)/i.test(src);

  if (!allowed) {
    return (
      <p className="my-2 text-sm text-muted-foreground">不支持的图片地址。</p>
    );
  }

  const image = (
    <img
      src={src}
      alt={alt}
      className="mx-auto h-auto max-h-[380px] w-auto max-w-full rounded-lg"
    />
  );
  return (
    <>
      <ArtifactFrame
        title={title}
        actions={
          <>
            <ArtifactAction
              label="下载"
              onClick={() => {
                const anchor = document.createElement("a");
                anchor.href = src;
                anchor.download = title;
                anchor.rel = "noopener";
                anchor.target = "_blank";
                anchor.click();
              }}
            >
              <ArrowDownToLine className="size-4" />
            </ArtifactAction>
            <ArtifactAction label="放大" onClick={() => setOpen(true)}>
              <ChevronsExpandHorizontal className="size-4" />
            </ArtifactAction>
          </>
        }
      >
        {image}
      </ArtifactFrame>
      <ArtifactOverlay
        open={open}
        title={title}
        heading={<MathLabel>{title}</MathLabel>}
        onClose={() => setOpen(false)}
      >
        <img
          src={src}
          alt={alt}
          className="mx-auto h-auto max-h-[70vh] w-auto max-w-full rounded-lg"
        />
      </ArtifactOverlay>
    </>
  );
}

/** Routes one fenced block to the artifact that understands it. */
export function FenceBlock({
  lang,
  content,
  index,
}: {
  lang: string;
  content: string;
  index: number;
}) {
  if (lang === "svg") return <SvgBlock source={content} index={index} />;
  if (lang === "plot" || lang === "graph" || lang === "function") {
    return <PlotBlock source={content} />;
  }
  if (lang === "mindmap" || lang === "mind-map") {
    return <MindMapBlock source={content} />;
  }
  if (lang === "image" || lang === "img") {
    return <ImageBlock src={content.trim()} alt="" />;
  }
  // Unknown languages are code, which is what a fence means by default.
  return (
    <pre className="my-3 overflow-x-auto rounded-xl bg-muted/60 p-3 text-sm text-foreground">
      <code className="font-mono">{content}</code>
    </pre>
  );
}

export { ImageBlock };
