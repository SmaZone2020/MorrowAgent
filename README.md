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

**English** · [中文](README.zh-CN.md)

</div>

---

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
├── .github/workflows/        CI checks and the installer release pipeline
└── docs/                     product, design, AI, data and engineering docs
```

## Releasing

CI runs on every push to `main` and every pull request: typecheck, unit tests,
production build, then `clippy -D warnings` and `cargo test` on Windows.

Publishing is triggered by a version tag. Push one and `Release` builds the
Windows installers and publishes them, with no manual step in between:

```bash
# bump the five version strings, commit, then:
git tag v0.2.0
git push origin main --tags     # builds .msi + NSIS and publishes the release
```

The version lives in five files (`package.json`, `src-tauri/Cargo.toml`,
`src-tauri/tauri.conf.json`, `src/app/config.ts`,
`src-tauri/src/package/mod.rs`); `pnpm check:version` asserts they agree, and
the release fails before compiling if the tag disagrees with them or if the
tagged commit is not on `main`.

A manual run of the workflow builds the same installers and uploads them as
workflow artifacts, without publishing anything.

## Documentation

- **[DOCS.md](DOCS.md)** — the documentation index, with a table of the most important documents.
- **[docs/Philosophy.md](docs/Philosophy.md)** — the philosophy behind the product: education equity, self-directed learning, AI-native design, and the brand belief.
- **[docs/04-Data/Package-Authoring-Guide.md](docs/04-Data/Package-Authoring-Guide.md)** — how to author a learning package that installs, reads, generates papers and feeds the learner model.

## Project status

MVP under active development. The reference learning package (`cn.morrow.calculus.shaanxi-upgrade`) ships 13 chapters, 72 knowledge points, 153 questions with matching solutions, and passes the full package validator.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
