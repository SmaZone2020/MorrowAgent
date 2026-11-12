// One-off: draws the package cover. Kept out of the build because the image is
// committed once and only re-drawn when the title changes.
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "packages/cn.morrow.calculus.shaanxi-upgrade";
const accent = "#2f6f5e";
const ink = "#f6f2ea";

GlobalFonts.registerFromPath(
  "src/assets/SiYuanSongTiRegular/SourceHanSerifCN-Bold-2.otf",
  "Source Han Serif",
);

const width = 1200;
const height = 1600;
const canvas = createCanvas(width, height);
const g = canvas.getContext("2d");

g.fillStyle = accent;
g.fillRect(0, 0, width, height);

// A faint integral sign reads as "calculus" without spelling it out.
g.globalAlpha = 0.12;
g.strokeStyle = ink;
g.lineWidth = 34;
g.lineCap = "round";
g.beginPath();
g.moveTo(760, 360);
g.bezierCurveTo(700, 360, 700, 420, 700, 520);
g.lineTo(700, 1180);
g.bezierCurveTo(700, 1270, 660, 1300, 610, 1300);
g.stroke();
g.globalAlpha = 1;

g.fillStyle = ink;
g.font = '600 34px "Source Han Serif"';
g.fillText("陕西专升本", 110, 250);

g.font = '700 118px "Source Han Serif"';
g.fillText("高等数学", 104, 1080);

g.globalAlpha = 0.72;
g.font = '400 40px "Source Han Serif"';
g.fillText("教材 · 公式 · 历年真题", 110, 1170);
g.globalAlpha = 1;

g.fillStyle = "rgba(246,242,234,0.55)";
g.fillRect(110, 1230, 180, 3);

writeFileSync(join(root, "media", "covers", "cover.png"), canvas.toBuffer("image/png"));
console.log("cover written");
