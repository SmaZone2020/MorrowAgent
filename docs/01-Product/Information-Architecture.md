<div align="center">

# Information Architecture · 03 信息架构与页面清单

**Top-level navigation, the page inventory, and what each page is responsible for.**

[![Reference](https://img.shields.io/badge/REFERENCE-6b7280?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.

## 1. 顶层导航

```text
Dashboard
Lumi AI
我的学习
  ├─ 学习目标
  ├─ 学习计划
  ├─ 知识画像
  └─ 学习报告
训练中心
  ├─ 智能测评
  ├─ 专项训练
  └─ 模拟考试
错题本
知识库
Settings
  ├─ AI Provider
  ├─ 模型配置
  └─ 数据管理
```

## 2. 页面说明

| 页面 | 核心内容 | 主要操作 |
|---|---|---|
| Dashboard | 掌握度、薄弱点、目标、能力雷达、趋势 | 进入任务、查看弱项 |
| Lumi AI | 对话流、交互组件、上下文 | 提问、作答、绘图、提交事件 |
| 学习目标 | 目标分数、考试日期、难度层次 | 新建、调整、确认建议 |
| 学习计划 | 阶段任务、日/周计划 | 完成、延期、与 AI 调整 |
| 知识画像 | 知识树、掌握度、置信度、图谱 | 展开节点、查看证据 |
| 学习报告 | 学习过程和变化 | 查看、反馈 |
| 智能测评 | 诊断流程与结果 | 作答、提交思路 |
| 专项训练 | 按知识点/弱项训练 | 选择时长、开始训练 |
| 模拟考试 | 简化考试流程 | 开始、计时、交卷 |
| 错题本 | 错题列表与详情 | 编辑、删除、复习 |
| 知识库 | 学科、章节、知识点 | 搜索、查看关系 |
| Settings | Provider、模型、数据 | 配置、备份、导出 |

## 3. Lumi AI 工作台布局建议

- 主区域：按时间排列的对话消息和交互卡片。
- 输入区：文本、语音入口、附件入口。
- 组件区域：由 AI 消息动态创建，可嵌入题目卡片。
- 画板：嵌入题目卡片，可由用户手动伸缩；每道题的画板状态独立。
- 状态提示：显示组件提交状态、网络状态和 AI 处理中状态。

具体响应式布局和导航细节由交互原型评审确定。
