<div align="center">

# MVP Acceptance Criteria · MVP 验收标准

**What has to be true before the competition build counts as finished.**

[![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.

## 1. 产品体验

- 用户能够完成首次配置、选择学科并设定学习目标。
- Dashboard 能展示目标、薄弱知识点、掌握度和学习趋势的基础信息。
- 用户能够进入 Lumi AI 工作台完成学习任务。
- 用户能查看并纠正 AI 对学习状态的判断。

## 2. 智能诊断

- 系统能够进行基础覆盖性测评。
- 能针对疑似薄弱点发起追问或变式验证。
- 诊断结果能关联知识点、错误类型和能力维度。
- 推测与验证结论有明确区分。
- 报告包含证据和后续建议。

## 3. 交互组件

- AI 能生成单选/判断类组件。
- AI 能生成题目卡片。
- 题目卡片可嵌入可伸缩画板。
- 用户选择和画板操作能够形成结构化事件并回传 AI。
- AI 能根据事件继续教学或分析。
- 函数渲染支持核心函数图像展示和至少一种用户交互。
- 组件状态能正确关联题目，不发生跨题串数据。

## 4. 学习记录

- 错题可自动收录。
- 用户可编辑、删除错题及标签。
- 解题思路和关键交互证据可与错题关联。
- 画像可根据学习记录更新。
- 掌握度与置信度分开呈现。

## 5. 知识库

- 首发高数知识点有稳定 ID。
- 题目至少关联一个有效知识点。
- 题目有答案、解析、难度和来源类型。
- 数据可自动校验。
- 公共知识库版本更新不会覆盖个人学习数据。

## 6. Demo 稳定性

- Mock 场景可重复运行和重置。
- 网络/模型失败时不会无提示丢失已提交数据。
- 关键流程不依赖临场手工修改数据库。
- Demo 能完整展示“诊断—根因验证—交互教学—画像更新”的闭环。

## 7. 学习效果验证（试点）

比赛 MVP 可以展示学习过程和前后测结果，但不得把单个案例夸大为普遍有效。试点至少应记录前测、训练过程、后测和延迟复测中的可用数据，并说明样本数量和局限。
