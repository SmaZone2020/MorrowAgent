<div align="center">

# User Journey · 04 用户旅程与核心流程

**The first-run flow, the daily learning loop, and where diagnosis fits in.**

[![Reference](https://img.shields.io/badge/REFERENCE-6b7280?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.

## 1. 首次使用

```text
启动应用
  ↓
Lumi 欢迎与产品介绍
  ↓
配置 AI Provider
  ↓
选择学习阶段与学科
  ↓
用户自评（参考信息，不作为最终诊断）
  ↓
交流学习目标与考试情况
  ↓
初始覆盖性测评
  ↓
对疑似薄弱点追问
  ↓
变式题验证
  ↓
生成诊断报告与学习画像
  ↓
用户确认或纠正 AI 判断
  ↓
进入 Dashboard
```

## 2. 日常学习

```text
Dashboard 查看今日状态
  ↓
查看 Lumi 建议/选择学习任务
  ↓
进入 Lumi AI 工作台
  ↓
讲解、题目、画板、函数图像等交互
  ↓
用户操作产生结构化事件
  ↓
事件回传 AI，结合上下文分析
  ↓
完成训练或继续追问
  ↓
错题与学习记录更新
  ↓
更新画像、复习安排和学习计划
```

## 3. 薄弱点诊断示例

场景：用户在极限题中出错。

1. Lumi 记录最终答案和用户思路。
2. 初步判断可能与左右极限概念有关。
3. 将其标记为“待验证推测”，而不是确定弱项。
4. 生成一道区分左右极限理解的验证题。
5. 根据回答及推导过程更新判断。
6. 若确认薄弱，安排针对性讲解和变式训练。
7. 延迟复测，观察是否真正掌握。

## 4. 目标调整流程

1. 用户说明考试目标、目标分数、考试日期和偏好的题目难度层次。
2. Lumi 根据诊断结果提出阶段目标与学习安排。
3. 持续追踪完成情况。
4. 当学习成果与目标出现明显偏差，或进步快于预期时，Lumi 提出调整建议。
5. 用户确认、修改或拒绝；保留调整记录。

## 5. Demo 旅程

建议使用可重复的 Mock 用户和固定场景：
- 预置初始画像。
- 预置一段历史错题。
- 现场完成一道诊断题。
- 展示画板操作和事件回传。
- Lumi 推断并验证根因。
- 更新知识画像。
- 展示学习建议变化。

Mock 模式应允许重置，避免比赛现场状态不可控。
