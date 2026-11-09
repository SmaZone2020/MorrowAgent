# 13 技术架构设计（决策框架）

- 状态：待技术评审；本文件不锁定技术栈

## 1. 架构目标

- Windows 与 Android 提供一致的核心学习体验。
- 本地保存用户个人学习数据。
- 通过 Provider 抽象接入云端模型及未来本地模型。
- 公共知识库可独立版本化更新。
- AI 与交互组件双向通信。
- MVP 结构简单、可演示、可维护。

## 2. 逻辑分层

```text
客户端 UI
  ├─ Dashboard
  ├─ Lumi Workspace
  ├─ Interactive Component Renderer
  └─ Learning Views
       ↓
应用服务层
  ├─ Conversation Orchestrator
  ├─ Learning Workflow
  ├─ Memory Service
  ├─ Diagnostic Service
  ├─ Question Service
  └─ Knowledge Service
       ↓
Provider / Infrastructure
  ├─ Model Provider Adapter
  ├─ Speech Provider Adapter
  ├─ Local Database
  ├─ Knowledge Pack Manager
  └─ Optional Cloud API
```

## 3. 架构原则

- AI Provider 应通过统一适配层接入，避免业务逻辑绑定单一模型厂商。
- 交互组件使用受限、版本化的组件协议。
- 用户个人数据与公共知识资源分开存储。
- 模型调用失败时保留用户输入和已提交状态。
- MVP 优先单主 Agent + 工具/工作流；暂不要求多模型集群。
- 离线能力分层定义，不应在未验证前承诺“完全离线”。

## 4. 待决策

- Windows/Android 客户端技术。
- 本地数据库及文件存储。
- 是否需要独立云端业务服务。
- 模型流式输出与工具调用协议。
- 语音服务供应商及授权。
- 知识包更新与签名校验。
- 备份、恢复与多端同步策略。
- Mock Demo 的数据隔离方式。
