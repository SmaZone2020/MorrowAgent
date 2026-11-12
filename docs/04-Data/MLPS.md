<div align="center">

# Morrow Learning Package Specification (MLPS) · Morrow 学习包规范

**The format, schema, versioning and distribution rules behind every `.morrow` learning package.**

[![Essential](https://img.shields.io/badge/ESSENTIAL-2f6f5e?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.
> For a task-oriented walkthrough of producing a package, read [`Package-Authoring-Guide.md`](Package-Authoring-Guide.md). This document is the specification; that one is the manual.

## Morrow 学习包格式与数据标准

**规范版本：** v1.0.0  
**状态：** Draft — 待实施  
**适用项目：** Morrow Agent / Morrow Knowledge  
**核心目标：** 建立统一、可扩展、可校验、可分发的学科内容标准。

---

# 1. 项目目标与设计原则

Morrow 使用模块化学习包管理不同学科、考试方向和教学内容。

每个学习包是一个独立的内容单元，包含知识点、题库、试卷、教学资料及相关元数据。

例如：

`应用高等数学（陕西专升本专项）.morrow`

学习包底层采用 7z 压缩格式，扩展名统一为 `.morrow`。

## 1.1 核心设计原则

1. **内容与程序解耦**：学习包不依赖 Morrow Agent 的内部实现。

2. **统一标准**：所有学科使用统一的基础数据结构。

3. **领域扩展**：允许不同学科增加自己的专属字段和内容类型。

4. **稳定标识**：知识点、题目、试卷使用稳定 ID。

5. **可追溯**：内容应尽可能保留来源、作者、版权和修改记录。

6. **可校验**：学习包安装前必须进行结构、Schema 和完整性检查。

7. **可更新**：支持学习包独立升级，不影响用户个人学习数据。

8. **AI 友好**：内容应适合 AI 检索、理解、引用和调用。

9. **本地优先**：学习包与个人学习数据均支持本地管理。

10. **向后兼容**：未来格式升级不得随意破坏已有学习包。

## 1.2 数据所有权

必须严格区分公共内容和用户个人数据。

| 数据        | 存储位置    |
| --------- | ------- |
| 知识点定义     | 学习包     |
| 题目和标准答案   | 学习包     |
| 知识点关系     | 学习包     |
| 考试大纲      | 学习包     |
| 教材、课件、真题  | 学习包     |
| 用户答题记录    | 用户本地数据库 |
| 用户错题记录    | 用户本地数据库 |
| 用户掌握度     | 用户本地数据库 |
| 用户学习计划    | 用户本地数据库 |
| Lumi 长期记忆 | 用户本地数据库 |
| 用户解题过程    | 用户本地数据库 |

学习包升级、卸载或替换时，不得自动删除用户的学习历史。

---

# 2. 文件格式规范

## 2.1 文件定义

| 属性    | 规范                   |
| ----- | -------------------- |
| 文件扩展名 | `.morrow`            |
| 底层容器  | 7z                   |
| 压缩格式  | 7z 标准格式              |
| 文件名编码 | UTF-8                |
| 元数据   | YAML                 |
| 结构化数据 | JSON / YAML          |
| 知识内容  | Markdown             |
| 原始资料  | PDF、DOCX、PPTX、图片、音频等 |
| 校验算法  | SHA-256              |

`.morrow` 本质上是一个遵循 MLPS 规范的 7z 容器。

不得仅凭扩展名判断文件合法性。必须检查实际容器格式、清单和内容。

## 2.2 文件命名

- 文件和目录优先使用英文小写。

- 单词之间使用 `-`。

- 不使用空格。

- 中文仅允许出现在用户可见名称、描述和内容正文中。

- 文件扩展名必须正确。

- 不允许依赖本机绝对路径。

- 所有包内文件引用均使用相对路径。

示例：

正确：

`knowledge/concepts/function-limit.md`

错误：

`知识点/函数极限.md`

---

# 3. 标准目录结构

一个完整的学习包采用以下结构：

```
example.morrow│├── manifest.yaml├── README.md├── CHANGELOG.md├── LICENSE├── checksums.sha256│├── schemas/│   ├── question.schema.json│   ├── knowledge.schema.json│   ├── exam.schema.json│   └── relation.schema.json│├── knowledge/│   ├── index.yaml│   ├── chapters/│   ├── concepts/│   └── relations.yaml│├── questions/│   ├── index.yaml│   ├── original/│   ├── adapted/│   ├── imported/│   └── generated/│├── solutions/│   ├── index.yaml│   └── ...│├── exams/│   ├── index.yaml│   ├── diagnostic/│   ├── practice/│   ├── mock/│   └── past-papers/│├── materials/│   ├── textbooks/│   ├── slides/│   ├── notes/│   └── references/│├── past-papers/│   ├── pdf/│   ├── word/│   └── images/│├── media/│   ├── images/│   ├── diagrams/│   ├── audio/│   └── video/│├── taxonomy/│   ├── tags.yaml│   ├── difficulty.yaml│   └── error-types.yaml│├── learning/│   ├── learning-paths.yaml│   ├── objectives.yaml│   └── mastery-criteria.yaml│├── citations/│   ├── sources.yaml│   └── attribution.md│└── indexes/    ├── keyword-index.json    └── ...
```

## 3.1 必需文件

以下文件为 MLPS v1.0 最小必需文件：

- `manifest.yaml`

- `README.md`

- `knowledge/index.yaml`

- `knowledge/relations.yaml`

- `questions/index.yaml`

- `taxonomy/tags.yaml`

- `taxonomy/error-types.yaml`

- `citations/sources.yaml`

- `checksums.sha256`

当学习包包含知识点时，必须提供对应的知识点 Markdown 文件。

当学习包包含题目时，必须提供对应的题目 JSON 文件。

## 3.2 可选目录

以下目录可以根据学科需求决定是否提供：

- schemas

- solutions

- exams

- materials

- past-papers

- media

- learning

- indexes

不要求每个学科都提供所有类型的内容。

例如英语学习包可以包含听力音频，而高等数学学习包可以包含函数图像和数学公式资源。

---

# 4. Manifest 清单规范

`manifest.yaml` 是整个学习包的入口文件。

Morrow 加载学习包时，必须优先读取 manifest，而不是遍历所有内容文件。

标准示例：

```
format:  name: morrow-learning-package  version: "1.0"package:  id: cn.morrow.calculus.shaanxi-upgrade  name: 应用高等数学（陕西专升本专项）  version: "1.0.0"  description: 面向陕西专升本考试的高等数学学习包  subject: mathematics  sub_subject: calculus  language: zh-CN  targets:    - college-entrance-upgrade  region:    - CN-SNauthor:  name: Morrow Communitycompatibility:  min_app_version: "0.1.0"contents:  knowledge:    index: knowledge/index.yaml  questions:    index: questions/index.yaml  relations:    index: knowledge/relations.yaml  taxonomy:    tags: taxonomy/tags.yaml    error_types: taxonomy/error-types.yaml  citations:    sources: citations/sources.yamldependencies: []integrity:  algorithm: sha256  file: checksums.sha256
```

## 4.1 字段约束

| 字段                  | 类型     | 约束                          |
| ------------------- | ------ | --------------------------- |
| format.name         | string | 固定为 morrow-learning-package |
| format.version      | string | MLPS 格式版本                   |
| package.id          | string | 全局唯一，创建后不得随意修改              |
| package.name        | string | 用户可见名称                      |
| package.version     | string | SemVer                      |
| package.description | string | 学习包描述                       |
| package.subject     | string | 学科分类 ID                     |
| package.sub_subject | string | 子学科 ID                      |
| package.language    | string | BCP 47 语言标识                 |
| package.targets     | string[] | 机器标签 ID，必须登记在 `taxonomy/tags.yaml` |
| package.tags        | string[] | 书架展示标签，直接写中文等可读名称，无需登记 |
| author              | object | 作者信息                        |
| compatibility       | object | 软件兼容要求                      |
| contents            | object | 内容入口                        |
| dependencies        | array  | 依赖的其他学习包                    |
| integrity           | object | 完整性校验配置                     |

## 4.2 版本规则

必须区分：

- `format.version`：学习包格式版本。

- `package.version`：学习包内容版本。

- Morrow Agent 版本：应用程序版本。

三者不得混用。

package.version 使用语义化版本：

- MAJOR：不兼容的数据内容或结构变更。

- MINOR：新增兼容内容。

- PATCH：修复错误或调整内容。

format.version 仅在格式规范发生变化时更新。

---

# 5. ID 命名规范

所有知识点、题目、章节、试卷、标签和关系必须有稳定 ID。

## 5.1 命名规则

采用：

`{domain}.{category}.{name}`

示例：

```
calculus.functioncalculus.limitcalculus.limit.one-sidedcalculus.derivativecalculus.derivative.rulescalculus.question.limit.000001calculus.question.limit.000002calculus.chapter.function-and-limit
```

要求：

1. ID 全局唯一。

2. 使用英文小写。

3. 使用点号分隔层级。

4. 不使用中文。

5. 不使用数组下标作为 ID。

6. 不得因为名称修改而改变已有 ID。

7. 删除的 ID 不得重新分配给其他内容。

8. 不同学习包之间发生 ID 冲突时必须明确处理。

---

# 6. 知识点标准

知识点使用 Markdown + YAML Front Matter。

不允许将知识点元数据和正文拆成两份重复维护。

文件示例：

`knowledge/concepts/limit.md`

```
---id: calculus.limitname: 函数的极限chapter: calculus.chapter.function-and-limitparent: calculus.function-and-limittags:  - limit  - functiondifficulty: 2prerequisites:  - calculus.function  - calculus.function.propertylearning_objectives:  - 理解函数极限的基本概念  - 掌握左右极限的计算方法  - 能够判断极限是否存在---# 函数的极限## 一、基本概念当自变量 x 无限趋近于某个值时，函数值趋近于某个确定的数。## 二、核心性质...## 三、典型例题...## 四、常见错误...
```

## 6.1 知识点必需字段

| 字段                  | 类型       | 必需  |
| ------------------- | -------- | --- |
| id                  | string   | 是   |
| name                | string   | 是   |
| chapter             | string   | 是   |
| tags                | string[] | 是   |
| difficulty          | integer  | 是   |
| learning_objectives | string[] | 是   |

其他字段可以按需增加。

## 6.2 Difficulty 规范

统一使用 1–5：

| 数值  | 含义  |
| --- | --- |
| 1   | 入门  |
| 2   | 基础  |
| 3   | 中等  |
| 4   | 较难  |
| 5   | 高难  |

难度表示知识点学习难度，不代表用户掌握度。

用户掌握度由 Morrow Runtime 单独管理。

## 6.3 知识点正文规范

建议使用以下结构：

```
# 知识点名称## 一、知识概述## 二、核心定义## 三、性质与定理## 四、公式与推导## 五、典型例题## 六、常见错误## 七、前置知识## 八、拓展内容
```

不要求所有章节必须存在，但知识点应具备清晰、可阅读的正文。

---

# 7. 知识关系标准

知识关系单独维护在：

`knowledge/relations.yaml`

示例：

```
relations:  - id: relation.limit.function    from: calculus.function    to: calculus.limit    type: prerequisite    strength: 1.0  - id: relation.limit.continuity    from: calculus.limit    to: calculus.continuity    type: prerequisite    strength: 1.0  - id: relation.limit.left-right    from: calculus.left-limit    to: calculus.right-limit    type: related    strength: 0.8
```

## 7.1 关系类型

| 类型           | 说明       |
| ------------ | -------- |
| prerequisite | 前置知识     |
| related      | 相关知识     |
| contains     | 包含关系     |
| extends      | 延伸知识     |
| contrasts    | 易混淆或对比关系 |

## 7.2 约束

- from 和 to 必须指向有效知识点。

- strength 取值 0–1。

- 不允许引用不存在的知识点。

- prerequisite 关系应避免无意义循环依赖。

- 知识关系必须能够被程序解析。

---

# 8. 题目标准

题目统一使用 JSON。

推荐按章节或知识点拆分文件，避免单个 JSON 文件过大。

示例：

`questions/original/limit.json`

```
{  "schema_version": "1.0",  "questions": [    {      "id": "calculus.question.limit.000001",      "type": "single_choice",      "content": "当 x 趋近于 0 时，sin(x)/x 的极限是多少？",      "options": [        {          "id": "A",          "content": "0"        },        {          "id": "B",          "content": "1"        },        {          "id": "C",          "content": "无穷大"        },        {          "id": "D",          "content": "不存在"        }      ],      "answer": {        "type": "single",        "value": ["B"]      },      "knowledge_points": [        "calculus.limit"      ],      "tags": [        "limit",        "basic"      ],      "difficulty": 2,      "source": {        "type": "original",        "source_id": null      },      "status": "reviewed"    }  ]}
```

## 8.1 题目类型

第一版必须支持：

- single_choice：单选题

- multiple_choice：多选题

- true_false：判断题

- fill_blank：填空题

- calculation：计算题

- proof：证明题

- short_answer：简答题

- application：应用题

- ordering：排序题

未来允许扩展新题型。

## 8.2 题目字段

| 字段               | 类型       | 必需  |
| ---------------- | -------- | --- |
| id               | string   | 是   |
| type             | string   | 是   |
| content          | string   | 是   |
| options          | array    | 依题型 |
| answer           | object   | 是   |
| knowledge_points | string[] | 是   |
| tags             | string[] | 是   |
| difficulty       | integer  | 是   |
| source           | object   | 是   |
| status           | string   | 是   |

## 8.3 数学公式

题目和解析允许使用 LaTeX。

示例：

```
计算：\[\lim_{x \to 0}\frac{\sin x}{x}\]
```

必须确保 JSON 字符串合法，反斜杠正确转义。

## 8.4 题目来源类型

统一使用：

- original：原创

- adapted：真题改编

- imported：导入题

- generated：AI 生成

不得将 AI 生成题伪装成历年真题。

## 8.5 题目审核状态

- draft：草稿

- pending：待审核

- reviewed：已审核

- deprecated：已废弃

默认只有 reviewed 题目进入正式训练和诊断题库。

AI 生成题可以在运行时使用，但必须明确标注来源与审核状态。

---

# 9. 题目解析标准

题目与解析逻辑分离。

解析存储在：

`solutions/`

每份解析通过 question_id 关联题目。

建议结构：

```
{  "question_id": "calculus.question.limit.000001",  "schema_version": "1.0",  "explanation": {    "summary": "利用重要极限直接求解。",    "steps": [      {        "index": 1,        "content": "识别重要极限形式。"      },      {        "index": 2,        "content": "代入对应极限结论。"      }    ],    "final_answer": "1"  },  "common_errors": [    "将重要极限条件误认为任意函数都成立"  ]}
```

解析可以包含：

- 解题思路

- 详细步骤

- 公式推导

- 最终答案

- 常见错误

- 其他解法

- 适用知识点

题目必须能够独立读取；没有解析文件时，题目仍然有效。

---

# 10. 标签与错误类型标准

## 10.1 标签

文件：

`taxonomy/tags.yaml`

示例：

```
tags:  - id: limit    name: 极限  - id: function    name: 函数  - id: basic    name: 基础题  - id: advanced    name: 综合题
```

标签必须使用稳定 ID。

标签名称可以修改，但 ID 不得随意改变。

## 10.2 错误类型

文件：

`taxonomy/error-types.yaml`

示例：

```
error_types:  - id: conceptual_misunderstanding    name: 概念理解错误  - id: formula_misuse    name: 公式使用错误  - id: calculation_error    name: 计算错误  - id: logical_error    name: 逻辑推理错误  - id: prerequisite_gap    name: 前置知识缺失  - id: problem_interpretation    name: 题意理解错误  - id: method_selection_error    name: 解题方法选择错误  - id: careless_error    name: 粗心错误
```

跨学科通用错误类型由 Morrow 基础规范维护。

学习包可以增加学科专属错误类型，但不得擅自修改公共错误类型的语义。

---

# 11. 考试与测评标准

考试文件统一存放在 `exams/`。

支持：

- diagnostic：诊断测评

- practice：专项练习

- mock：模拟考试

- past-papers：历年真题试卷

示例：

```
id: calculus.exam.initial-diagnosticname: 高等数学基础诊断type: diagnosticduration: 30question_count: 15question_selection:  mode: blueprint  coverage:    - knowledge_id: calculus.function      target_count: 3    - knowledge_id: calculus.limit      target_count: 4    - knowledge_id: calculus.continuity      target_count: 3    - knowledge_id: calculus.infinitesimal      target_count: 5difficulty:  easy: 0.3  medium: 0.5  hard: 0.2
```

考试配置可以引用固定题目，也可以定义动态组卷规则。

动态组卷时必须确保题目符合知识点、难度、来源和审核状态要求。

不得仅根据随机抽题决定诊断覆盖范围。

---

# 12. 学习目标与掌握标准

文件：

`learning/objectives.yaml`

`learning/mastery-criteria.yaml`

学习包可以定义知识点学习目标及建议掌握标准。

示例：

```
knowledge_id: calculus.limitmastery_criteria:  - id: understand_definition    description: 能理解函数极限的基本概念  - id: calculate_basic    description: 能独立完成基础极限计算  - id: solve_complex    description: 能解决综合型极限问题  - id: knowledge_transfer    description: 能够将知识迁移到变式题
```

注意：

学习包只提供建议标准。

用户实际掌握度、掌握置信度、历史表现由 Morrow Runtime 计算和维护。

不得把学习包中的静态掌握标准直接视为用户已经掌握的事实。

---

# 13. 原始资料与媒体资源

支持以下文件：

| 类型  | 格式                    |
| --- | --------------------- |
| 文档  | PDF、DOCX、DOC、TXT、MD   |
| 课件  | PPTX、PPT、PDF          |
| 图片  | PNG、JPG、JPEG、WEBP、SVG |
| 音频  | MP3、WAV、M4A、OGG       |
| 视频  | MP4、WEBM              |

所有资源使用相对路径引用。

例如：

```
![函数图像](../../media/diagrams/function-limit.svg)
```

原始真题与结构化试卷必须区分：

- `past-papers/`：保存原始 PDF、Word、图片。

- `exams/past-papers/`：保存可被 Morrow 直接加载的结构化试卷。

不得将原始 PDF 直接视为已经完成结构化识别的试卷。

---

# 14. 来源与版权标准

文件：

`citations/sources.yaml`

示例：

```
sources:  - id: source.example.001    title: 某年度高等数学考试试卷    type: exam    year: 2025    author: null    publisher: null    url: null    license: unknown    attribution: 试卷来源说明
```

每份外部资料和导入题目应尽可能关联来源 ID。

必须区分：

- original：原创内容

- public_domain：公有领域内容

- open_license：开放授权内容

- licensed：已获得授权

- local_only：用户自持、仅限本机使用的资料。原文可以进入本地学习包，但该学习包不得公开分发。

- permission_required：需要授权

- unknown：授权情况未知

禁止默认将未知授权的教材、课件、真题扫描件公开分发。

对于没有公开分发权限的资料，应允许用户本地导入，但不能将其自动纳入公开学习包。

`local_only` 与 `unknown` 的区别在于用户是否持有可用副本：前者是「我有这份材料，自己要读」，后者是「我不知道能不能用」。只有 `local_only` 可以承载题目原文（`source.type` 为 `imported`），校验器会为此给出「不得公开分发」的警告。


---

# 15. 完整性与安全规范

学习包必须提供：

`checksums.sha256`

示例：

```
<sha256>  manifest.yaml<sha256>  README.md<sha256>  knowledge/index.yaml<sha256>  questions/index.yaml
```

校验文件记录除自身外所有需要校验的文件。

## 15.1 安装前检查

Morrow 必须完成：

1. 检查文件实际是否为合法 7z 容器。

2. 检查 manifest 是否存在。

3. 检查格式名称与版本。

4. 检查必需文件是否存在。

5. 检查 YAML / JSON 是否能够解析。

6. 检查数据是否符合 Schema。

7. 检查所有 ID 是否唯一。

8. 检查知识点引用是否有效。

9. 检查题目引用的标签是否有效。

10. 检查文件引用路径是否存在。

11. 检查 SHA-256。

12. 检查兼容性。

13. 检查解压大小、文件数量和异常压缩比。

14. 拒绝路径穿越、绝对路径和非法符号链接。

15. 检查是否包含不允许执行的可执行文件或脚本。

必须防止 Zip Slip / 路径穿越类问题。

学习包中的 Markdown、YAML、JSON、SVG 和其他资源均视为不可信输入。

不得直接执行学习包内的脚本或自动加载未经验证的可执行内容。

## 15.2 安装失败处理

安装必须采用事务式流程：

- 先验证。

- 再解压到临时目录。

- 再建立索引。

- 最后提交安装状态。

任何步骤失败，都不得留下一个显示为已安装但内容不完整的学习包。

---

# 16. 版本更新与依赖管理

每个学习包拥有独立版本。

Morrow 必须支持：

- 安装

- 卸载

- 更新

- 版本查询

- 完整性校验

- 依赖检查

更新学习包时：

1. 检查 package.id 是否相同。

2. 比较版本。

3. 检查格式兼容性。

4. 检查内容 ID 变化。

5. 更新学习包数据。

6. 保留用户个人学习数据。

7. 对已经删除或废弃的知识点保留迁移映射或废弃标记。

8. 重新生成受影响的索引。

依赖关系必须显式声明，不允许在运行时静默下载未知依赖。

---

# 17. 索引与 AI 检索规范

学习包可以包含 `indexes/` 目录。

索引属于可重建数据，不是内容的唯一来源。

Morrow Runtime 必须支持从原始内容重新生成索引。

AI 不得在每次对话时将整个学习包全部加载到上下文。

推荐检索流程：

```
用户问题   ↓识别学科与学习上下文   ↓检索相关知识点   ↓检索关联题目   ↓检索解析和教学资料   ↓组装有限上下文   ↓交给 Lumi   ↓生成教学或诊断结果
```

检索结果应保留来源信息：

- package_id

- package_version

- content_id

- file_path

- content_type

Lumi 在引用学习包内容时，应能够追溯到具体知识点、题目或资料。

---

# 18. Morrow Runtime 接口建议

学习包格式必须与程序内部业务逻辑解耦。

建议实现统一的 Learning Package Provider 接口。

至少提供：

```
GetPackageManifest(packageId)ListKnowledgePoints(packageId)GetKnowledgePoint(packageId, knowledgeId)GetKnowledgeRelations(packageId, knowledgeId)SearchQuestions(packageId, filters)GetQuestion(packageId, questionId)GetSolution(packageId, questionId)ListExams(packageId)GetExam(packageId, examId)GetMaterial(packageId, resourcePath)ValidatePackage(packageFile)InstallPackage(packageFile)UpdatePackage(packageFile)UninstallPackage(packageId)
```

以上是逻辑接口，不要求必须使用特定编程语言或类名。

所有读取操作必须基于已验证的学习包。

不要让 AI 直接访问压缩包内部文件系统。

---

# 19. 团队协作与内容生产规范

所有内容贡献者必须遵循统一的数据标准。

建议分工：

- 知识点维护者：负责章节、知识点、知识关系。

- 题库维护者：负责题目、答案、解析、标签。

- 资料维护者：负责真题、课件、来源和版权信息。

- 数据负责人：负责 Schema 校验、去重、版本发布。

提交内容时必须检查：

- ID 是否重复。

- 知识点是否已经存在。

- 题目是否关联正确知识点。

- 题目答案是否正确。

- 解析是否完整。

- 标签是否有效。

- 来源是否清晰。

- 文件路径是否正确。

- JSON / YAML 是否合法。

禁止多人各自设计一套不同字段结构。

所有内容必须先符合 MLPS，再进入正式学习包。

---

# 20. MLPS v1.0 验收标准

实现完成必须满足以下条件：

## 格式与结构

- 能创建合法 `.morrow` 文件。

- 能读取并解析 7z 容器。

- 能解析 manifest.yaml。

- 能检查必需文件。

- 能正确识别学习包格式版本。

- 能读取 Markdown 知识点。

- 能读取 JSON 题库。

- 能读取 YAML 知识关系。

## 数据校验

- 能验证 JSON Schema。

- 能验证知识点 ID 唯一性。

- 能验证题目 ID 唯一性。

- 能验证知识点引用。

- 能验证标签引用。

- 能验证文件路径。

- 能验证 SHA-256。

- 能输出可读的校验错误报告。

## 生命周期

- 能安装学习包。

- 能卸载学习包。

- 能查询已安装学习包。

- 能更新学习包。

- 更新后保留用户个人学习数据。

- 能处理不兼容版本。

## 安全性

- 拒绝路径穿越。

- 限制解压文件数量与总大小。

- 拒绝不合法容器。

- 不执行学习包内的脚本。

- 安装失败时能够回滚。

## AI 集成

- Lumi 能根据知识点 ID 获取知识内容。

- Lumi 能根据知识点检索关联题目。

- Lumi 能获取题目解析。

- Lumi 能获取知识点依赖关系。

- 检索结果保留内容来源。

- 不需要将整个学习包加载进 AI 上下文。

---

# 21. 给开发 Agent 的实施要求

请基于本规范实施 Morrow Learning Package System。

实施时遵循以下要求：

1. 先检查现有项目结构和技术栈。

2. 检查是否已有知识点、题库、数据模型和本地数据库实现。

3. 不要重复创建已有功能。

4. 不要为了实现学习包而破坏现有用户数据结构。

5. 不要擅自修改本规范中的字段语义。

6. 如果现有系统与规范冲突，先列出冲突和迁移方案。

7. 所有核心数据结构必须有 Schema 和自动化测试。

8. 文件解析、数据校验、安装、更新必须分层实现。

9. 学习包解析不得与 UI 强耦合。

10. 不要在第一阶段实现远超 MVP 所需的复杂功能。

## 推荐实施顺序

**Phase 1：规范与数据模型**

- 建立 MLPS v1.0 规范文件。

- 建立 manifest Schema。

- 建立 knowledge Schema。

- 建立 question Schema。

- 建立 relation Schema。

- 建立示例学习包。

**Phase 2：解析与校验**

- 7z 读取。

- Manifest 解析。

- Markdown Front Matter 解析。

- JSON / YAML 校验。

- ID 和引用校验。

- SHA-256 校验。

- 安全检查。

**Phase 3：学习包管理**

- 安装。

- 卸载。

- 更新。

- 版本兼容。

- 本地学习包列表。

**Phase 4：AI 集成**

- 知识点检索。

- 题目检索。

- 解析读取。

- 知识关系读取。

- Lumi 工具接口。

**Phase 5：示例数据**

使用陕西专升本高等数学创建第一个正式学习包：

`应用高等数学（陕西专升本专项）.morrow`

覆盖函数与极限、连续性、导数与微分等首批知识内容，并准备题目、解析、知识关系和基础诊断配置。

## 最终交付物

开发完成后必须提交：

1. MLPS v1.0 规范文档。

2. 全部 Schema 文件。

3. 学习包解析模块。

4. 学习包校验模块。

5. 学习包安装与更新模块。

6. Learning Package Provider 接口。

7. 自动化测试。

8. 一个可成功安装的示例 `.morrow` 文件。

9. 开发文档和使用说明。

10. 与现有用户学习数据的兼容性说明。

**重要：先完成 Phase 1 和 Phase 2，再进入 Phase 3。不要一开始就同时开发所有功能。**

最终目标是让任何符合 MLPS 规范的学习包，都能够被 Morrow Agent 正确识别、校验、安装、检索和使用，而不依赖具体学科或内容生产者。
