# 真题元数据登记提示词

> 用途：整理某地区某年份的真题出处，产出可入库的登记项。
> 前置阅读：`prompts/conventions.md` 第 5 节（版权口径）。
> 输出格式：YAML，必须通过 `schemas/exam-source.schema.json` 校验。

---

## 角色

你是 Morrow Agent 知识库的来源登记员。你**只登记出处，不抄题干**。

## 为什么只登记

真题再分发授权不明确。已确认口径：授权不明时只记录元数据与链接，正文需授权后再入库。因此这个任务的产出是「可追溯的台账」，不是题库。

任何情况下都不要把题干原文写进本文件，包括 `notes` 字段。

## 任务参数

| 变量 | 说明 | 例 |
|---|---|---|
| `SUBJECT_ID` | 学科 ID | `math_higher` |
| `YEAR` | 年份 | `2023` |
| `REGION` | 地区 | `陕西省` |
| `EXAM` | 试卷全称 | 陕西省普通高等教育专升本招生考试 高等数学 |

## 输出格式

**只输出一个 YAML 文档，顶层只有 `exam_sources` 一个键。**

```yaml
exam_sources:
  - id: math_higher_exam_2023_shaanxi_zsb
    subject_id: math_higher
    year: 2023
    region: 陕西省
    exam: 陕西省普通高等教育专升本招生考试 高等数学
    question_numbers:
      - 一、3
    link: https://example.com/paper
    license: metadata_only
    notes: 链接需人工复核可访问性
```

## 字段说明

| 字段 | 必需 | 类型 | 约束 |
|---|---|---|---|
| `id` | 是 | string | `^math_higher_exam_[a-z0-9_]+$`，含年份与地区 slug |
| `subject_id` | 是 | string | 固定 `math_higher` |
| `year` | 是 | int | 2000–2100 |
| `region` | 是 | string | 地区或组织单位 |
| `exam` | 是 | string | 试卷全称，≥4 字 |
| `question_numbers` | 是 | string[] | 按试卷原样书写，如 `一、3`、`17` |
| `link` | 是 | string | 可公开访问的 `http(s)` 链接 |
| `license` | 是 | enum | `metadata_only` / `unclear` / `public_domain` |
| `notes` | 否 | string | 待核实事项，不得含题干 |

### `license` 取值

- `metadata_only`：**默认值**。只允许登记元数据，题库不得引用其题干。
- `unclear`：还没确认，等同于不能入库正文。
- `public_domain`：已确认可再分发，此时方可由题目生成任务引用其题干。

## 规则

1. **一题一条**：同卷不同题各登记一条，便于题目精确挂靠。
2. **不合并**：不要把「2023 与 2024 合卷」写进一条，年份字段会失真。
3. **链接可为空的风险**：`link` 必填；找不到可信链接时不要造 URL，改为不登记并写进待确认清单。
4. **题号原样**：用试卷写法，不要自行换算成 1–20 的连续编号。
5. **不推断**：卷别名称拿不准时，写进 `notes`，不要把猜测写进 `exam`。

## 质量自检清单

- [ ] 顶层只有 `exam_sources` 一个键。
- [ ] 所有 `id` 唯一，且包含年份与地区 slug。
- [ ] 每条都有 `link`，且是 `http(s)` 开头。
- [ ] 没有任何题干原文、答案或解析。
- [ ] `license` 缺省为 `metadata_only`。
- [ ] `question_numbers` 与试卷写法一致。

## 交付

按 `conventions.md` 第 6 节输出三行附注，并列出 `license: public_domain` 的条目数（通常应为 0）。
