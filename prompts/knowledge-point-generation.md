# 知识点生成提示词

> 用途：交给任意 Agent，产出可直接入库的「函数与极限」章节知识点数据。
> 输出格式：YAML，字段必须通过 `schemas/knowledge-point.schema.json` 校验。

---

## 角色

你是 Morrow Agent 知识库的知识点编辑。你的产出会被另外的 Agent 直接解析、入库、用于出题与诊断，**任何格式偏差都视为失败**。

## 任务边界

- 只处理高等数学「**函数与极限**」这一章，章节 ID 固定为 `math_higher_limits`。
- 学科 ID 固定为 `math_higher`。
- 不要输出本章以外的内容；如果某个概念必须依赖其他章节，只写进 `prerequisites`，不要展开讲解。
- 不要编造教材页码、真题年份、作者、出版社。

## 输出格式

**只输出一个 YAML 文档，不要输出解释、前言、Markdown 代码围栏以外的内容。**

顶层结构：

```yaml
chapter:
  id: math_higher_limits
  name: 函数与极限
  subject_id: math_higher
  version: 1.0.0
  knowledge_points:
    - id: math_higher_limits_one_sided_limit
      name: 左右极限
      subject_id: math_higher
      chapter_id: math_higher_limits
      description: ...
      learning_objectives:
        - ...
      prerequisites: []
      related_points: []
      difficulty: medium
      exam_importance: high
      exam_levels:
        - basic
      common_errors:
        - ...
      sources:
        - type: textbook
          reference: ...
          license: unclear
      version: 1.0.0
```

## 字段说明

| 字段 | 必需 | 类型 | 约束 |
|---|---|---|---|
| `id` | 是 | string | `^math_higher_[a-z0-9_]+$`，创建后不得因改名而变化 |
| `name` | 是 | string | 1–60 字，用教材通行译名 |
| `subject_id` | 是 | string | 固定 `math_higher` |
| `chapter_id` | 是 | string | 固定 `math_higher_limits` |
| `description` | 是 | string | ≥10 字，能脱离上下文独立读懂 |
| `learning_objectives` | 建议 | string[] | 1–5 条，每条 ≥4 字，以可观察的行为开头 |
| `prerequisites` | 建议 | string[] | 仅正式课程前置关系，不得填写推断理由 |
| `related_points` | 建议 | string[] | 本章内横向关联，不得重复 `prerequisites` |
| `difficulty` | 建议 | enum | `basic` / `easier` / `medium` / `harder` / `hard` |
| `exam_importance` | 建议 | enum | `low` / `medium` / `high` / `critical` |
| `exam_levels` | 建议 | enum[] | `score_free` / `basic` / `advanced` / `challenging` |
| `common_errors` | 建议 | string[] | 描述错误机制，不写具体题目答案 |
| `sources` | 建议 | object[] | `type` + `reference`，授权不明填 `license: unclear` |
| `version` | 是 | string | 语义化版本，如 `1.0.0` |

### `difficulty` 与 `exam_levels` 的区别

- `difficulty` 描述**认知负荷**：理解该知识点本身有多难。
- `exam_levels` 描述**考试出现层次**：该知识点通常以哪类题出现。
- 二者相关但不等价，例如「极限的 ε-δ 定义」难度为 `hard`，考试层次通常只有 `advanced`。

## ID 规范

```
math_higher_limits_{snake_case}
```

- 全部小写，仅用 `[a-z0-9_]`，不得含中文、连字符、大写字母。
- 用教材通行英文术语，不要拼音。
- 示例：
  - `math_higher_limits_function_concept`
  - `math_higher_limits_one_sided_limit`
  - `math_higher_limits_limit_existence`
  - `math_higher_limits_infinitesimal`
  - `math_higher_limits_continuity_point`

## 内容要求

1. **覆盖完整但不冗余**：本章知识点以能独立出题、独立诊断为准；一个知识点只讲一件事。
2. **定义准确**：数学表述必须与主流高等数学教材一致，公式使用 LaTeX。
3. **前置关系**：`prerequisites` 必须指向本章或其他章节中已存在的知识点 ID；不得自造 ID。
4. **禁止编造**：`sources.reference` 只能写你确实能确认的教材名或通用表述，例如 `同济大学《高等数学》第七版 第一章`；无法确认时写 `待补充` 并置 `license: unclear`。
5. **不写题**：本任务只产出知识点，题目由另一个提示词负责。

## 质量自检清单

输出前逐条自查，任何一条不满足就重做：

- [ ] 顶层只有 `chapter` 一个键。
- [ ] 所有 `id` 唯一，且符合正则。
- [ ] 每个 `chapter_id` 都是 `math_higher_limits`。
- [ ] 每个 `prerequisites` / `related_points` 里的 ID 都在本次输出或已确认存在的集合中。
- [ ] 每条 `description` 脱离上下文仍可读懂。
- [ ] 所有枚举值都在允许集合内。
- [ ] 公式为 LaTeX，`$...$` 行内、`$$...$$` 独立。
- [ ] 无编造的年份、页码、作者。
- [ ] 单文件知识点数量建议 8–20 个。

## 示例（节选）

```yaml
chapter:
  id: math_higher_limits
  name: 函数与极限
  subject_id: math_higher
  version: 1.0.0
  knowledge_points:
    - id: math_higher_limits_one_sided_limit
      name: 左右极限
      subject_id: math_higher
      chapter_id: math_higher_limits
      description: 函数在一点的左极限与右极限分别描述自变量从该点左侧与右侧趋近时函数值的趋向。
      learning_objectives:
        - 能写出左极限与右极限的记号并解释其含义
        - 能用左右极限判断双侧极限是否存在
      prerequisites:
        - math_higher_limits_function_concept
      related_points:
        - math_higher_limits_limit_existence
      difficulty: medium
      exam_importance: high
      exam_levels:
        - basic
        - advanced
      common_errors:
        - 忽略分段点两侧表达式不同，直接用同一侧代入
        - 误以为左极限等于右极限只是习惯约定
      sources:
        - type: textbook
          reference: 同济大学《高等数学》第七版 第一章
          license: unclear
      version: 1.0.0
```

## 交付

1. 输出 YAML。
2. 自述「已通过质量自检清单」。
3. 若无法确认某项内容，写进 `sources` 的 `reference` 或留空数组，并在回答末尾用一行列出待人工确认项。
