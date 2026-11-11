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
  // Tabs and the popover replace the hand-rolled choice row and the hover
  // surface: both ship their own layout and gesture logic, which is exactly
  // what a vendored component is for.
  "tabs",
  "popover",
  "action-swap",
  "theme-toggle",
  "alert",
  // The pen colour is a radio group over swatches; beUI's selector brings the
  // gliding ring and native keyboard navigation, which a row of buttons cannot.
  "color-selector",
  // The header trail is a route, so it gets the registry's collapsing list:
  // deep knowledge pages drop the middle segments into an overflow panel.
  "breadcrumb",
  // Switching packages is a searchable list of installed ones, which is what
  // the registry's combobox is: filter, keyboard stepping and a morphing panel.
  "combobox",
  // Filtering the drill by knowledge points is a pick-several control; the
  // registry's multi-select brings removable tokens and a list that stays open.
  "multi-select",
  // Dialogs come from the same registry so every overlay shares one unfold
  // animation and one focus trap instead of a per-page portal.
  "center-morph-modal",
  // The agents family ships as one graph: message pulls in the bubble, the
  // scroller and the composer, so listing the entry points that the app
  // actually renders is enough to resolve the whole set.
  "loading-states",
  "message",
  "message-bubble",
  "message-scroller",
  "prompt-input",
  "streaming-response",
  // A tool call is not a chat bubble: the registry's tool result is the row
  // that reports the run and folds its output away behind one disclosure.
  "tool-result",
  // The quiz is a choice control, not a row of buttons: radio for one answer,
  // checkbox for several, both with the registry's press feedback and keyboard
  // handling.
  "radio",
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
