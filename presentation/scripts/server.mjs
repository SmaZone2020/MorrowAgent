// Tiny static server for the deck. `file://` blocks cross-folder font fetches
// in most browsers, so the deck is always presented over http from the project
// root — that is what lets ../src/assets fonts load.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const DECK = resolve(import.meta.dirname, "..");
const PROJECT = resolve(DECK, "..");
const PORT = Number(process.env.PORT || 4321);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = url === "/" ? "/presentation/index.html" : url;
    const filePath = normalize(join(PROJECT, rel));
    if (!filePath.startsWith(PROJECT)) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" }).end("forbidden");
      return;
    }
    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, "index.html") : filePath;
    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`deck → http://127.0.0.1:${PORT}/presentation/`);
});
