# 07 AI 交互组件规范

- 版本：0.1.0
- 状态：产品规范初稿；通信字段需与工程实现共同评审

## 1. 目标

Lumi AI 对话页是交互式学习工作台。AI 可以动态创建和更新组件；用户对组件的选择、绘图、拖动、编辑和提交等操作必须以结构化事件回传 AI。

组件不是静态 UI，而是 AI 与学习者之间的双向交互媒介。

## 2. 组件分类

| 类别 | 组件 | MVP 建议 |
|---|---|---|
| 选择交互 | 单选、多选、判断 | P0 |
| 结构交互 | 排序、拖拽匹配 | P1 |
| 数学输入 | MathBoard、公式编辑器 | P0 核心画板；公式编辑器按资源评估 |
| 数学可视化 | FunctionRenderer、CoordinateSystem | P0 核心函数渲染 |
| 学习内容 | QuestionCard、KnowledgeCard、ExampleCard | P0 |
| 数据展示 | Chart、RadarChart、KnowledgeGraph | 基础图表 P0；完整图谱交互逐步完善 |
| 任务管理 | GoalCard、PlanCard、TaskCard | P1 |

## 3. 统一组件生命周期

```text
AI 创建组件
  ↓
前端校验并渲染
  ↓
用户交互
  ↓
客户端更新组件状态
  ↓
产生结构化事件
  ↓
事件聚合、去重和持久化
  ↓
回传 Agent
  ↓
Agent 理解事件并决定下一步
  ↓
更新组件 / 创建新组件 / 回复文本
```

## 4. 统一组件描述（概念结构）

```json
{
  "componentId": "component_unique_id",
  "componentType": "single_choice",
  "schemaVersion": "1.0",
  "title": "问题标题",
  "props": {},
  "state": {},
  "context": {
    "conversationId": "conversation_id",
    "messageId": "message_id",
    "taskId": "task_id",
    "questionId": "question_id",
    "knowledgePointIds": []
  }
}
```

字段定义为概念草案，最终以 API 协议为准。前端必须对组件类型、版本和属性进行校验，不应直接执行 AI 返回的任意代码。

## 5. 统一事件结构（概念结构）

```json
{
  "eventId": "event_unique_id",
  "eventType": "choice_selected",
  "componentId": "component_unique_id",
  "conversationId": "conversation_id",
  "messageId": "message_id",
  "taskId": "task_id",
  "occurredAt": "ISO-8601 timestamp",
  "sequence": 1,
  "payload": {
    "optionId": "option_c"
  }
}
```

建议字段：
- `eventId`：事件唯一 ID，用于幂等。
- `eventType`：事件类型。
- `componentId`：所属组件。
- `conversationId`、`messageId`、`taskId`：上下文关联。
- `occurredAt`：事件发生时间。
- `sequence`：同组件内顺序。
- `payload`：事件数据。

## 6. 事件类型示例

### 选择组件
- `option_selected`
- `selection_changed`
- `answer_submitted`

### 画板
- `stroke_started`
- `stroke_completed`
- `stroke_erased`
- `undo_performed`
- `redo_performed`
- `board_resized`
- `board_submitted`

### 函数渲染
- `viewport_changed`
- `point_selected`
- `curve_toggled`
- `expression_changed`
- `graph_interaction_submitted`

### 通用
- `component_opened`
- `component_collapsed`
- `component_expanded`
- `component_reset`
- `component_submitted`

## 7. MathBoard 画板要求

已确认：
- 嵌入题目卡片。
- 用户可手动控制每道题画板的伸缩。
- 每道题画板状态相互独立。
- 支持尽可能完整的基础书写能力。

建议能力：
- 自由手写。
- 橡皮擦。
- 撤销/重做。
- 多颜色画笔。
- 选择、移动、缩放。
- 插入文本或公式（需评估）。
- 保存笔迹轨迹及最终快照。
- 提交给 AI 分析。

数据采集原则：
- 保留有价值的笔迹顺序和编辑行为。
- 不必将每个像素移动实时发送给模型。
- 客户端可按笔画完成或提交节点批量回传。
- 需评估笔迹数据大小、隐私、存储和跨端兼容。

## 8. FunctionRenderer 函数渲染要求

建议支持：
- 渲染函数表达式。
- 坐标轴与网格。
- 缩放和平移。
- 显示/隐藏曲线。
- 用户选择坐标点。
- 受控的表达式修改。
- 将关键交互事件回传 AI。

表达式解析与渲染必须使用受限表达式语法或安全解析器，不得执行任意脚本。

## 9. AI 回调原则

- 用户选项、画板内容、图像操作等应回传 AI。
- 回调必须携带组件和题目上下文。
- 需要区分“操作中间态”和“用户已提交”。
- 高频事件应聚合，避免请求风暴。
- 重要事件先可靠保存，再发起 AI 请求。
- 事件重复提交不得重复更新学习记录。
- AI 应能引用具体事件或操作证据进行解释。

## 10. 验收要点

- AI 能创建至少单选、题目卡片、画板和函数图像组件。
- 用户操作能产生结构化事件。
- 事件能关联正确题目和知识点。
- Lumi 能根据回传事件继续教学或追问。
- 组件可展开/收起，画板状态不会串题。
- 刷新或网络短暂中断后，已保存内容可恢复。
- 非法组件定义不会导致前端执行任意代码。
