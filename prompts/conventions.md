# 知识库生产公共约定

> 适用于 `prompts/` 下的全部生成任务。任何提示词与本文冲突，以本文为准。
> 输出格式以 `schemas/` 下的 JSON Schema 为准，本文解释「为什么」和「怎么判」。

---

## 1. 输出纪律

- 只输出一个 YAML 文档，不加解释、前后记、代码围栏以外的内容。
- 顶层键只能有一个：`chapter`、`questions` 或 `exam_sources` 三选一。
- 字段名一律 snake_case；枚举值一律小写英文；不得自造字段。
- 同一批输出内的 `id` 必须唯一，且不得与该批之外已存在的 ID 冲突。
- 数值不要加引号除非 Schema 要求字符串；LaTeX 内容一律用双引号包裹。

## 2. ID 规范

| 对象 | 格式 | 例 |
|---|---|---|
| 学科 | `math_higher` | `math_higher` |
| 章节 | `math_higher_{章节 slug}` | `math_higher_limits` |
| 知识点 | `math_higher_{章节 slug}_{snake_case}` | `math_higher_limits_one_sided_limit` |
| 题目 | `math_higher_q_{6 位数字}` | `math_higher_q_000001` |
| 真题登记 | `math_higher_exam_{年份}_{地区}_{卷别 slug}` | `math_higher_exam_2023_shaanxi_zsb` |
| 真题登记（按题） | `math_higher_exam_{年份}_{地区}_{卷别 slug}_q{两位题号}` | `math_higher_exam_2023_shaanxi_zsb_q07` |

- 只用 `[a-z0-9_]`，不得含中文、连字符、大写字母。
- 用教材通行的英文术语，不用拼音（地区名除外）。
- **ID 一旦发布不得修改**：改名只改 `name`，`id` 保持不变。

## 3. 难度标尺

难度有两把尺子，含义不同，不可混用。

### 3.1 题目难度 `difficulty`（按目标人群正确率区间标定）

目标人群 = 陕西专升本高等数学考生。按半开区间取档：

| 枚举 | 中文 | 目标人群正确率 |
|---|---|---|
| `basic` | 送分 | `[85%, 100%]` |
| `easier` | 较易 | `[70%, 85%)` |
| `medium` | 中等 | `[55%, 70%)` |
| `harder` | 较难 | `[40%, 55%)` |
| `hard` | 高难 | `[0%, 40%)` |

- 必须同时写 `difficulty_basis`，说明该题落在这一档的理由，例如「需先判定左右极限存在，再做参数匹配，预估正确率 55%–70%」。
- 没有真实统计数据时，按「解题步骤数 × 是否需要跨知识点联用 × 陷阱数量」估一个区间并写明。不要写「感觉较难」。
- 题库回收真实作答数据后，按实际正确率回调该档，并在 `version` 上体现。

### 3.2 知识点难度 `difficulty`（按认知负荷）

知识点本身不是被「作答」的对象，正确率区间不适用。改为按**先修的抽象层次**判定，并必须写 `difficulty_basis`：

| 枚举 | 判定 |
|---|---|
| `basic` | 只需定义与直接套用，不依赖其他知识点 |
| `easier` | 依赖 1 个基础知识点，运算为单步 |
| `medium` | 依赖 1–2 个知识点，需要一次转化或构造 |
| `harder` | 依赖 2 个以上知识点，需要选择方法 |
| `hard` | 依赖形式化定义（如 ε-δ）或需要证明 |

### 3.3 考试层次 `exam_level` / `exam_levels`

描述该内容在考卷中的位置与分值量级，与难度正交：

| 枚举 | 含义 |
|---|---|
| `score_free` | 送分题位置，单选题前几题 |
| `basic` | 基础题，单选/填空主体 |
| `advanced` | 进阶题，计算题主体 |
| `challenging` | 压轴或证明题 |

## 4. 配图 `images[]`

公式、函数图像、真题截图都可以用 `images` 表达，不再依赖 Markdown 图片语法。

```yaml
images:
  - type: formula          # formula / figure / screenshot / other
    kind: latex            # 可选，缺省按内容推断
    content: "\\int_0^1 x^2\\,dx = \\frac{1}{3}"
    position: explanation  # 可选，缺省 stem
    caption: 定积分计算
```

