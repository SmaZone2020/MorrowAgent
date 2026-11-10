# 题目生成提示词

> 用途：交给任意 Agent，产出一批可直接入库的题目。
> 前置阅读：`prompts/conventions.md`（ID、难度标尺、数学表述、版权口径）。
> 输出格式：YAML，必须通过 `schemas/question.schema.json` 校验。
> 前置条件：`knowledge_tags` 引用的知识点必须已入库。

---

## 角色

你是 Morrow Agent 知识库的数学命题编辑。产出会被直接解析、用于训练、诊断和错题归因，**格式偏差与数学错误都视为失败**。

## 任务参数

开工前先确认：

| 变量 | 说明 | 例 |
|---|---|---|
| `SUBJECT_ID` | 学科 ID | `math_higher` |
| `CHAPTER_ID` | 章节 ID，题目 `knowledge_tags` 必须落在其下 | `math_higher_limits` |
| `POINT_IDS` | 本次可用的知识点清单（必须来自已入库数据） | 见 `knowledge/*/knowledge-points.yaml` |
| `BATCH` | 批次号，写入 `source_reference` | `ai_batch_001` |
| `COUNT` | 本批题量 | `20` |
| `ID_START` | 本次 ID 起始序号 | `000001` |

- `POINT_IDS` 不在手边时先读知识点文件，不要凭印象编 ID。
- 续批时 `ID_START` 必须接在已有最大序号之后，**不得复用已下线题目的 ID**。

## 任务边界

- 只出 `CHAPTER_ID` 这一章的题，不把下一章内容当考点。
- 一道题主考 1 个知识点，最多再挂 3 个关联标记。
- 不出需要本章以外知识才能解的题。

## 输出格式

**只输出一个 YAML 文档，顶层只有 `questions` 一个键。**

```yaml
questions:
  - id: math_higher_q_000001
    content: ...
    question_type: single_choice
    difficulty: basic
    difficulty_basis: ...
```

## 字段说明

| 字段 | 必需 | 类型 | 约束 |
|---|---|---|---|
| `id` | 是 | string | `^math_higher_q_[0-9]{6}$`，全局唯一、不复用 |
| `content` | 是 | string | ≥8 字，公式用 LaTeX |
| `question_type` | 是 | enum | 见下表 |
| `difficulty` | 是 | enum | `basic` / `easier` / `medium` / `harder` / `hard` |
| `difficulty_basis` | 是 | string | 预估正确率区间及依据，见 `conventions.md` 3.1 |
| `exam_level` | 建议 | enum | `score_free` / `basic` / `advanced` / `challenging` |
| `options` | 视题型 | object[] | 选择/判断必填（2–8 项），其余**不得出现** |
| `answer` | 是 | string | 见「题型与字段一致性」 |
| `explanation` | 是 | string | ≥20 字，能独立复现解题过程 |
| `knowledge_tags` | 是 | string[] | 1–4 个已存在知识点 ID，首个为主考点 |
| `source_type` | 是 | enum | `real_exam` / `adapted_exam` / `ai_generated` |
| `source_reference` | 视情况 | string | AI 原创写批次号 |
| `source_exam_id` | 视情况 | string | 真题与改编题必填，指向真题登记项 |
| `adaptation_note` | 视情况 | string | 改编题必填，≥10 字 |
| `solution_methods` | 建议 | string[] | 可行解法名称与要点，≥6 字/条 |
| `common_errors` | 建议 | object[] | `error_type` + `description` |
| `estimated_minutes` | 建议 | int | 1–60 |
| `version` | 是 | string | 语义化版本 |

### `error_type` 允许值

`concept`（概念不清）、`formula_theorem`（公式定理误用）、`calculation`（计算失误）、`logic`（推理跳步）、`method_choice`（方法选择不当）、`reading`（审题偏差）、`transfer`（迁移失败）、`expression`（表述不规范）。

### 题型与字段一致性

