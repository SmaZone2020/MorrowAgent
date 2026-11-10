# 11 知识库数据标准

## 1. 目标

确保四人及未来社区贡献者生产的数据可以被统一解析、检索、关联和升级。

可执行的细则集中在 `prompts/conventions.md`：ID 规则、难度标尺、数学表述、版权口径都在那里。本文只说明字段与约束的边界。

## 2. ID 规范

- 学科：`math_higher`
- 章节：`math_higher_{章节 slug}`，如 `math_higher_limits`
- 知识点：`math_higher_{章节 slug}_{snake_case}`，如 `math_higher_limits_one_sided_limit`
- 题目：`math_higher_q_{6 位数字}`，如 `math_higher_q_000001`
- 真题登记：`math_higher_exam_{年份}_{地区}_{卷别}`，如 `math_higher_exam_2023_shaanxi_zsb`

只允许 `[a-z0-9_]`。**ID 发布后不得修改**，改名只改 `name`；题目 ID 不复用，下线题目的序号永久作废。

## 3. 知识点字段

| 字段 | 必需 | 说明 |
|---|---|---|
| id | 是 | 唯一 ID，见第 2 节 |
| name | 是 | 名称，用教材通行译名 |
| subject_id | 是 | 学科 ID |
| chapter_id | 是 | 章节 ID，必须等于所在 `chapter.id` |
| description | 是 | 定义或说明，脱离上下文可独立读懂 |
| difficulty_basis | 是 | 认知负荷判定理由，见第 5 节 |
| learning_objectives | 建议 | 学习目标，以可观察行为开头 |
| prerequisites | 建议 | 前置知识点 ID，不得成环 |
| related_points | 建议 | 关联知识点 ID，不得与前置重复 |
| difficulty | 建议 | 认知负荷难度 |
| exam_importance | 建议 | 考试重要程度 |
| exam_levels | 建议 | 通常出现的训练层次 |
| common_errors | 建议 | 高频错误机制，不写具体题目答案 |
| sources | 建议 | 教材或资料来源 |
| version | 是 | 数据版本 |

## 4. 题目字段

| 字段 | 必需 | 说明 |
|---|---|---|
| id | 是 | 唯一 ID，全局不复用 |
| content | 是 | 题干 |
| question_type | 是 | 题型 |
| difficulty | 是 | 题目难度，按正确率区间标定 |
| difficulty_basis | 是 | 正确率区间与判定依据 |
| answer | 是 | 标准答案 |
| explanation | 是 | 解析，能独立复现解题过程 |
| knowledge_tags | 是 | 1–4 个知识点，首个为主考点 |
| source_type | 是 | 真题 / 真题改编 / AI 原创 |
| source_reference | 视情况 | AI 原创写批次号 |
| source_exam_id | 视情况 | 真题与改编题必填，指向真题登记项 |
| adaptation_note | 视情况 | 改编题必填，说明改了什么 |
| solution_methods | 建议 | 可行解法 |
| common_errors | 建议 | 常见错误，带错误类型 |
| estimated_minutes | 建议 | 预计用时（分钟） |
| version | 是 | 数据版本 |

### 题型与字段一致性

- 选择、判断、多选题必须有 `options`；其中判断题恰好 2 项，`A`=正确、`B`=错误。
- 填空、解答、证明题**不得出现** `options`。
- 多选题 `answer` 为字母升序拼接，题干须写明「多选」。

## 5. 难度与考试层次

难度与考试层次是两把独立的尺子，不可混用：

- **题目难度** `difficulty`：按目标人群正确率区间标定——送分 `≥85%`、较易 `70%–85%`、中等 `55%–70%`、较难 `40%–55%`、高难 `<40%`。
- **知识点难度** `difficulty`：按认知负荷标定，依据是先修的抽象层次，不看正确率。
- **训练层次** `exam_level` / `exam_levels`：送分题、基础题、进阶题、高难题，描述卷面位置与分值量级。

每道题、每个知识点都必须写 `difficulty_basis`，说明落在该档的理由。

## 6. 真题与版权

已确认口径：**授权不明的真题只登记元数据与链接，不收录题干原文。**

- 真题台账单独存 `exam-sources.yaml`，顶层键 `exam_sources`，由 `schemas/exam-source.schema.json` 校验。
- 题目引用真题必须填 `source_exam_id`，且该登记项的 `license` 必须是 `public_domain`；否则校验脚本直接报错。
- `license` 缺省为 `metadata_only`，表示只允许登记元数据。
- 改编题（`adapted_exam`）题干自写，但仍需挂 `source_exam_id` 并填 `adaptation_note`。
- 公开可访问不代表可以自由再分发。授权不明确时，先记录元数据或链接，不直接打包传播。

## 7. 数据质量规则

- ID 不重复，且不复用已下线对象的 ID。
- 题目至少关联一个有效知识点，首个标签为主考点。
- 答案可验证，解析与答案一致。
- 前置关系不得成环，也不得把「相关」写成「前置」。
- 枚举字段使用统一值。
- 数据必须能通过 `pnpm validate:knowledge`。
- AI 生成内容必须经过人工抽检，不能未经审核直接标为权威真题。
- 只改数字的变体题视为重复题。

## 8. 章节骨架

先立结构、暂不出题时，允许只提交 `knowledge-points.yaml`：

- `chapter.version` 从 `0.1.0` 起步，表示「结构已定、内容待补」。
- 补完题目后升到 `1.0.0`。
- 骨架章节的 `questions.yaml` 写 `questions: []` 并留一行说明。
