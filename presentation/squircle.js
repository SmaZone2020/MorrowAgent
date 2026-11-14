// Superellipse ("squircle") surfaces for the whole deck. The path maths is a
// faithful port of figma-squircle (iOS-style corner smoothing), applied per
// element at its measured size so the hairline stroke follows the curve
// instead of being clipped away.
(() => {
  const rad = (deg) => (deg * Math.PI) / 180;
  const n = (v) => Number(v.toFixed(4));

  // Uniform-corner superellipse: the only case the deck needs.
  const path = (width, height, radius, smoothing = 0.6) => {
    const budget = Math.min(width, height) / 2;
    const r = Math.min(radius, budget);
    if (r <= 0) return `M 0 0 L ${n(width)} 0 L ${n(width)} ${n(height)} L 0 ${n(height)} Z`;
    const s = Math.max(0, Math.min(smoothing, budget / r - 1));
    const arcMeasure = 90 * (1 - s);
    const arcSection = Math.sin(rad(arcMeasure / 2)) * r * Math.SQRT2;
    const alpha = (90 - arcMeasure) / 2;
    const p3p4 = r * Math.tan(rad(alpha / 2));
    const beta = 45 * s;
    const c = p3p4 * Math.cos(rad(beta));
    const d = c * Math.tan(rad(beta));
    const p = Math.min((1 + s) * r, budget);
    const b = (p - arcSection - c - d) / 3;
    const a = 2 * b;

    return [
      `M ${n(width - p)} 0`,
      `c ${n(a)} 0 ${n(a + b)} 0 ${n(a + b + c)} ${n(d)}`,
      `a ${n(r)} ${n(r)} 0 0 1 ${n(arcSection)} ${n(arcSection)}`,
      `c ${n(d)} ${n(c)} ${n(d)} ${n(b + c)} ${n(d)} ${n(a + b + c)}`,
      `L ${n(width)} ${n(height - p)}`,
      `c 0 ${n(a)} 0 ${n(a + b)} ${n(-d)} ${n(a + b + c)}`,
      `a ${n(r)} ${n(r)} 0 0 1 ${n(-arcSection)} ${n(arcSection)}`,
      `c ${n(-c)} ${n(d)} ${n(-(b + c))} ${n(d)} ${n(-(a + b + c))} ${n(d)}`,
      `L ${n(p)} ${n(height)}`,
      `c ${n(-a)} 0 ${n(-(a + b))} 0 ${n(-(a + b + c))} ${n(-d)}`,
      `a ${n(r)} ${n(r)} 0 0 1 ${n(-arcSection)} ${n(-arcSection)}`,
      `c ${n(-d)} ${n(-c)} ${n(-d)} ${n(-(b + c))} ${n(-d)} ${n(-(a + b + c))}`,
      `L 0 ${n(p)}`,
      `c 0 ${n(-a)} 0 ${n(-(a + b))} ${n(d)} ${n(-(a + b + c))}`,
      `a ${n(r)} ${n(r)} 0 0 1 ${n(arcSection)} ${n(-arcSection)}`,
      `c ${n(c)} ${n(-d)} ${n(b + c)} ${n(-d)} ${n(a + b + c)} ${n(-d)}`,
      "Z",
    ].join(" ");
  };

  // One SVG carries shape, gradient and shadow so the drop shadow is also a
  // superellipse; the canvas is padded so the blur is never cut off.
  const paint = (width, height, opts) => {
    const pad = Math.ceil((opts.shadow?.blur || 0) * 2 + Math.abs(opts.shadow?.y || 0));
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const W = w + pad * 2;
    const H = h + pad * 2;
    const d = path(w - 1, h - 1, Math.max(0, opts.radius - 0.5), opts.smoothing);

    const gradient = opts.gradient
      ? `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${opts.gradient
          .map((color, i) => `<stop offset="${(i / (opts.gradient.length - 1)).toFixed(3)}" stop-color="${color}"/>`)
          .join("")}</linearGradient>`
      : "";
    const shadow = opts.shadow
      ? `<filter id="s" x="-50%" y="-50%" width="200%" height="200%">
           <feDropShadow dx="0" dy="${opts.shadow.y}" stdDeviation="${opts.shadow.blur}"
             flood-color="${opts.shadow.color}" flood-opacity="${opts.shadow.opacity}"/>
         </filter>`
      : "";

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<defs>${gradient}${shadow}</defs>` +
      `<g transform="translate(${pad + 0.5} ${pad + 0.5})">` +
      `<path d="${d}" fill="none" stroke="none" ${opts.shadow ? 'filter="url(#s)"' : ""} />` +
      `<path d="${d}" ${opts.gradient ? 'fill="url(#g)"' : `fill="${opts.fill}"`}` +
      `${opts.stroke ? ` stroke="${opts.stroke}" stroke-width="1"` : ""} />` +
      `</g></svg>`;

    return {
      image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      pad,
      W,
      H,
    };
  };

  const TARGETS = [
    ".card",
    ".shot",
    ".cover-comp",
    ".cover-meta .pill",
    ".cover-mark",
    ".loop-item",
    ".lumi-stage .chip",
    ".pkgbox .box",
    ".ds-stat",
    ".tech-foot .pill",
    ".end .thanks",
    ".techno",
    ".seg",
    ".appear",
    ".skill-card",
    ".effort-card",
    ".creed",
    ".chip-p",
  ].join(",");

  // Shadow recipes mirror the two CSS elevations so the deck reads the same.
  const shadowFor = (el) => {
    // Screenshots get their lift from a CSS drop-shadow instead: the squircle
    // shadow lives inside the element box, and `.shot` clips overflow, so any
    // shadow painted there is cut away. Returning null keeps the SVG light.
    if (el.classList.contains("shot")) return null;
    if (el.matches(".pkgbox .box")) {
      return { y: 12, blur: 16, color: "#384248", opacity: 0.2 };
    }
    return { y: 6, blur: 10, color: "#384248", opacity: 0.1 };
  };

  const grabColors = (value) => {
    const found = value.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/gi);
    return found && found.length >= 2 ? found : null;
  };

  const decorate = (el) => {
    if (el.dataset.squircle === "done") return;
    const width = Math.round(el.offsetWidth);
    const height = Math.round(el.offsetHeight);
    if (width < 2 || height < 2) return;

    const style = getComputedStyle(el);
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    const smoothing = radius >= 40 ? 0.75 : 0.6;

    const bg = style.backgroundColor;
    const hasGradient = style.backgroundImage.includes("gradient");
    const note = paint(width, height, {
      radius,
      smoothing,
      fill: bg === "rgba(0, 0, 0, 0)" ? "#faf7f1" : bg,
      stroke: style.borderTopColor === "rgba(0, 0, 0, 0)" ? null : style.borderTopColor,
      gradient: hasGradient ? grabColors(style.backgroundImage) : null,
      shadow: shadowFor(el),
    });

    el.dataset.squircle = "done";
    el.classList.add("squircle");
    el.style.borderColor = "transparent";
    el.style.boxShadow = "none";
    el.style.backgroundColor = "transparent";
    el.style.backgroundImage = note.image;
    el.style.backgroundSize = `${note.W}px ${note.H}px`;
    el.style.backgroundPosition = `-${note.pad}px -${note.pad}px`;
    el.style.backgroundRepeat = "no-repeat";

    // Cropped children (screenshots inside a frame) follow the same silhouette.
    const clip = path(width, height, radius, smoothing);
    el.querySelectorAll("img").forEach((img) => {
      if (img.hasAttribute("data-noclip")) return;
      img.style.clipPath = `path("${clip}")`;
    });
  };

  const applyAll = () => {
    document.querySelectorAll(TARGETS).forEach(decorate);
  };

  window.Squircle = { path, applyAll };
})();
