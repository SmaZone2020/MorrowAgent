import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyBeuiPatches } from "./beuiPatches.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const vendorRoot = join(projectRoot, "src", "vendor", "beui");

const slugs = [
  "animated-sidebar",
  "button",
  "card",
  "input",
  "animated-badge",
  "tooltip",
  // The agents family ships as one graph: message pulls in the bubble, the
  // scroller and the composer, so listing the entry points that the app
  // actually renders is enough to resolve the whole set.
  "loading-states",
  "message",
  "message-bubble",
  "message-scroller",
  "prompt-input",
  "streaming-response",
];

function rewriteSpecifiers(source) {
  return source
    .replaceAll('"@/components/motion/', '"@/vendor/beui/components/motion/')
    .replaceAll('"@/components/agents/', '"@/vendor/beui/components/agents/')
    .replaceAll('"@/lib/', '"@/vendor/beui/lib/');
}

// Vendored third-party source stays byte-compatible apart from import paths and
// the explicit patches in beuiPatches.mjs. The project runs stricter compiler
// options than beUI targets, so vendored files opt out of type checking.
function withVendorHeader(filePath, source) {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    return `// @ts-nocheck\n${source}`;
  }
  return source;
}

async function fetchEntry(slug) {
  const response = await fetch(`https://beui.dev/r/${slug}`);
  if (!response.ok) {
    throw new Error(`Registry request failed for ${slug}: ${response.status}`);
  }
  return response.json();
}

async function main() {
  await rm(vendorRoot, { recursive: true, force: true });

  const written = new Map();

  for (const slug of slugs) {
    const entry = await fetchEntry(slug);
    for (const file of entry.files ?? []) {
      if (file.type === "preview") continue;
      if (file.path.includes("/previews/")) continue;
      if (!file.path || typeof file.content !== "string") continue;
      if (written.has(file.path)) continue;
      const rewritten = rewriteSpecifiers(file.content);
      written.set(file.path, withVendorHeader(file.path, applyBeuiPatches(file.path, rewritten)));
    }
  }

  for (const [relativePath, content] of written) {
    const target = join(vendorRoot, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  console.log(`Synced ${written.size} files from beUI into src/vendor/beui`);
}

await main();
