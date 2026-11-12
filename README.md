<div align="center">

<img src="assets/logo.png" alt="Morrow Agent" width="420" />

**An open-source AI learning companion that understands how you learn.**

[![License](https://img.shields.io/badge/license-GPL--3.0-2f6f5e?style=flat-square)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Rust](https://img.shields.io/badge/Rust-1.77+-000000?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org)
[![BeUI](https://img.shields.io/badge/UI-BeUI%20%2B%20Tailwind-38BDF8?style=flat-square)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/status-MVP-c2410c?style=flat-square)](#project-status)

[English](#english) · [中文](#中文)

</div>

---

# English

## What it is

Morrow Agent is a desktop and mobile **AI learning workspace** built around a single idea: an AI tutor should make itself unnecessary. Instead of answering the question and leaving, Lumi — the built-in agent — diagnoses what the learner actually misunderstands, teaches against that gap, then verifies the fix with new problems.

It is not a chat window with a math prompt attached. The conversation, the question cards, the drawing board, the knowledge tree, the wrong-answer book and the mock exam are all parts of one learning loop, and every interaction writes evidence back into a persistent learner model.

The first release targets **Higher Mathematics for the Shaanxi college-upgrade exam (陕西专升本高等数学)**.

## The learning loop

```text
Understand the learner
        ↓
Find the knowledge gap
        ↓
Trace the root cause
        ↓
Teach to that cause
        ↓
Targeted practice
        ↓
Verify real mastery
        ↓
Build independence
```

## Features

| Area | What it does |
| --- | --- |
| **Lumi workspace** | A conversation that renders real components — question cards, formula input, a math drawing board, function plots, knowledge graphs — and receives structured events back. |
| **Adaptive diagnosis** | Coverage-first diagnostic papers, hypothesis-driven follow-up questions, and variant problems that confirm or reject a suspected weakness before it is recorded. |
| **Learner model** | Mastery (0–100) kept strictly separate from confidence, plus error types, ability dimensions and long-term memory across sessions. |
| **Wrong-answer book** | Automatic capture of the original problem, the learner's attempt, the worked solution and the attributed error type. |
| **Mock exams** | The real 22-slot paper structure, a fixed timer, a sticky answer sheet, and a score summary with per-question analysis. |
| **Knowledge library** | Chapter tree, knowledge graph, and clickable question references inside study notes. |
| **Learning packages** | A versioned `.morrow` archive (MLPS) carrying knowledge points, questions, solutions, taxonomy and sources — installable, verifiable, and updatable. |
| **Local-first data** | SQLite in the app data directory; every learning package is an isolated workspace. Personal data never mixes with public content. |
| **Providers** | OpenAI-compatible, Anthropic-style and Gemini-style protocols, plus a built-in DeepSeek provider with in-app sign-in. |

## Tech stack

| Layer | Choice |
| --- | --- |
| Shell | Tauri 2 (Windows, Android) |
| UI | React 19 · TypeScript · Tailwind CSS v4 · BeUI · Gravity Icons |
| Motion | `motion` (Framer Motion) |
| Math | KaTeX |
| Backend | Rust · `rusqlite` · `reqwest` |
| Storage | SQLite + JSON preference files under `%APPDATA%\dev.morrow.agent\` |
| Content | YAML / JSON learning packages validated by JSON Schema |

## Quick start

```bash
# prerequisites: Node.js 20+, pnpm 9+, Rust 1.77+, Tauri prerequisites

pnpm install
pnpm tauri:dev          # run the desktop app
```

Frontend-only development and checks:

```bash
pnpm dev                # Vite dev server on http://127.0.0.1:1420
pnpm typecheck          # tsc -b
pnpm test               # vitest
pnpm build              # typecheck + production build
```

## Project layout

```text
MorrowAgent/
├── src/                      React frontend
│   ├── app/                  shell, routing, providers
│   ├── components/           shared primitives (Modal, MathText, EmptyState…)
│   ├── features/             domain modules (lumi, knowledge, training, exam…)
│   ├── pages/                routed pages
│   └── vendor/beui/          vendored BeUI component library
├── src-tauri/                Rust backend, commands, package engine, SQLite
├── packages/                 learning package sources (not tracked)
├── scripts/                  validation, packaging, knowledge build
├── schemas/                  JSON Schemas for knowledge and MLPS content
├── prompts/                  authoring prompts and conventions
└── docs/                     product, design, AI, data and engineering docs
```

## Documentation

- **[DOCS.md](DOCS.md)** — the documentation index, with a table of the most important documents.
- **[docs/MorrowAgent理念体系.md](docs/MorrowAgent理念体系.md)** — the philosophy behind the product: education equity, self-directed learning, AI-native design, and the brand belief.
- **[docs/04-Data/Package-Authoring-Guide.md](docs/04-Data/Package-Authoring-Guide.md)** — how to author a learning package that installs, reads, generates papers and feeds the learner model.

## Project status

MVP under active development. The reference learning package (`cn.morrow.calculus.shaanxi-upgrade`) ships 13 chapters, 72 knowledge points, 153 questions with matching solutions, and passes the full package validator.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

---

# 中文

## 这是什么

Morrow Agent 是一个桌面与移动端的 **AI 学习工作区**，它围绕一个主张构建：好的 AI 老师应该让自己变得不必要。内置智能体 Lumi 不会答完就离开，而是先诊断学习者真正没弄懂的地方，针对那个缺口教学，再用新题验证是否真的补上了。

它不是套了数学提示词的聊天窗口。对话、题目卡片、画板、知识树、错题本与模拟考试属于同一个学习闭环，每一次操作都会作为证据写回持续演化的学习者模型。

首个版本面向 **陕西专升本高等数学**。

## 学习闭环

```text
理解学习者
    ↓
发现知识盲区
    ↓
追溯根本原因
    ↓
个性化教学
    ↓
针对性训练
    ↓
验证真实掌握
    ↓
培养独立学习能力
```

## 功能

| 模块 | 能力 |
| --- | --- |
| **Lumi 工作台** | 对话中渲染真实组件——题目卡片、公式输入、数学画板、函数图像、知识图谱——并把用户操作结构化回传。 |
| **自适应诊断** | 覆盖式诊断卷、假设驱动的追问、变式验证；疑似弱项必须被证实才写入画像。 |
| **学习画像** | 掌握度（0–100）与置信度严格分离，并记录错误类型、能力维度与跨会话的长期记忆。 |
| **错题本** | 自动收录原题、作答、解析与归因的错误类型。 |
| **模拟考试** | 真实 22 题位试卷结构、固定计时、常驻答题卡，交卷后给出成绩总结与逐题分析。 |
| **知识库** | 章节树、知识图谱，笔记中的题目引用可直接点击预览。 |
| **学习包** | 带版本号的 `.morrow` 归档（MLPS），包含知识点、题目、解析、词表与来源，可安装、可校验、可更新。 |
| **本地优先** | SQLite 存在应用数据目录；每个学习包是独立工作区，个人数据与公共内容永不混用。 |
| **供应商** | 兼容 OpenAI、Anthropic、Gemini 三种协议，并内置可应用内登录的 DeepSeek 供应商。 |

## 技术栈

| 层 | 选型 |
| --- | --- |
| 外壳 | Tauri 2（Windows、Android） |
| 界面 | React 19 · TypeScript · Tailwind CSS v4 · BeUI · Gravity Icons |
| 动效 | `motion`（Framer Motion） |
| 数学 | KaTeX |
| 后端 | Rust · `rusqlite` · `reqwest` |
| 存储 | SQLite + `%APPDATA%\dev.morrow.agent\` 下的 JSON 偏好文件 |
| 内容 | 由 JSON Schema 校验的 YAML / JSON 学习包 |

## 快速开始

```bash
# 依赖：Node.js 20+、pnpm 9+、Rust 1.77+、Tauri 环境

pnpm install
pnpm tauri:dev          # 启动桌面应用
```

仅前端的开发与检查：

```bash
pnpm dev                # Vite 开发服务器 http://127.0.0.1:1420
pnpm typecheck          # tsc -b
pnpm test               # vitest
pnpm build              # 类型检查 + 生产构建
```

## 目录结构

```text
MorrowAgent/
├── src/                  React 前端
│   ├── app/              外壳、路由、Provider
│   ├── components/       共享基础组件（Modal、MathText、EmptyState…）
│   ├── features/         领域模块（lumi、knowledge、training、exam…）
│   ├── pages/            路由页面
│   └── vendor/beui/      内置的 BeUI 组件库
├── src-tauri/            Rust 后端、命令、包引擎、SQLite
├── packages/             学习包源文件（不入库）
├── scripts/              校验、打包、知识库构建
├── schemas/              知识点与 MLPS 内容的 JSON Schema
├── prompts/              内容生产提示词与约定
└── docs/                 产品、设计、AI、数据与工程文档
```

## 文档

- **[DOCS.md](DOCS.md)** —— 文档总索引，含重要文档表格。
- **[docs/MorrowAgent理念体系.md](docs/MorrowAgent理念体系.md)** —— 产品理念：教育公平、自主学习、AI Native 与品牌哲学。
- **[docs/04-Data/Package-Authoring-Guide.md](docs/04-Data/Package-Authoring-Guide.md)** —— 如何产出一个能装、能读、能出卷、能画像的学习包。

## 项目状态

MVP 开发中。参考学习包（`cn.morrow.calculus.shaanxi-upgrade`）包含 13 章、72 个知识点、153 道题与一一对应的解析，并通过完整包校验。

## 许可证

GNU General Public License v3.0 —— 见 [LICENSE](LICENSE)。
