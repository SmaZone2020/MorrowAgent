// Debug helper: drive the deck in headless Chrome over CDP and sample several
// reaction states so the character rig can be eyeballed away from idle.
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = process.env.DECK_URL || "http://127.0.0.1:4321/presentation/#6";
const PORT = Number(process.env.CDP_PORT || 9333);
const OUT = process.env.SHOT_DIR || ".";
const WAIT = Number(process.env.WAIT || 3500);

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  "--window-size=1280,720",
  "--force-device-scale-factor=2",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1800);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
const pending = new Map();
let id = 0;
const logs = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.consoleAPICalled") {
    logs.push(`[${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" "));
  } else if (msg.method === "Runtime.exceptionThrown") {
    logs.push("[exception] " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
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
await send("Page.navigate", { url: URL });
await sleep(WAIT);

const shoot = async (name) => {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(`${OUT}\\${name}.png`, Buffer.from(shot.result.data, "base64"));
  console.log("shot →", `${OUT}\\${name}.png`);
};

const states = (process.env.STATES || "curious,happy,excited,celebrate,proud,shy").split(",");
for (const state of states) {
  await send("Runtime.evaluate", {
    expression: `window.__lumi.setMode('hold'), window.__lumi.setState(${JSON.stringify(state)}, { resetEyes: true })`,
  });
  await sleep(900);
  await shoot(`lumi-${state}`);
}

const before = await send("Runtime.evaluate", { expression: "location.hash", returnByValue: true });
await send("Runtime.evaluate", {
  expression: `document.querySelector('.slide[data-k="lumi"] [data-lumi]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))`,
});
await sleep(500);
const after = await send("Runtime.evaluate", { expression: "location.hash", returnByValue: true });
console.log("click hash:", before.result?.result?.value, "→", after.result?.result?.value);
await shoot("lumi-click");

console.log("LOGS\n" + logs.join("\n"));
ws.close();
chrome.kill();
