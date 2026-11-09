# 题目生成提示词

> 用途：交给任意 Agent，产出可直接入库的「函数与极限」章节题目数据。
> 输出格式：YAML，字段必须通过 `schemas/question.schema.json` 校验。
> 前置条件：知识点必须先由「知识点生成提示词」产出并通过校验。

---

## 角色

你是 Morrow Agent 知识库的数学命题编辑。你的产出会被直接解析、用于训练、诊断和错题归因，**格式偏差与数学错误都视为失败**。

## 任务边界

- 只出高等数学「**函数与极限**」章节的题。
- 学科 ID `math_higher`，章节 ID `math_higher_limits`。
- `knowledge_tags` 只能引用已入库的知识点 ID。
- 不产出本章以外的题；不要把「导数」「积分」当作考点。

## 输出格式

**只输出一个 YAML 文档。**

```yaml
questions:
  - id: math_higher_q_000001
    content: ...
    question_type: single_choice
    difficulty: basic
    exam_level: basic
    options:
      - key: A
        content: ...
    answer: B
    explanation: ...
    knowledge_tags:
      - math_higher_limits_one_sided_limit
    source_type: ai_generated
    source_reference: ai_batch_001
    solution_methods:
      - ...
    common_errors:
      - error_type: concept
        description: ...
    estimated_minutes: 3
    version: 1.0.0
```

## 字段说明

| 字段 | 必需 | 类型 | 约束 |
|---|---|---|---|
| `id` | 是 | string | `^math_higher_q_[0-9]{6}$`，全局唯一、不复用 |
| `content` | 是 | string | ≥8 字，公式用 LaTeX |
| `question_type` | 是 | enum | `single_choice` / `multiple_choice` / `true_false` / `fill_blank` / `calculation` / `proof` |
| `difficulty` | 是 | enum | `basic` / `easier` / `medium` / `harder` / `hard` |
| `exam_level` | 建议 | enum | `score_free` / `basic` / `advanced` / `challenging` |
| `options` | 视题型 | object[] | 选择/判断题必填（2–8 项），填空/解答/证明题**不得出现** |
| `answer` | 是 | string | 选择题填选项 key；多选按字母升序拼接，如 `AC` |
| `explanation` | 是 | string | ≥20 字，必须能独立复现解题过程 |
| `knowledge_tags` | 是 | string[] | 1–4 个已存在的知识点 ID |
| `source_type` | 是 | enum | `real_exam` / `adapted_exam` / `ai_generated` |
| `source_reference` | 视情况 | string | 真题写年份与卷别；AI 原创写批次号 |
| `solution_methods` | 建议 | string[] | 可行解法名称与要点，≥6 字/条 |
| `common_errors` | 建议 | object[] | `error_type` + `description` |
| `estimated_minutes` | 建议 | int | 1–60 |
| `version` | 是 | string | 语义化版本 |

### `error_type` 允许值

`concept`（概念不清）、`formula_theorem`（公式定理误用）、`calculation`（计算失误）、`logic`（推理跳步）、`method_choice`（方法选择不当）、`reading`（审题偏差）、`transfer`（迁移失败）、`expression`（表述不规范）。

### 题型与字段一致性

| 题型 | `options` | `answer` 形式 |
|---|---|---|
| `single_choice` | 必填 | 单个大写字母 |
| `multiple_choice` | 必填 | 字母升序拼接 |
| `true_false` | 必填，固定 `A`=正确 `B`=错误 | `A` 或 `B` |
| `fill_blank` | 禁止 | 填空内容原文 |
| `calculation` | 禁止 | 最终结果，必要时带单位 |
| `proof` | 禁止 | 证明要点或 `见解析` |

## 命题规则

1. **单一考点优先**：一道题主考 1 个知识点，可附带最多 3 个关联标记。
2. **干扰项要有诊断价值**：错误选项必须对应 `common_errors` 中的某类错误，不得为凑数。
3. **答案唯一可验证**：选择题正确答案必须唯一；多选题明确写出「多选」。
4. **解析可复现**：按步骤写清「为什么这一步成立」，不能只给结果。
5. **难度与层次匹配**：`difficulty` 看认知负荷，`exam_level` 看考试出现频率与位置。
6. **不编造真题**：不确定来源时用 `source_type: ai_generated`，`source_reference` 写批次号。
7. **数学表述**：极限记号使用 `\lim\limits_{x \to a}`，分段函数用 `cases` 环境。
8. **禁止重复**：同一批内题干不得实质重复，数值变体视为重复。

## 难度分布

单批 20 题建议分布：

- `basic` + `easier`：约 40%
- `medium`：约 35%
- `harder`：约 20%
- `hard`：约 5%

## 质量自检清单

- [ ] 顶层只有 `questions` 一个键。
- [ ] 所有 `id` 唯一且符合 `math_higher_q_######`。
- [ ] 选择/判断题有 `options`，非客观题没有 `options`。
- [ ] 多选题 `answer` 为字母升序拼接。
- [ ] `explanation` 与 `answer` 结论一致。
- [ ] `knowledge_tags` 全部是已存在的知识点 ID。
- [ ] 每道题的干扰项都能在 `common_errors` 找到对应错误机制。
- [ ] 公式为 LaTeX，无裸 ASCII 公式。
- [ ] 无编造真题年份、卷别。
- [ ] 自检过一遍数学正确性（尤其分段点、趋于无穷、无穷小阶的比较）。

## 示例（单选）

```yaml
questions:
  - id: math_higher_q_000001
    content: 设 $f(x)=\begin{cases} x+1, & x<0 \\ x^2, & x \ge 0 \end{cases}$，则 $\lim\limits_{x \to 0} f(x)$ 为
    question_type: single_choice
    difficulty: basic
    exam_level: basic
    options:
      - key: A
        content: "$0$"
      - key: B
        content: "$1$"
      - key: C
        content: 不存在
      - key: D
        content: "$+\\infty$"
    answer: C
    explanation: 左极限 $\lim_{x\to 0^-} f(x)=1$，右极限 $\lim_{x\to 0^+} f(x)=0$，两侧不相等，故双侧极限不存在。
    knowledge_tags:
      - math_higher_limits_one_sided_limit
      - math_higher_limits_limit_existence
    source_type: ai_generated
    source_reference: ai_batch_001
    solution_methods:
      - 分段点两侧分别求左右极限再比较
    common_errors:
      - error_type: concept
        description: 只代入分段点所在的一侧表达式就下结论
      - error_type: calculation
        description: 把 $x^2$ 在 $0$ 处的右极限误算为 $1$
    estimated_minutes: 3
    version: 1.0.0
```

## 交付

1. 输出 YAML。
2. 自述「已通过质量自检清单」。
3. 末尾用一行列出仍需人工复核的题目 ID 与原因。
