// Verify the squircle pass actually decorated each new surface, and surface any
// console errors while the deck boots.
import { spawn } from "node:child_process";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.DECK_URL || "http://127.0.0.1:4321/presentation/";
const PORT = Number(process.env.CDP_PORT || 9335);

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

const check = async (label, expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  console.log(label.padEnd(22), JSON.stringify(r.result?.result?.value));
};

const goto = async (n) => {
  await send("Page.navigate", { url: `${BASE}#${n}` });
  await send("Page.reload", { ignoreCache: true });
  await sleep(2600);
};

await check("slides", "document.querySelectorAll('.slide').length");
await check("cover mark squircle", "!!document.querySelector('.cover-mark[data-squircle=done]')");
await check("counter", "document.querySelector('#counter')?.textContent");

for (const k of [7, 17, 19]) {
  await goto(k);
  await check(`slide ${k}`, `(() => {
    const s = document.querySelector('.slide.active');
    const els = [...s.querySelectorAll('.card, .seg, .appear, .chip-p, .shot')];
    const done = els.filter((e) => e.dataset.squircle === 'done').length;
    const overflow = s.scrollHeight > s.clientHeight + 2;
    return { key: s.dataset.k, cards: els.length, squircle: done, overflow };
  })()`);
}

console.log("LOGS", logs.length ? logs.join("\n") : "(none)");
ws.close();
chrome.kill();