| 字段 | 必需 | 说明 |
|---|---|---|
| `type` | 是 | `formula` / `figure` / `screenshot` / `other` |
| `kind` | 否 | `latex` / `svg` / `data_uri` / `url` / `path` |
| `content` | 是 | 按 `kind` 解释的内容本体，不加任何包装前缀 |
| `position` | 否 | `stem` / `explanation` / `option:KEY`，缺省 `stem` |
| `caption` | 否 | 图注，会作为正文渲染 |
| `alt` | 否 | 替代文本，加载失败时显示 |
| `width` | 否 | 建议显示宽度（像素） |

`kind` 的判定顺序（不写时）：

1. `type: formula` → `latex`
2. 内容以 `<svg` 或 `<?xml` 开头 → `svg`
3. 以 `data:` 开头 → `data_uri`
4. 以 `http(s)://` 开头 → `url`
5. 其余 → `path`（知识包内相对路径）

规则：

- **能用 LaTeX 就别用图**：`kind: latex` 由 KaTeX 实时排版，可选中、可搜索、缩放不糊，只在排版复杂或来自真题时才用 `screenshot`。
- `kind: data_uri` 的 `content` 可以只写 base64 载荷，MIME 会自动补；写完整 `data:image/png;base64,...` 也可以。
- `position` 指向不存在的选项会被校验脚本拒绝，不要凭猜测写。
- 一张图只表达一件事；多行公式请拆成多条 `images`，或直接用 `latex` 的多行环境。
- 不得把题干文字塞进 `images`，正文仍要写完整，图片只是补充。

## 5. 数学表述规范

- 行内公式 `$...$`，独立公式 `$$...$$`；不得使用裸 ASCII 公式或 `\(...\)`。
- 极限统一写 `\lim\limits_{x \to a}`；单侧极限 `\lim\limits_{x \to a^-}`、`\lim\limits_{x \to a^+}`。
- 分段函数用 `\begin{cases} ... \end{cases}`。
- 分数用 `\frac`，不使用 `/` 表示分式。
- 无穷小比较用 `\sim`、`o(\cdot)`，不要用文字「等价于」混写。
- 中文与公式之间保留一个空格，公式内不加中文。
- 结果含单位或取值集合时写清，如 `$a=-1$`、`$x \in (0,1)$`。

## 6. 来源与版权

已确认口径：**授权不明的真题只登记元数据与链接，不收录题干原文。**

- `real_exam`：题干来自可再分发的试卷才允许入库，且必须填 `source_exam_id`；登记项 `license` 非 `public_domain` 时校验脚本拒绝。
- `adapted_exam`：自写题干、保留考点，必须填 `source_exam_id` 与 `adaptation_note`（改了什么、为什么）。题干自写，不受登记项 `license` 限制，只需登记项存在。
- `ai_generated`：原创命题，`source_reference` 写批次号，不得填 `source_exam_id`。
- 禁止编造年份、卷别、页码、作者、出版社。无法确认就降级为 `ai_generated` 或写进待确认清单。
- 教材引用只写能确认的通行表述，如 `同济大学《高等数学》第七版 第一章`。

## 7. 落盘目录

知识库源文件全部平铺在 `data/yaml/`，不建子目录；构建产物在 `data/json/knowledge.json`，由 `pnpm build:knowledge` 生成，不手改。

| 输出 | 文件名 |
|---|---|
| 知识点 | `{学科}_{章节}_knowledge-points.yaml` |
| 题目 | `{学科}_{章节}_questions.yaml` |
| 真题登记 | `{学科}_exam_{年份}_{地区}_{卷别}.yaml`，一份卷一个文件 |

- 平铺后文件名全局唯一，**不得省略章节段**，否则会覆盖其他章节的同名文件。
- 一份卷一个文件；真题登记按题粒度，一个文件内含该卷全部题目的登记项。
- 新增学科或章节时按同规则起名，不另开子目录。

## 8. 交付格式

每次输出后附三行：

1. `自检：已通过质量自检清单`（不通过就不要输出数据）。
2. `待人工确认：<条目或「无」>`。
3. `建议落盘路径：<相对路径>`。
