# 知识点生成提示词

> 用途：交给任意 Agent，产出一章可直接入库的知识点数据。
> 前置阅读：`prompts/conventions.md`（ID、难度标尺、数学表述、版权口径）。
> 输出格式：YAML，必须通过 `schemas/knowledge-point.schema.json` 校验。

---

## 角色

你是 Morrow Agent 知识库的知识点编辑。产出会被其他 Agent 直接解析、入库、用于出题与诊断，**任何格式偏差都视为失败**。

## 任务参数

开工前先确认这三个变量，缺任意一个就停下来问，不要猜：

| 变量 | 说明 | 例 |
|---|---|---|
| `SUBJECT_ID` | 学科 ID | `math_higher` |
| `CHAPTER_ID` | 章节 ID | `math_higher_limits` |
| `CHAPTER_NAME` | 章节中文名 | 函数与极限 |

本章对应的教材范围也需明确（如「第一章 第 1–6 节」），避免知识点跑到下一章。

## 任务边界

- 只产出 `CHAPTER_ID` 这一章的知识点。
- 一个知识点只讲一件事，以「能独立出题、能独立诊断」为拆分粒度。
- 必须依赖其他章节时，只把 ID 写进 `prerequisites`，不展开讲解。
- 不写题。题目由 `prompts/question-generation.md` 负责。
- 不编造教材页码、真题年份、作者、出版社。

## 输出格式

**只输出一个 YAML 文档，顶层只有 `chapter` 一个键。**

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
      difficulty_basis: ...
```

## 字段说明

| 字段 | 必需 | 类型 | 约束 |
|---|---|---|---|
| `id` | 是 | string | `^math_higher_[a-z0-9_]+$`，发布后不得修改 |
| `name` | 是 | string | 1–60 字，用教材通行译名 |
| `subject_id` | 是 | string | 等于 `SUBJECT_ID` |
| `chapter_id` | 是 | string | 等于 `CHAPTER_ID`，且与 `chapter.id` 一致 |
| `description` | 是 | string | ≥10 字，脱离上下文可独立读懂 |
| `difficulty_basis` | 是 | string | 认知负荷判定理由，见 `conventions.md` 3.2 |
| `learning_objectives` | 建议 | string[] | 1–5 条，每条 ≥4 字，以可观察行为开头 |
| `prerequisites` | 建议 | string[] | 仅正式课程前置关系，不得填写推断理由 |
| `related_points` | 建议 | string[] | 同章横向关联，不得与 `prerequisites` 重复 |
| `difficulty` | 建议 | enum | `basic` / `easier` / `medium` / `harder` / `hard` |
| `exam_importance` | 建议 | enum | `low` / `medium` / `high` / `critical` |
| `exam_levels` | 建议 | enum[] | `score_free` / `basic` / `advanced` / `challenging` |
| `common_errors` | 建议 | string[] | 描述错误机制，不写具体题目答案 |
| `images` | 建议 | object[] | 定义示图或典型图形，写法见 `conventions.md` 第 4 节 |
| `sources` | 建议 | object[] | `type` + `reference`，授权不明填 `license: unclear` |
| `version` | 是 | string | 语义化版本，如 `1.0.0` |

### `description` 写法

合格：一句话说清「它是什么 + 为什么需要它」。

> 函数在一点的左极限与右极限分别描述自变量从该点左侧与右侧趋近时函数值的趋向。

不合格：只写名称复述、只写用途、或依赖「上面那个」等上下文指代。

### `common_errors` 写法

写**错误机制**，让诊断能对上号，不写答案：

- 好：`忽略分段点两侧表达式不同，直接用同一侧代入`
- 差：`选 C` / `本题容易算错`

### 前置关系

- `prerequisites` 必须指向本章或已确认存在的知识点 ID，不得自造。
- 三条硬规则：**不得自环**、**不得成环**、**不得把「相关」写成「前置」**。
- 一个知识点前置超过 3 个时，通常是拆得不够细，回头再拆。

## 章节骨架（空壳）

当某章只立结构、暂不出题时，仍然输出完整合法的知识点文档，只是不配套 `questions.yaml`：

- 每个知识点仍需写全 `description`、`difficulty_basis`、`learning_objectives`。
- `version` 从 `0.1.0` 起步，表示「结构已定、内容待补」，补完题后升到 `1.0.0`。
- 交付时明确说明「本章为骨架，无配套题目」，避免被误当成可训练内容。

## 质量自检清单

输出前逐条自查，任何一条不满足就重做：

- [ ] 顶层只有 `chapter` 一个键，且 `chapter.id` 等于 `CHAPTER_ID`。
- [ ] 所有 `id` 唯一、符合正则、且都以 `CHAPTER_ID_` 为前缀。
- [ ] 每个知识点的 `chapter_id` 与 `chapter.id` 一致。
- [ ] `prerequisites` / `related_points` 中的 ID 都在本次输出或已确认集合中，且无环。
- [ ] 每条 `description` 脱离上下文可读懂。
- [ ] 每个知识点都有 `difficulty_basis`，且不是主观形容词。
- [ ] 有配图时，`images[].kind` 与 `content` 匹配，能写成 LaTeX 的没有退化成图片。
- [ ] 所有枚举值都在允许集合内。
- [ ] 公式合规，无裸 ASCII 公式。
- [ ] 无编造的年份、页码、作者。
- [ ] 单章知识点 8–25 个；少于 8 说明拆得不够，多于 25 考虑拆章。

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
      difficulty_basis: 依赖函数概念，需要区分两侧表达式并做一次比较，属单步转化。
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

按 `conventions.md` 第 6 节输出三行附注，并额外说明 `difficulty_basis` 所用的判定口径。
若本章为骨架，附注中写明「无配套题目」。