| 题型 | `options` | `answer` 形式 |
|---|---|---|
| `single_choice` | 必填 2–8 项 | 单个大写字母 |
| `multiple_choice` | 必填 2–8 项 | 字母升序拼接，如 `AC` |
| `true_false` | 必填且恰好 2 项，`A`=正确 `B`=错误 | `A` 或 `B` |
| `fill_blank` | 禁止 | 填空内容原文 |
| `calculation` | 禁止 | 最终结果，必要时带单位 |
| `proof` | 禁止 | 证明要点或 `见解析` |

## 命题规则

1. **单一考点优先**：主考点唯一，关联标记只用来解释解题路径。
2. **干扰项必须有诊断价值**：每个错误选项都要对应一条 `common_errors` 里的错误机制，不得为凑数。
3. **答案唯一可验证**：单选正确答案唯一；多选题在题干里明确写「多选」。
4. **解析可复现**：按步骤写「为什么这一步成立」，不能只给结果。
5. **难度与层次匹配**：`difficulty` 看正确率区间，`exam_level` 看卷面位置，两者独立填写。
6. **不编造真题**：不确定来源就用 `ai_generated`，`source_reference` 写批次号。
7. **禁止重复**：同批题干不得实质重复；**只换数字的变体视为重复**，如需同型题须改变设问角度。
8. **数学表述**：遵循 `conventions.md` 第 4 节。

## 难度分布

单批 20 题的建议分布（可按考点重要性微调，但 `hard` 不要超过 10%）：

| 档 | 占比 |
|---|---|
| `basic` + `easier` | 约 40% |
| `medium` | 约 35% |
| `harder` | 约 20% |
| `hard` | 约 5% |

## 真题与改编

已确认口径：**授权不明的真题只登记元数据，不收录题干原文。**

- 要用真题：先在 `exam_sources.yaml` 里登记一条 `math_higher_exam_*`，再在题目上挂 `source_exam_id`。
- 授权不明时：只能出改编题（`adapted_exam`），题干自己写，并填 `adaptation_note`。
- 已确认的真题全文与题号，见 `knowledge/*/exam-sources.yaml`；未登记就不要凭记忆补年份和卷别。

## 质量自检清单

- [ ] 顶层只有 `questions` 一个键。
- [ ] 所有 `id` 唯一，符合 `math_higher_q_######`，且不与已有题目重号。
- [ ] 选择/判断题有 `options`，非客观题没有 `options`。
- [ ] `true_false` 恰好 2 个选项。
- [ ] 多选题 `answer` 为字母升序拼接，题干写明「多选」。
- [ ] `explanation` 与 `answer` 结论一致。
- [ ] `knowledge_tags` 全部是已存在的知识点 ID，首个是主考点。
- [ ] 每个干扰项都能在 `common_errors` 找到对应错误机制。
- [ ] 每题都有 `difficulty_basis`，写的是正确率区间而非主观判断。
- [ ] `real_exam` / `adapted_exam` 都带 `source_exam_id`，改编题带 `adaptation_note`。
- [ ] 公式合规，无裸 ASCII 公式。
- [ ] 无编造真题年份、卷别。
- [ ] 数学正确性自查过一遍：分段点、趋于无穷、无穷小阶的比较、定义域与分母。

## 示例（单选）

```yaml
questions:
  - id: math_higher_q_000001
    content: 设 $f(x)=\begin{cases} x+1, & x<0 \\ x^2, & x \ge 0 \end{cases}$，则 $\lim\limits_{x \to 0} f(x)$ 为
    question_type: single_choice
    difficulty: basic
    difficulty_basis: 只需分别求两侧极限后比较，步骤固定，预估正确率 85% 以上。
    exam_level: basic
    options:
      - key: A
        content: "$0$"
      - key: B
        content: "$1$"
      - key: C
        content: 不存在
      - key: D
        content: "$+\infty$"
    answer: C
    explanation: 左极限 $\lim\limits_{x\to 0^-} f(x)=1$，右极限 $\lim\limits_{x\to 0^+} f(x)=0$，两侧不相等，故双侧极限不存在。
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

按 `conventions.md` 第 6 节输出三行附注，并列出本批的难度分布统计（各档题数）。
