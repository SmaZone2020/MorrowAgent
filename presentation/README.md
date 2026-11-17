# Morrow Agent 路演演示（31 页）

## 单文件版本

`deck.html` 是整份演示的**单文件**打包产物：样式、脚本、中文字体、KaTeX 公式字体、截图和演示视频全部内联，双击即可用浏览器打开，不需要本地服务器、不需要联网、也不需要同目录下的其他文件（可单独拷贝到 U 盘 / 微信 / 评委电脑）。

操作：`→ / ←`、空格、滚轮翻页；`F5` 全屏；`#页码` 可直接定位（如 `deck.html#9`）。左侧六个圆点是章节导航，悬停显示该章包含的页面，点击直接跳章；第 2 页是全场的六幕结构总览。第 8 页的 Lumi 可点击，第 9 页的视频会自动播放。

全篇分六幕（第 2 页有总览）：

| 幕 | 页码 | 内容 |
| --- | --- | --- |
| 01 缘起 WHY | 3–7 | 政策原文、时代之问、我们的回答、七步闭环、一个学生的晚上 |
| 02 学伴 COMPANION | 8–13 | Lumi 是谁、怎么教、六个模块、对话界面、诊断、报告 |
| 03 积累 EVIDENCE | 14–16 | 学习画像、错题本与专项训练、模拟考试 |
| 04 内容 CONTENT | 17–19 | MLPS 开放标准、构建器、首个参考包 |
| 05 底座 PLATFORM | 20–25 | 本地优先、国产模型、深度集成、架构、工程纪律、可量化的数 |
| 06 落地 LANDING | 26–30 | 政策对照、推广路径、产品哲学、先进理念、下一步 |

## 重新生成（源码改动后）

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

## 结构约定

- **章节只在 `slides.js` 的 `BLOCKS` 里定义一次**：每幕的名字、英文副题、强调色、包含的 `data-k` 和一句话路径都在那里。页面归章、右上角章节角标、章首页底部的路线条、左侧导航 rail、第 2 页的agenda 全部由它生成——把一页挪进另一幕只需要改一个字符串。
- 每页通过 `data-k` 标识；章首页（每幕第一页）自动获得加大的标题、底部路线条和 `blk-open` 的留白。
