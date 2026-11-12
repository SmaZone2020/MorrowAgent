<div align="center">

# Morrow Agent Documentation

**Product:** Morrow Agent · **Agent:** Lumi · **Doc version:** 0.1.0

[![Docs](https://img.shields.io/badge/docs-bilingual-2f6f5e?style=flat-square)](#document-index)
[![Core](https://img.shields.io/badge/core-read%20first-c2410c?style=flat-square)](#important-documents)
[![Status](https://img.shields.io/badge/status-MVP-6b7280?style=flat-square)](#document-status)

[English](#english) · [中文](#中文)

</div>

---

# English

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
| [`docs/MorrowAgent理念体系.md`](docs/MorrowAgent理念体系.md) | ![Core](https://img.shields.io/badge/CORE-c2410c?style=flat-square) | The philosophy the product is built on: education equity, self-directed learning, AI-native design, brand belief. Read before arguing about features. |
| [`docs/04-Data/Package-Authoring-Guide.md`](docs/04-Data/Package-Authoring-Guide.md) | ![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square) | The practical guide to producing a `.morrow` learning package that installs, reads, generates papers and feeds the learner model. |
| [`docs/04-Data/MLPS.md`](docs/04-Data/MLPS.md) | ![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square) | The learning package specification: format, schema, versioning and distribution rules. |
| [`docs/01-Product/PRD.md`](docs/01-Product/PRD.md) | ![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square) | Product requirements, roles, feature scope and MVP priority. |
| [`docs/05-Engineering/Architecture.md`](docs/05-Engineering/Architecture.md) | ![Reference](https://img.shields.io/badge/REFERENCE-6b7280?style=flat-square) | Architecture goals, layering and the decisions the implementation settled on. |

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

Field rules for knowledge points, questions and exam-source registration live in `docs/04-Data/Knowledge-Standard.md`; executable conventions live in `prompts/conventions.md`.

| Task | Prompt | Schema |
| --- | --- | --- |
| Knowledge point | `prompts/knowledge-point-generation.md` | `schemas/knowledge-point.schema.json` |
| Question | `prompts/question-generation.md` | `schemas/question.schema.json` |
| Exam source | `prompts/exam-source-registration.md` | `schemas/exam-source.schema.json` |

Output is validated with `pnpm validate:knowledge` and compiled into a package with `pnpm build:knowledge`.

---

# 中文

## 项目定位

Morrow Agent 是一个以目标达成为导向的 AI 学习伙伴。它通过持续理解学习者、诊断知识盲区、分析解题过程、提供个性化教学与训练，并根据学习成果调整计划，帮助用户实现学习目标。

- 最终价值：帮助用户达成学习目标。
- 核心能力：发现并解决知识盲区，促进知识真正掌握。
- 重要收益：提高学习效率。
- 首发方向：陕西专升本高等数学。
- 产品形态：Windows + Android。
- 部署设想：本地应用 + 云端 API；用户个人学习数据本地保存。
- 开源策略：开源核心，未来增值服务暂不纳入 MVP 设计。
- 公共知识库：GitHub 仓库 `Morrow-Knowledge`。

## 文档状态说明

| 标记 | 含义 |
| --- | --- |
| **已确认** | 来自产品讨论的明确决定。 |
| **建议** | 当前推荐方案，仍可由团队评审调整。 |
| **待确认** | 现有信息不足，不能擅自定案。 |
| **MVP** | 本次比赛版本的目标范围。 |

## 重要文档

先读这五篇，其余都是支撑材料。

| 文档 | 标记 | 为什么重要 |
| --- | --- | --- |
| [`docs/MorrowAgent理念体系.md`](docs/MorrowAgent理念体系.md) | ![核心](https://img.shields.io/badge/%E6%A0%B8%E5%BF%83-c2410c?style=flat-square) | 产品赖以成立的理念：教育公平、自主学习、AI Native、品牌哲学。讨论功能之前先读它。 |
| [`docs/04-Data/Package-Authoring-Guide.md`](docs/04-Data/Package-Authoring-Guide.md) | ![必读](https://img.shields.io/badge/%E5%BF%85%E8%AF%BB-2f6f5e?style=flat-square) | 如何产出一个能装、能读、能出卷、能画像的 `.morrow` 学习包。 |
| [`docs/04-Data/MLPS.md`](docs/04-Data/MLPS.md) | ![必读](https://img.shields.io/badge/%E5%BF%85%E8%AF%BB-2f6f5e?style=flat-square) | 学习包规范：格式、Schema、版本与分发规则。 |
| [`docs/01-Product/PRD.md`](docs/01-Product/PRD.md) | ![必读](https://img.shields.io/badge/%E5%BF%85%E8%AF%BB-2f6f5e?style=flat-square) | 产品需求、角色、功能范围与 MVP 优先级。 |
| [`docs/05-Engineering/Architecture.md`](docs/05-Engineering/Architecture.md) | ![参考](https://img.shields.io/badge/%E5%8F%82%E8%80%83-6b7280?style=flat-square) | 架构目标、分层与实现最终确定的技术决策。 |

## 文档目录

### 产品

| 文档 | 内容 |
| --- | --- |
| `docs/01-Product/Product-Overview.md` | 产品立项与定位 |
| `docs/01-Product/PRD.md` | 产品需求 |
| `docs/01-Product/Information-Architecture.md` | 信息架构与页面清单 |
| `docs/01-Product/User-Journey.md` | 用户旅程与核心流程 |

### 设计

| 文档 | 内容 |
| --- | --- |
| `docs/02-Design/UI-UX-Guidelines.md` | UI/UX 设计原则 |

### AI

| 文档 | 内容 |
| --- | --- |
| `docs/03-AI/Agent-Behavior.md` | Lumi Agent 行为规范 |
| `docs/03-AI/Interactive-Components.md` | 交互组件与事件回调规范 |
| `docs/03-AI/Learning-Memory.md` | 学习记忆与画像 |
| `docs/03-AI/Diagnostic-Strategy.md` | 诊断、归因与教学策略 |

### 数据

| 文档 | 内容 |
| --- | --- |
| `docs/04-Data/Data-Model.md` | 核心实体与数据边界 |
| `docs/04-Data/Knowledge-Standard.md` | 知识点与题目数据标准 |
| `docs/04-Data/Knowledge-Contribution.md` | 知识库贡献与版本流程 |
| `docs/04-Data/MLPS.md` | 学习包规范 |
| `docs/04-Data/Package-Authoring-Guide.md` | 学习包编写指南 |

### 工程

| 文档 | 内容 |
| --- | --- |
| `docs/05-Engineering/Architecture.md` | 技术架构决策框架 |
| `docs/05-Engineering/Communication-Protocol.md` | API 与组件通信协议 |

### 项目

| 文档 | 内容 |
| --- | --- |
| `docs/06-Project/Roadmap.md` | MVP 路线图 |
| `docs/06-Project/Work-Plan.md` | 工程待办清单 |
| `docs/06-Project/Task-Board.md` | 团队任务分工模板 |
| `docs/06-Project/Acceptance-Criteria.md` | MVP 验收标准 |
| `docs/DECISIONS.md` | 产品决策记录 |
| `docs/OPEN-QUESTIONS.md` | 待确认事项 |

## 使用约定

1. 产品需求与交互行为以 PRD、用户流程、AI 规范和组件规范为准。
2. 公共知识内容与个人学习数据必须分离。
3. AI 的推测不能直接写成已确认的用户弱项；应记录证据、置信度，并通过验证题确认。
4. 文档修改应通过 Pull Request 或团队评审；重要决定同步更新 `DECISIONS.md`。
5. 文档中的技术选型均为待评审项，不能仅凭示例当成最终决定。

## 知识库生产

知识点、题目与真题登记的字段规则见 `docs/04-Data/Knowledge-Standard.md`，可执行细则见 `prompts/conventions.md`。

| 任务 | 提示词 | Schema |
| --- | --- | --- |
| 知识点 | `prompts/knowledge-point-generation.md` | `schemas/knowledge-point.schema.json` |
| 题目 | `prompts/question-generation.md` | `schemas/question.schema.json` |
| 真题登记 | `prompts/exam-source-registration.md` | `schemas/exam-source.schema.json` |

产出统一用 `pnpm validate:knowledge` 校验，`pnpm build:knowledge` 编译进包。
