<div align="center">

# Morrow Agent 文档

**产品：** Morrow Agent · **AI 助手：** Lumi · **文档版本：** 0.1.0

[![文档](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-%E7%B4%A2%E5%BC%95-2f6f5e?style=flat-square)](#重要文档)
[![核心](https://img.shields.io/badge/%E6%A0%B8%E5%BF%83-%E5%85%88%E8%AF%BB-c2410c?style=flat-square)](#重要文档)
[![状态](https://img.shields.io/badge/%E7%8A%B6%E6%80%81-MVP-6b7280?style=flat-square)](#文档状态说明)

[English](DOCS.md) · **中文**

</div>

---

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
| [`docs/理念体系.md`](docs/理念体系.md) | ![核心](https://img.shields.io/badge/%E6%A0%B8%E5%BF%83-c2410c?style=flat-square) | 产品赖以成立的理念：教育公平、自主学习、AI Native、品牌哲学。讨论功能之前先读它。 |
| [`docs/04-Data/Package-Authoring-Guide.zh-CN.md`](docs/04-Data/Package-Authoring-Guide.zh-CN.md) | ![必读](https://img.shields.io/badge/%E5%BF%85%E8%AF%BB-2f6f5e?style=flat-square) | 如何产出一个能装、能读、能出卷、能画像的 `.morrow` 学习包。 |
| [`docs/04-Data/MLPS.md`](docs/04-Data/MLPS.md) | ![必读](https://img.shields.io/badge/%E5%BF%85%E8%AF%BB-2f6f5e?style=flat-square) | 学习包规范：格式、Schema、版本与分发规则。 |
| [`docs/01-Product/PRD.md`](docs/01-Product/PRD.md) | ![必读](https://img.shields.io/badge/%E5%BF%85%E8%AF%BB-2f6f5e?style=flat-square) | 产品需求、角色、功能范围与 MVP 优先级。 |
| [`docs/05-Engineering/Architecture.md`](docs/05-Engineering/Architecture.md) | ![参考](https://img.shields.io/badge/%E5%8F%82%E8%80%83-6b7280?style=flat-square) | 架构目标、分层与实现最终确定的技术决策。 |

## 语言版本

英文为默认版本。四篇核心文档有完整中文版；其余文档正文为中文，顶部附英文标题与摘要。

| 英文 | 中文 |
| --- | --- |
| [`README.md`](README.md) | [`README.zh-CN.md`](README.zh-CN.md) |
| [`DOCS.md`](DOCS.md) | [`DOCS.zh-CN.md`](DOCS.zh-CN.md) |
| [`docs/Philosophy.md`](docs/Philosophy.md) | [`docs/理念体系.md`](docs/理念体系.md) |
| [`docs/04-Data/Package-Authoring-Guide.md`](docs/04-Data/Package-Authoring-Guide.md) | [`docs/04-Data/Package-Authoring-Guide.zh-CN.md`](docs/04-Data/Package-Authoring-Guide.zh-CN.md) |

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
| `docs/04-Data/Package-Authoring-Guide.zh-CN.md` | 学习包编写指南 |

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

知识点、题目与真题登记的字段规则见 `docs/04-Data/Knowledge-Standard.md`。用于生产这些内容的提示词属于工作材料，不随本仓库分发；下面的 Schema 才是它们必须满足的契约。

| 任务 | Schema |
| --- | --- |
| 知识点 | `schemas/knowledge-point.schema.json` |
| 题目 | `schemas/question.schema.json` |
| 真题登记 | `schemas/exam-source.schema.json` |

产出统一用 `pnpm validate:knowledge` 校验，`pnpm build:knowledge` 编译进包。
