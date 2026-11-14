// Render slides to PNG with headless Chrome over CDP. A plain
// `--screenshot --virtual-time-budget` run freezes mid-animation whenever a
// requestAnimationFrame loop is on the page (the Lumi engine), so this drives a
// real browser clock instead and waits for the entrance choreography to settle.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = resolve(import.meta.dirname, "..", "..", "..", "AppData", "Local", "Temp", "opencode", "deck-shots");
const BASE = process.env.DECK_URL || "http://127.0.0.1:4321/presentation/";
const PORT = Number(process.env.CDP_PORT || 9334);
const SETTLE = Number(process.env.SETTLE || 2600);

await mkdir(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--window-size=1280,720",
  "--force-device-scale-factor=2",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1800);

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let seq = 0;

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};

const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++seq;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await new Promise((r) => (ws.onopen = r));
await send("Page.enable");

const shots = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : Array.from({ length: 21 }, (_, i) => i + 1);

for (const slide of shots) {
  await send("Page.navigate", { url: `${BASE}#${slide}` });
  // A hard reload keeps state clean when jumping between anchors.
  await send("Page.reload", { ignoreCache: true });
  await sleep(SETTLE);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const file = resolve(OUT, `slide-${String(slide).padStart(2, "0")}.png`);
  await writeFile(file, Buffer.from(shot.result.data, "base64"));
  console.log("shot", slide, "→", file);
}

await writeFile(resolve(OUT, "_done.txt"), new Date().toISOString());
ws.close();
chrome.kill();
