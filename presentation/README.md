# Morrow Agent 路演演示（21 页）

## 单文件版本

`deck.html` 是整份演示的**单文件**打包产物：样式、脚本、中文字体、KaTeX 公式字体、截图和演示视频全部内联，双击即可用浏览器打开，不需要本地服务器、不需要联网、也不需要同目录下的其他文件（可单独拷贝到 U 盘 / 微信 / 评委电脑）。约 2.5 MB。

操作：`→ / ←`、空格、滚轮翻页；`F5` 全屏；`#页码` 可直接定位（如 `deck.html#9`）。第 6 页的 Lumi 可点击，第 7 页的视频会自动播放。

重新生成（源码改动后）：

```bash
node presentation/scripts/build-single.mjs    # → presentation/deck.html
node presentation/scripts/audit-single.mjs    # 可选：file:// 下自检 + 截图
```

构建依赖：Node、`ffmpeg`（截图转 WebP）、Python `fonttools` + `brotli`（字体按用字子集化，11 MB 的 OTF → 约 170 KB/字重）。

## 源码版本（多文件）

`index.html` + `styles.css` + `*.js` + `assets/`，字体从 `../src/assets` 读取，因此必须走 http：

```bash
node presentation/scripts/server.mjs          # http://127.0.0.1:4321/presentation/
node presentation/scripts/shoot.mjs 1 5 9     # 导出指定页 PNG
```

改动源码后请重新跑一次 `build-single.mjs`，否则 `deck.html` 会落后于源码。
