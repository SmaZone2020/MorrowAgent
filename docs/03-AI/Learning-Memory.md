<div align="center">

# Learning Memory and the Learner Model · 08 学习者记忆与画像规范

**What is remembered, how mastery differs from confidence, and how the model stays correctable.**

[![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.

## 1. 目标

建立持续、可解释、可纠正的学习者状态，而不是简单保存聊天记录。

## 2. 记忆分层

| 类型 | 记录内容 | 示例 |
|---|---|---|
| STM | 当前会话和任务状态 | 当前题目、当前步骤、临时假设 |
| LTM | 稳定学习偏好和长期状态 | 长期薄弱点、目标、教学偏好 |
| Episodic Memory | 具体学习事件 | 某次测评、错题、复习和考试经历 |
| Procedural Memory | 解题与学习行为模式 | 常用方法、容易跳步、检查习惯 |

## 3. 学习画像维度

- 学科与知识点掌握情况。
- 错误类型分布。
- 概念理解、计算、逻辑、方法选择、迁移等能力维度。
- 独立完成程度。
- 解题习惯和策略。
- 学习节奏与偏好。
- 长期目标、阶段目标和时间约束。

## 4. 掌握度与置信度

掌握度可用 0–100 展示；置信度独立表示系统对该判断的把握程度。

掌握度不能仅由一次答题正确率决定。证据至少考虑：
- 多题表现和题型覆盖。
- 思路是否正确。
- 是否独立完成。
- 变式题迁移。
- 延迟复习表现。

计算公式、权重和置信度校准方式待数据积累后确定，MVP 不应伪装成经过科学验证的精确测量。

## 5. 证据与状态

每个画像判断建议保存：
- 结论。
- 关联知识点。
- 证据记录 ID。
- 判断状态（推测/已验证/用户修正）。
- 置信度。
- 更新时间。
- 用户是否确认。

## 6. 用户控制

- 用户可以纠正 AI 对自身水平和习惯的判断。
- 用户可以查看、编辑或删除错题和学习记录。
- AI 更新长期画像时应遵循明确的数据规则。
- 个人数据应支持备份、导出和删除。
