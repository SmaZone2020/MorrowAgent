# 11 知识库数据标准

## 1. 目标

确保四人及未来社区贡献者生产的数据可以被统一解析、检索、关联和升级。

## 2. ID 规范

建议使用稳定、可读、不可因名称修改而变化的 ID。示例仅作格式建议：

- 学科：`math_higher`
- 章节：`math_higher_limits`
- 知识点：`math_higher_limits_one_sided_limit`
- 题目：`math_higher_q_000001`

最终 ID 规则由知识库维护者统一发布。

## 3. 知识点字段建议

| 字段 | 必需 | 说明 |
|---|---|---|
| id | 是 | 唯一 ID |
| name | 是 | 名称 |
| subject_id | 是 | 学科 ID |
| chapter_id | 是 | 章节 ID |
| description | 是 | 定义或说明 |
| learning_objectives | 建议 | 学习目标 |
| prerequisites | 建议 | 前置知识点 ID |
| related_points | 建议 | 关联知识点 ID |
| difficulty | 建议 | 难度 |
| exam_importance | 建议 | 考试重要程度 |
| sources | 建议 | 教材或资料来源 |
| version | 是 | 数据版本 |

## 4. 题目字段建议

| 字段 | 必需 | 说明 |
|---|---|---|
| id | 是 | 唯一 ID |
| content | 是 | 题干 |
| question_type | 是 | 题型 |
| difficulty | 是 | 难度 |
| answer | 是 | 标准答案 |
| explanation | 是 | 解析 |
| knowledge_tags | 是 | 至少关联一个知识点 |
| source_type | 是 | 真题/改编/原创 |
| source_reference | 视情况 | 来源及出处 |
| solution_methods | 建议 | 可行解法 |
| common_errors | 建议 | 常见错误 |
| version | 是 | 数据版本 |

## 5. 难度与考试层次

建议将题目难度与考试训练层次分开：
- 难度：基础、较易、中等、较难、高难（具体标尺待校准）。
- 训练层次：送分题、基础题、进阶题、高难题。

二者有关联，但不能简单视为同一个字段。

## 6. 数据质量规则

- ID 不重复。
- 题目至少关联一个有效知识点。
- 答案可验证，解析与答案一致。
- 题目来源和版权状态清楚。
- 前置关系不得形成无意义循环。
- 枚举字段使用统一值。
- 数据必须能通过自动校验。
- AI 生成内容必须经过人工抽检，不能未经审核直接标为权威真题。

## 7. 版权与来源

真题、教材、解析等内容需记录来源和使用许可。公开可访问不代表可以自由再分发。对授权不明确的内容，先记录元数据或链接，不直接打包传播。
