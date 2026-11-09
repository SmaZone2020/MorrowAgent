# 10 数据模型与实体关系设计

- 状态：概念模型，非最终数据库 Schema

## 1. 数据边界

必须分离：
1. 公共知识库数据：学科、章节、知识点、知识关系、题目、教材和来源。
2. 用户个人数据：画像、目标、计划、答题记录、错题、记忆、组件事件。

公共知识库升级不得覆盖个人学习数据。

## 2. 核心实体

### 公共知识域
- `Subject`
- `Chapter`
- `KnowledgePoint`
- `KnowledgeRelation`
- `Question`
- `QuestionKnowledgeTag`
- `Source`
- `KnowledgePackVersion`

### 用户学习域
- `UserProfile`
- `LearningGoal`
- `LearningPlan`
- `LearningTask`
- `LearningSession`
- `AnswerAttempt`
- `SolutionArtifact`
- `WrongQuestion`
- `KnowledgeMastery`
- `MemoryRecord`
- `LearningReport`

### 交互事件域
- `Conversation`
- `Message`
- `InteractiveComponent`
- `ComponentState`
- `InteractionEvent`

## 3. 关键关系

```text
Subject 1 ── N Chapter
Chapter 1 ── N KnowledgePoint
KnowledgePoint N ── N KnowledgePoint (KnowledgeRelation)
Question N ── N KnowledgePoint
User 1 ── N LearningGoal
User 1 ── N LearningSession
LearningSession 1 ── N AnswerAttempt
AnswerAttempt 1 ── N InteractionEvent
User N ── N KnowledgePoint (KnowledgeMastery)
```

## 4. 关键设计要求

- 所有公共知识点和题目使用稳定唯一 ID。
- 关系类型需明确区分 prerequisite、related、broader、similar 等。
- 答题记录应保留题目版本或内容快照，避免公共题目更新后历史记录失真。
- 组件事件应有唯一 ID、时间戳和顺序号。
- 事件应关联会话、消息、组件、题目和任务（适用时）。
- AI 推断记录应保存证据来源和状态。
- 删除或更新公共资源不得破坏用户历史答题记录。

## 5. 待工程评审

- 本地数据库技术与迁移策略。
- 多端同步是否纳入首发。
- 大体积画板笔迹如何存储。
- 题目版本快照策略。
- 事件保留周期和数据清理策略。
