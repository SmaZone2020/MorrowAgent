// Geometry audit across the whole deck: flag slides whose content overflows the
// 1280x720 stage, and elements that spill past the slide's padding box.
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.DECK_URL || "http://127.0.0.1:4321/presentation/";
const PORT = Number(process.env.CDP_PORT || 9336);

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  "--window-size=1280,720",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1800);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
const errors = [];
let id = 0;

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.exceptionThrown") {
    errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
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
await send("Page.enable");
await send("Page.navigate", { url: `${BASE}#1` });
await sleep(3000);

const total = (await send("Runtime.evaluate", { expression: "document.querySelectorAll('.slide').length", returnByValue: true }))
  .result.result.value;

const expr = (n) => `(async () => {
  await new Promise((r) => setTimeout(r, 2400));
  const s = document.querySelector('.slide.active');
  const box = s.getBoundingClientRect();
  const kids = [...s.querySelectorAll('*')].filter((el) => {
    if (el.closest('svg') && el.tagName !== 'svg') return false;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' || cs.position === 'fixed') return false;
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  });
  const spill = kids.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > box.bottom - 20 || r.right > box.right - 20 || r.top < box.top + 20;
  }).slice(0, 6).map((el) => el.tagName.toLowerCase() + '.' + (el.className.baseVal ?? el.className ?? '').toString().split(' ').slice(0, 2).join('.'));
  return {
    key: s.dataset.k,
    scrollOver: s.scrollHeight - s.clientHeight,
    spill,
  };
})()`;

for (let n = 1; n <= total; n++) {
  await send("Page.navigate", { url: `${BASE}#${n}` });
  await send("Page.reload", { ignoreCache: true });
  await sleep(2600);
  const r = await send("Runtime.evaluate", { expression: expr(n), awaitPromise: true, returnByValue: true });
  const v = r.result?.result?.value;
  const flag = v && (v.scrollOver > 2 || v.spill.length) ? "⚠" : "ok";
  console.log(String(n).padStart(2), flag.padEnd(2), v?.key?.padEnd(10), "over:", String(v?.scrollOver).padStart(4), v?.spill?.length ? "spill: " + v.spill.join(", ") : "");
}

console.log("errors:", errors.length ? errors.join(" | ") : "(none)");
ws.close();
chrome.kill();
