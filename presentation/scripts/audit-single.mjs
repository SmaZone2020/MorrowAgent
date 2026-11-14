// Smoke-test the bundled single-file deck straight from file:// — fonts, images,
// the Lumi rig and the console must all be clean without a server.
import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const FILE = resolve(import.meta.dirname, "..", "deck.html");
const OUT = resolve(process.env.TEMP || ".", "opencode", "deck-single-shots");
const PORT = Number(process.env.CDP_PORT || 9341);
await mkdir(OUT, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--allow-file-access-from-files",
  `--remote-debugging-port=${PORT}`,
  "--window-size=1280,720",
  "--force-device-scale-factor=1",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1800);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const logs = [];
let id = 0;

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.exceptionThrown") {
    logs.push("exception: " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    logs.push("console: " + msg.params.args.map((a) => a.value ?? a.description).join(" "));
  } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
    logs.push("log: " + msg.params.entry.text + " " + (msg.params.entry.url || ""));
  }
};

const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Log.enable");
await send("Page.enable");

const check = async (label, expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  console.log(label.padEnd(20), JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails));
};

const goto = async (n) => {
  await send("Page.navigate", { url: `file:///${FILE.replace(/\\/g, "/")}#${n}` });
  // Let the hash settle before reloading, otherwise the reload keeps the old URL.
  await sleep(700);
  await send("Page.reload", { ignoreCache: true });
  await sleep(2800);
};

await goto(1);
await check("slides", "document.querySelectorAll('.slide').length");
await check("inline assets", "Object.keys(window.__DECK_ASSETS).length");
await check("cover img ok", "document.querySelector('.cover-mark img')?.naturalWidth > 0");
await check("resolveAssets", "window.resolveAssets('<img src=\"assets/shots/cuotiben.png\">').includes('data:image/webp')");
await send("Page.captureScreenshot", { format: "png" }).then((s) => writeFile(resolve(OUT, "slide-01.png"), Buffer.from(s.result.data, "base64")));

for (const n of (process.argv.slice(2).length ? process.argv.slice(2) : ["5", "6", "7", "9", "16", "17", "18", "21"]).map(Number)) {
  await goto(n);
  const info = await send("Runtime.evaluate", {
    expression: `(() => {
      const s = document.querySelector('.slide.active');
      const fonts = document.fonts.check('16px MorrowSerif');
      const shots = [...s.querySelectorAll('.shot img, .shot video')].map(m => m.tagName + ':' + (m.tagName === 'IMG' ? m.naturalWidth : m.readyState));
      const overflow = s.scrollHeight > s.clientHeight + 2;
      return { key: s.dataset.k, fonts, shots, overflow, lumi: !!s.querySelector('svg.lumi-engine path') };
    })()`,
    returnByValue: true,
  });
  console.log(`slide ${String(n).padStart(2)}`.padEnd(20), JSON.stringify(info.result?.result?.value));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(resolve(OUT, `slide-${String(n).padStart(2, "0")}.png`), Buffer.from(shot.result.data, "base64"));
}

console.log("LOGS", logs.length ? logs.join("\n") : "(none)");
console.log("shots →", OUT);
ws.close();
chrome.kill();
