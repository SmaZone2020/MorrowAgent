<div align="center">

# Morrow Agent Documentation

**Product:** Morrow Agent · **Agent:** Lumi · **Doc version:** 0.1.0

[![Docs](https://img.shields.io/badge/docs-index-2f6f5e?style=flat-square)](#important-documents)
[![Core](https://img.shields.io/badge/core-read%20first-c2410c?style=flat-square)](#important-documents)
[![Status](https://img.shields.io/badge/status-MVP-6b7280?style=flat-square)](#document-status)

**English** · [中文](DOCS.zh-CN.md)

</div>

---

## What Morrow Agent is

Morrow Agent is a goal-driven AI learning companion. It continuously models the learner, diagnoses knowledge gaps, analyses how problems were attempted, teaches and drills against the real cause, then adjusts the plan from measured results — so the learner reaches the goal, not just the end of a chapter.

- **Final value:** the learner achieves their goal.
- **Core capability:** find and close knowledge gaps, and make knowledge actually stick.
- **Main benefit:** higher learning efficiency.
- **First release:** Higher Mathematics for the Shaanxi college-upgrade exam.
- **Platforms:** Windows + Android.
- **Deployment:** local app + cloud model APIs; personal learning data stays on the device.
- **Open source:** the core is open; paid services are out of MVP scope.
- **Public knowledge base:** the `Morrow-Knowledge` GitHub repository.

## Document status

| Tag | Meaning |
| --- | --- |
| **Confirmed** | An explicit decision from product discussion. |
| **Proposed** | The current recommendation; still open to team review. |
| **Open** | Not enough information to decide; must not be treated as settled. |
| **MVP** | In scope for this competition build. |

## Important documents

Read these five first. Everything else is supporting material.

| Document | Badge | Why it matters |
| --- | --- | --- |
| [`docs/Philosophy.md`](docs/Philosophy.md) | ![Core](https://img.shields.io/badge/CORE-c2410c?style=flat-square) | The philosophy the product is built on: education equity, self-directed learning, AI-native design, brand belief. Read before arguing about features. |
| [`docs/04-Data/Package-Authoring-Guide.md`](docs/04-Data/Package-Authoring-Guide.md) | ![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square) | The practical guide to producing a `.morrow` learning package that installs, reads, generates papers and feeds the learner model. |
| [`docs/04-Data/MLPS.md`](docs/04-Data/MLPS.md) | ![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square) | The learning package specification: format, schema, versioning and distribution rules. |
| [`docs/01-Product/PRD.md`](docs/01-Product/PRD.md) | ![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square) | Product requirements, roles, feature scope and MVP priority. |
| [`docs/05-Engineering/Architecture.md`](docs/05-Engineering/Architecture.md) | ![Reference](https://img.shields.io/badge/REFERENCE-6b7280?style=flat-square) | Architecture goals, layering and the decisions the implementation settled on. |

## Languages

English is the default. The four core documents have a full Chinese counterpart; every other document is written in Chinese with an English title and summary at the top.

| English | Chinese |
| --- | --- |
| [`README.md`](README.md) | [`README.zh-CN.md`](README.zh-CN.md) |
| [`DOCS.md`](DOCS.md) | [`DOCS.zh-CN.md`](DOCS.zh-CN.md) |
| [`docs/Philosophy.md`](docs/Philosophy.md) | [`docs/理念体系.md`](docs/理念体系.md) |
| [`docs/04-Data/Package-Authoring-Guide.md`](docs/04-Data/Package-Authoring-Guide.md) | [`docs/04-Data/Package-Authoring-Guide.zh-CN.md`](docs/04-Data/Package-Authoring-Guide.zh-CN.md) |

## Document index

### Product

| Document | Contents |
| --- | --- |
| `docs/01-Product/Product-Overview.md` | Product framing and positioning |
| `docs/01-Product/PRD.md` | Product requirements |
| `docs/01-Product/Information-Architecture.md` | Information architecture and page inventory |
| `docs/01-Product/User-Journey.md` | User journeys and core flows |

### Design

| Document | Contents |
| --- | --- |
| `docs/02-Design/UI-UX-Guidelines.md` | UI/UX principles |

### AI

| Document | Contents |
| --- | --- |
| `docs/03-AI/Agent-Behavior.md` | Lumi agent behaviour rules |
| `docs/03-AI/Interactive-Components.md` | Interactive component and event contracts |
| `docs/03-AI/Learning-Memory.md` | Learning memory and the learner model |
| `docs/03-AI/Diagnostic-Strategy.md` | Diagnosis, attribution and teaching strategy |

### Data

| Document | Contents |
| --- | --- |
| `docs/04-Data/Data-Model.md` | Core entities and data boundaries |
| `docs/04-Data/Knowledge-Standard.md` | Knowledge point and question data standard |
| `docs/04-Data/Knowledge-Contribution.md` | Knowledge base contribution and versioning |
| `docs/04-Data/MLPS.md` | Learning package specification |
| `docs/04-Data/Package-Authoring-Guide.md` | Practical package authoring guide |

### Engineering

| Document | Contents |
| --- | --- |
| `docs/05-Engineering/Architecture.md` | Technical architecture |
| `docs/05-Engineering/Communication-Protocol.md` | API and component communication protocol |
| `docs/05-Engineering/CI-CD.md` | CI checks and the installer release pipeline |

### Project

| Document | Contents |
| --- | --- |
| `docs/06-Project/Roadmap.md` | MVP roadmap |
| `docs/06-Project/Work-Plan.md` | Engineering backlog |
| `docs/06-Project/Task-Board.md` | Team task template |
| `docs/06-Project/Acceptance-Criteria.md` | MVP acceptance criteria |
| `docs/DECISIONS.md` | Product decision log |
| `docs/OPEN-QUESTIONS.md` | Open questions |

## Conventions

1. Product requirements and interaction behaviour follow the PRD, the user journeys, the AI specs and the component specs.
2. Public knowledge content and personal learning data must stay separate.
3. An AI inference is never written down as a confirmed weakness; record the evidence, the confidence, and confirm it with a verification question.
4. Document changes go through a pull request or team review; significant decisions are also recorded in `DECISIONS.md`.
5. Technical choices written in these documents are proposals until reviewed — an example is not a decision.

## Knowledge production

Field rules for knowledge points, questions and exam-source registration live in `docs/04-Data/Knowledge-Standard.md`. The authoring prompts that produce that content are working material and are not part of this repository; the schemas below are the contract they must satisfy.

| Task | Schema |
| --- | --- |
| Knowledge point | `schemas/knowledge-point.schema.json` |
| Question | `schemas/question.schema.json` |
| Exam source | `schemas/exam-source.schema.json` |

Output is validated with `pnpm validate:knowledge` and compiled into a package with `pnpm build:knowledge`.
