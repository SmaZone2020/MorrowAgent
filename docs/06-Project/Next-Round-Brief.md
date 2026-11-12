<div align="center">

# Next-Round Brief · 下一轮实现任务书

**A hand-off summary written so a new session can continue without replaying the previous conversation.**

[![Reference](https://img.shields.io/badge/REFERENCE-6b7280?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.

> 用途：新会话直接照这份文档继续做，不需要回看上一轮对话。
> 生成时间：2026-11-12，基线提交 `d388b5d`（附件上传换 BeUI `AttachmentUpload` 之后）。

---

## 0. 一句话

Morrow Agent 的**学习闭环主干已经跑通**（书架 → 学习包安装 → 工作区 → Lumi 对话/工具 → 知识库 → 诊断 → 专项训练 + 画板 → 错题本 → 知识画像 → 仪表盘 → 设置）。
本轮要把「有内容、有记录、有讲解」升级成「有目标、有诊断深度、有教学记忆」，补齐 PRD/信息架构里已定案但代码零实现的模块。

**方向已确认，全部要做**（语音除外，明确砍掉）。

---

## 1. 硬约束（违反即返工）

| 项 | 要求 |
|---|---|
| UI 组件 | 只能用 BeUI（`src/vendor/beui/`）+ TailwindCSS + Gravity Icons。**禁止自绘可交互控件**，模态框一律 `@/components/Modal`（内部是 BeUI）。图表这类纯展示 SVG 可以手写，但不得再造按钮/下拉/选择器。 |
| 组件库样式 | 除配色外不改 BeUI 源码。`scripts/beuiPatches.mjs` 只放必要的颜色补丁。 |
| 字体 | 标题 `.Siyuan`（思源宋体）；正文跟随用户设置。 |
| 字号 | 调用处不得出现 `text-xs`；按钮不得用 `size="xs"`，最小 `sm`（`sm` 内部是 `text-xs h-8`，调用处需补 `className="text-sm"`）。 |
| 文案结构 | 不写「标题 + 副标题」。解释一律走 `@/components/InfoHint`。纯装饰文案删掉。`SettingsRow` 的 `description` 属于禁止的副标题。 |
| 空状态 | 一律 `@/components/EmptyState`，必须带 Lumi 形象（`mood` + `surface`）。 |
| 圆角容器 | 尽量用 `@/components/SquircleWrapper`。 |
| 状态持久化 | 界面状态一律 `usePersistedState` + `workspaceScope/appScope/shelfScope`（`src/features/uiState/scope.ts`）。不要另开 localStorage key。 |
| 文件名 | 含 JSX 必须 `.tsx`；单文件 ≤ 350 行。 |
| 命名 | TS/JS 代码 camelCase。Rust 结构体字段 PascalCase + `#[serde(rename = "camelCase")]`。 |
| 注释 | 只在「为什么这么做」的地方写，用英文，简短。不写「这段代码做了什么」。 |
| 提交 | 每完成一个小模块立即 commit。**不加 co-author**。格式 `(feat|fix|chore|docs|test)主题`，主题用英文小写短句。 |
| 数据迁移 | `src-tauri/src/store/migrations.rs` 的 `MIGRATIONS` 数组**只准 append**，绝不修改已发布的条目（索引 + 1 = 目标版本号，当前到 4）。 |
| 工作区隔离 | 任何新数据必须带 `workspace_id`，两个学习包不得互相看见（MLPS §1.2）。 |
| CJK 文件 | **不要用 PowerShell 写含中文的文件**（`Set-Content -Encoding utf8` 会写坏）。一律用编辑工具的 write/edit。控制台 mojibake 只是显示问题，不改文件。 |

---

## 2. 现状盘点（已实现，勿重做）

- 目录：`src/pages/`（书架、仪表盘、Lumi、知识库、诊断、训练、错题本、画像、设置 6 页）
- 对话引擎：三协议（OpenAI Chat / OpenAI Responses / Anthropic）、SSE、DPAPI 存 key、多会话、附件（图片/PDF/纯文本）、流式、工具调用回合（`MAX_TOOL_ROUNDS = 4`）
- 工具：`ask_questions`、`search_knowledge`、`get_mastery`、`read_question`、`list_wrong_questions`
- 富内容：Markdown + KaTeX、`plot`、`mindmap`、`svg`、`html`（122 class 白名单 + sanitize）、`image`、围栏代码块
- 数据：SQLite（conversations / messages / answer_attempts / workspaces），`ui-state.json`，`preferences.json`，`packages/`
- 算法：`masteryOf`（Laplace 平滑）、`levelOf`、`weakestFirst`、`coverageOf`、诊断组卷 `blueprint.ts`
- 内容：学习包 `cn.morrow.calculus.shaanxi-upgrade` v2.0.0，85 个知识点 / 13 章 / **33 题（仅覆盖 12 个点）** / 33 份解析 / 160 张图

---

## 3. 工作包总览

| 编号 | 模块 | 补掉的依据 | 规模 |
|---|---|---|---|
| W0 | 题库扩充到 85 点全覆盖 | 内容基线 | 大（内容） |
| W1 | 学习目标 + 学习计划 + 学习报告 + 趋势 | PRD 4.1/4.6/4.8、D-018、Work-Plan P-01/D-04 | 大 |
| W2 | 错误类型 + 证据状态（observed/hypothesized/verified/user_corrected） | Diagnostic-Strategy §2、Agent-Behavior §5 | 中 |
| W3 | 提示词注册表 + `read_point` 工具 + 学习者上下文注入 | `prompt.ts` 自述、PRD 4.5 | 中 |
| W4 | 作答与笔迹回传 Lumi | T-04/T-05、Interactive-Components §9 | 中 |
| W5 | 错题本筛选 / 编辑标签 / 错误分析入口 | PRD 4.7、T-07 | 小 |
| W6 | 结构化配图与「常见错误」链路修复（Rust 解析丢字段） | `*-schema.json` 已支持 | 小 |
| W7 | 模拟考试（简化版） | PRD 4.9、D-021 | 大 |
| W8 | 学习包版本策略 + 个人数据备份/恢复 | PRD 4.10 / 4.12、§5 | 中 |
| W9 | 首次引导流程 | PRD 4.3 | 中 |
| W10 | 章节雷达 + 知识关联可视化 | D-018、PRD 4.1 | 中 |
| — | 语音输入/回复 | PRD 4.11 | **不做** |

推荐顺序：**W6 → W1 → W2 → W3 → W4 → W5 → W10 → W7 → W8 → W9**，W0 与其余并行。
理由：W6 修的是「数据被丢掉」的硬伤，改动小但影响所有后续；W1/W2 是仪表盘与诊断的地基；W3/W4 让 Lumi 从「会出题」变成「懂学生」；W7/W8/W9 是演示完整度。

---

## 4. 各工作包详细说明

### W0 题库扩充（内容，不动代码）

- 现状：33 题覆盖 12/85 点。第 2 章之后全部「未测」，导致诊断卷只能覆盖 12 个点、画像大面积空白。
- 目标：每点 ≥ 2 题（至少 1 选择/判断 + 1 计算/填空），合计 ~170 题，每題配解析。
- 工具链已就绪：`prompts/question-generation.md`、`schemas/question.schema.json`、`scripts/mlps/validatePackage.mjs`、`scripts/mlps/checks/questions.mjs`。
- 输出：`packages/<pkg>/questions/generated/chNN.json` + `solutions/chNN.json` + 更新 `questions/index.yaml`、`solutions/index.yaml`。
- 改完必须重算 `checksums.sha256`（`scripts/writeChecksums.mjs`）并重新打包（`scripts/mlps/pack.mjs`）。
- **别用 PowerShell 生成 JSON**（中文会坏）。用 Node 脚本或编辑工具。
- 真题来源先登记 `citations/sources.yaml`，`license` 不为 `public_domain` 的只能改编、不能抄题干（D-054 / D-083）。

### W1 学习目标 + 学习计划 + 学习报告 + 趋势

**数据层（migration 5）**

```sql
CREATE TABLE IF NOT EXISTS study_goals (
    workspace_id    TEXT PRIMARY KEY,
    target_score    INTEGER,            -- 0-150，NULL = 未设
    exam_date       TEXT,               -- 'YYYY-MM-DD'，NULL = 未设
    minutes_per_day INTEGER,            -- 15/30/60/90
    difficulty_focus TEXT NOT NULL DEFAULT '[]', -- JSON: ["basic","advanced"]
    note            TEXT NOT NULL DEFAULT '',
    updated_at      INTEGER NOT NULL
);
```

**后端命令**（`src-tauri/src/store/goals.rs` + `lib.rs` 注册）
- `goal_load(workspace_id) -> Option<StudyGoal>`
- `goal_save(workspace_id, goal) -> ()`
- `attempt_trend(workspace_id, days) -> Vec<TrendPoint>`，`TrendPoint { date: "YYYY-MM-DD", attempts: u32, correct: u32 }`，按 `created_at` 分日聚合（本地时区）。

**前端**
- 新导航项，加在 `src/app/navigation.ts` 的「学习区」组：`学习计划`（`/plan`，icon `Target` 已被诊断占用 → 用 `Calendar`/`ListCheck`）、`学习报告`（`/report`，icon `ChartLine` 已被画像占用 → 用 `ChartColumn`/`TrendUp`，先 `Get-ChildItem node_modules/@gravity-ui/icons` 确认存在）。
  - 注意：侧边栏已经有 7 项，加 2 项要确认收缩态与分组标题不溢出。
- `/plan`（单页，内部两段）：
  1. 「目标」：BeUI `Input`（目标分数）、日期（`Input type="date"` 或 BeUI 有无日期组件，先查 `src/vendor/beui/components/motion/`）、时长用 `ChoiceTabs`（复用 `SettingsBlocks.tsx` 里的）→ 存 `study_goals`。
  2. 「计划」：**纯计算，不落库**。`src/features/plan/plan.ts`，输入 = 目标 + 掌握度 + 剩余天数，输出 = 今日任务列表（3–5 条，指向 `?point=` 的训练链接）+ 进度（本周已完成题数/目标题数）。配 `plan.test.ts`。
  - 剩余天数 < 0 或未设日期时，计划退化为「按薄弱点排序的今日清单」，不要报错。
- `/report`：
  - 趋势图：手写 SVG 折线/柱（纯展示，允许），数据 `attempt_trend`，默认近 14 天；空数据走 `EmptyState`。
  - 概览：总题数、正确率、已测点、覆盖度、最长连续学习天数（由 trend 计算）。
  - 「薄弱点变化」：本周 vs 上周的 score 对比（若 `attempt_trend` 不够，改为报告里对每个点单独查——可先不做，标 TODO 也行，但不要写假数据）。
- 仪表盘 `WorkspaceDashboardPage` 顶部若已设目标，显示「距考试 N 天 · 目标 X 分」一行（纯文字，不加副标题结构）。

**验收**：设目标 → 刷新仍在；改日期 → 计划条数变化；报告页有真实作答时出趋势，无作答时是 Lumi 空状态。

### W2 错误类型 + 证据状态

**依据**：错误类型枚举（Diagnostic-Strategy §2）：概念理解 / 公式定理使用 / 计算失误 / 逻辑推理 / 方法选择 / 审题理解 / 知识迁移 / 表达不完整。证据状态（Agent-Behavior §5）：`observed` / `hypothesized` / `verified` / `user_corrected`。

**数据层（migration 6）**

```sql
ALTER TABLE answer_attempts ADD COLUMN error_type TEXT NOT NULL DEFAULT '';
ALTER TABLE answer_attempts ADD COLUMN ink_summary TEXT NOT NULL DEFAULT '';   -- W4 复用
CREATE TABLE IF NOT EXISTS point_evidence (
    workspace_id TEXT NOT NULL,
    point_id     TEXT NOT NULL,
    state        TEXT NOT NULL,     -- observed|hypothesized|verified|user_corrected
    note         TEXT NOT NULL DEFAULT '',
    updated_at   INTEGER NOT NULL,
    PRIMARY KEY (workspace_id, point_id)
);
```

**后端**：`attempt_set_error_type(workspace_id, attempt_id, error_type)`、`evidence_list(workspace_id)`、`evidence_set(workspace_id, point_id, state, note)`。

**前端**
- 错题本每行加「错误类型」：BeUI `Select`（`size sm` + `text-sm`），选中后写库并即时更新。
- 诊断结果 `DiagnosticResult`：答错的题在行内标出 AI/规则推断的错误类型（先只做展示，推断逻辑可留空串）。
- 知识画像每行加证据状态徽章 + 「这个判断不对」按钮（`Tooltip` + 图标）：点击写入 `user_corrected`，`MasteryRow` 改为优先显示该状态并附 `InfoHint` 说明「已由你修正」。
- 掌握度计算**不改**（`mastery.ts` 保持纯函数），证据状态是叠加层，避免污染已有测试。

**验收**：给某错题选错误类型 → 重启仍在；对某点标「不对」→ 画像显示「已修正」，且该点不再被 `weakestFirst` 排到第一（用 evidence 覆盖排序，别改公式）。

### W3 提示词注册表 + `read_point` + 学习者上下文

**问题**（已核实）
1. `src/features/lumi/prompt.ts` 首行自称「moves into the prompt registry once that lands」，注册表不存在。
2. `SYSTEM_PROMPT` 完全不知道学生是谁（无目标、无薄弱点、无教学风格）。
3. `search_knowledge` 只搜 `name + summary`，**没有 `read_point`**，所以 Lumi 讲不了教材正文（85 篇 Markdown 白放着）。

**做法**
- 新建 `src/features/lumi/prompts/`：
  - `registry.ts`：`{ id, version, surface: "lumi"|"drill", build(ctx): string }`，集中注册。
  - `core.ts`（角色 + Markdown/LaTeX 规则）、`artifacts.ts`（plot/mindmap/svg/image/html + 122 class 词表，从 `prompt.ts` 原样搬）、`quiz.ts`（出题与 `@id` 引用规则）、`tutor.ts`（训练页变体）。
  - 保留 `prompt.ts` 作为 façade 导出 `SYSTEM_PROMPT` / `TUTOR_PROMPT`，避免改所有调用点；内部改为调用 registry。
  - **122 class 词表必须与 `sanitizeHtml.ts` 的词表保持同一来源**，现有 `htmlVocabulary.test.ts` 依赖 `node:fs` 读源码，改结构后要让它继续通过（必要时改测试路径而不是放宽断言）。
- `buildContext()` 注入段（放在 system 末尾，短）：
  - 学习包名 + 版本；
  - 学习目标（W1，未设则省略）；
  - 最薄弱的 5 个知识点（`get_mastery` 的同一套逻辑，直接复用 `weakestFirst`）；
  - 教学风格（见下）。
- 教学风格：`preferences` 加 `teachingStyle: "guided" | "direct" | "socratic"`（Rust `prefs.rs` 加字段 + `#[serde(default)]`，前端 `preferencesStore` 同步）。设置页「生成参数」或「首选项 → 训练」加一行 `ChoiceTabs`。
- 新工具 `read_point`：`ToolContext` 增加 `readPoint(pointId) -> { name, summary, body, objectives, prerequisites } | undefined`；`body` 截断到 ~4000 字（超出加「（正文已截断）」）。加进 `ALL_TOOL_NAMES` 与 drill 的 `DRILL_TOOLS`。
- `search_knowledge` 的 haystack 扩到 `name + summary + body`（body 先剥 Markdown 标记再小写），提高召回。

**验收**：问「讲讲 2.1 导数定义」→ Lumi 调 `read_point` 后复述教材里的定义与例题；`npx vitest run` 全绿（含 htmlVocabulary）。

### W4 作答与笔迹回传

- `ToolContext` 增 `recentAttempts: { questionId, pointId, correct, answer, at, errorType, inkSummary }[]`（同 `attemptSnapshot`，取最近 20 条）。
- 新工具 `get_recent_attempts`（drill 与 lumi 都开放），输出简短表格文本。
- 笔迹摘要：`useScratchpad` 增 `summary()` → `{ strokes, points, seconds, cleared }`；`QuestionCard` 提交时把摘要 JSON 写进 `answer_attempts.ink_summary`（W2 已加列）。
- 训练页右栏 `DrillLumiPanel` 发送时，除了 `@<id>` 种子，**再附带一行当前作答状态**（如「我已作答，判定为错」/「我还没作答」），走系统提示的 `@id` 约定，不要塞进用户原话里的长文本。
- **不要**把每次作答自动写进对话记录（会污染 transcript）。

**验收**：训练页答错一题 → 打开 Lumi 问「我最近错在哪」→ 回答能说出该题与其错误类型；重启后仍一致。

### W5 错题本增强

- 筛选栏：知识点用 BeUI `multi-select`（复用 `PointFilter` 的分组思路，但错题本按「有错题的点」分组）；错误类型 + 时间范围（近 7 天 / 30 天 / 全部）各一个 `Select`。
- 筛选状态存 `workspaceScope(workspaceId, "wrongBook.filter")`。
- 行内操作：重做（已有）、移出（已有，需加 `Modal` 二次确认）、问 Lumi（跳 `/drill?question=<id>` 并自动打开右栏，或直接跳 Lumi 页带种子——选前者，改动小）。
- 标签编辑：一期只做「错误类型」（W2 已覆盖），不做自由标签，避免和包内 `taxonomy` 冲突。

### W6 结构化配图 / 常见错误链路修复

**这是硬伤**：schema 支持但 Rust 解析时直接丢弃。

| 位置 | 现状 | 要改 |
|---|---|---|
| `src-tauri/src/package/content.rs` `FrontMatter` | 只有 id/name/chapter/summary/difficulty/exam_importance/learning_objectives/prerequisites/tags/sources | 加 `#[serde(default)] common_errors: Vec<String>`、`#[serde(default)] images: Vec<ContentImage>` |
| 同文件 `RawQuestion` | 无 `images` | 加 `#[serde(default)] images: Vec<ContentImage>` |
| 同文件 `Point` / 题目输出结构 | 无对应字段 | 加 `common_errors` / `images` 字段并用 serde camelCase 输出 |
| `src/features/library/api.ts` `PackagePoint` / `PackageQuestion` | 无字段 | 同步 |
| `src/features/knowledge/types.ts` | `KnowledgePoint` 无 `commonErrors`/`images` | 加（`ContentImage` 已存在） |
| `src/features/knowledge/view.ts` `toQuestion` | `images: []` 硬编码 | 改为 `question.images` |
| `src/features/knowledge/KnowledgeDocument.tsx` | 不渲染常见错误与配图 | 加两段（`ContentFigures` 已可复用，注意 `useMediaSource` 走包内路径） |

顺带：`src/features/knowledge/view.test.ts` 需要补字段期望；`src-tauri/src/package/content.rs` 单测（`content.Points.iter().all(...)` 那段）可能要加断言。

**验收**：手动往一个知识点 front matter 加 `common_errors` 与 `images`，`cargo test` 后前端能显示；题目加 `images` 后 `QuestionCard` 的题干下出现配图。

### W7 模拟考试（简化版）

**依据**：PRD 4.9、D-021「简化版，固定试卷 + 计时 + 交卷 + 统一评分」。
**卷面结构**（2021 真题实测）：一、选择 5×5；二、填空 5×5；三、计算 10×8（11–20）；四、应用与证明 2×10（21–22）。满分 150、时长 120 分钟。

**数据层（migration 7）**

```sql
CREATE TABLE IF NOT EXISTS exam_runs (
    id             TEXT PRIMARY KEY,
    workspace_id   TEXT NOT NULL,
    question_ids   TEXT NOT NULL,          -- JSON string[]
    answers        TEXT NOT NULL DEFAULT '{}', -- JSON {questionId: string}
    started_at     INTEGER NOT NULL,
    submitted_at   INTEGER,
    duration_limit INTEGER NOT NULL,       -- 秒
    score          INTEGER
);
```

**后端**：`exam_start(workspace_id, question_ids, duration) -> ExamRun`、`exam_save(answers)`、`exam_submit(id, answers) -> ExamResult`、`exam_list(workspace_id)`、`exam_load(id)`。

**前端**：`/w/:id/exam`
- 未开考：卷面说明（结构、时长、满分）+ 「开始考试」（`Modal` 确认）。
- 考试中：单题呈现（复用 `QuestionCard` 的只读渲染或轻量版，注意不要复用它的「提交后立刻判对错」——考试中不显示对错）、题号导航（数字条）、倒计时（右上角，剩余 <5 分钟变 warning 色）、「交卷」（`Modal` 二次确认）。
- 交卷后：总分、分题型得分、错题清单（链接到 drill）、「再来一次」。
- 计时用 `started_at` 推算，不靠 `setInterval` 累加（关掉重开不丢时间）。
- 组卷：优先用真题结构（有题型分布时），不足时退回 `blueprint.ts`。

**验收**：开考 → 中途切页再回来时间连续 → 交卷出分 → 分数可追溯到 `answer_attempts`（考试作答也要 `recordAttempt`，来源标 `exam:<runId>`）。

### W8 学习包版本策略 + 个人数据备份

**版本策略**
- migration：`ALTER TABLE workspaces ADD COLUMN version_policy TEXT NOT NULL DEFAULT 'follow';`（`follow` = 装新版即更新；`locked` = 只提示不覆盖）。
- `package_install` 读策略：`locked` 时返回「已有锁定版本」错误，让 `ImportDialog` 提示先解锁。
- `PackageSheet`（书架长按/详情）加设置项：`Switch` 或 `ChoiceTabs`。

**备份/恢复**
- `data_backup(target) -> u64`：先 `PRAGMA wal_checkpoint(TRUNCATE)`，再复制 `morrow.db` + `ui-state.json` + `preferences.json` 到临时目录，用 `package::archive::pack` 打成 `.morrow-backup`（或直接 zip 后缀），返回字节数。
- `data_restore(path)`：解包到临时目录 → 校验文件名白名单（只允许这 3 个）→ 关闭连接、备份旧库、替换 → 重启提示（`Modal` 告知需重启）。
- 设置页「数据管理」加两块：备份（`Button` 选路径）、恢复（`Button` 选文件 + 警告 `Alert`）。
- **不要**在 `DataSettingsPage` 里写副标题段落，用 `SettingsRow` 的 `hint`。

### W9 首次引导

- 触发条件：`workspaces.length === 0` 且 `ui-state` 里 `appScope("onboarding.done")` 为 false。
- 形式：`LibraryPage` 上的覆盖层（BeUI `Modal`，`size` 用大号），4 步：
  1. 欢迎（Lumi 形象 + 一句话）
  2. Provider（内嵌 `ProviderEditor` 的表单片段或直接给「去设置」按钮 —— **选后者**，避免把 `ProviderEditor` 拆碎）
  3. 导入学习包（复用 `ImportDialog`）
  4. 设目标（复用 W1 的表单组件）
- 最后一步「开始诊断」→ 跳 `/w/:id/diagnostic`，写 `onboarding.done`。
- 每步可跳过，跳过也写 `done`（避免反复打扰）。

### W10 章节雷达 + 知识关联

- 雷达：按 `view.chapters` 聚合（13 章 → 取 `examImportance` 为 critical/high 的 6–8 章），每轴值 = 该章各点 score 的均值（未测按 0 且轴名加 `*`）。手写 SVG，`SquircleWrapper` 内，鼠标悬停用 BeUI `Tooltip` 显示数值。放仪表盘或报告页（建议报告页，仪表盘已经很满）。
- 知识关联：`KnowledgeDocument` 的「相关知识点」已用 `point.related` 显示按钮，**再补**：每个关联点显示关系类型（`relation.type`）与方向（前置/后续），数据从 `index.view.relations` 过滤。图谱力导向不做。
- 前置依赖链：知识点详情里加「前置知识」一段（`point.prerequisites` 目前完全没用），未打的点用 `Button` 跳转。

---

## 5. 执行与提交切分（建议）

| # | 提交主题 | 内容 |
|---|---|---|
| 1 | `(fix) keep the knowledge figures and common errors the package ships` | W6 |
| 2 | `(feat) let a learner set a goal and read a plan` | W1（表 + 后端 + `/plan`） |
| 3 | `(feat) chart how the practice is going` | W1（`attempt_trend` + `/report`） |
| 4 | `(feat) name what went wrong on a wrong answer` | W2（错误类型） |
| 5 | `(feat) mark a mastery judgement as corrected` | W2（证据状态） |
| 6 | `(chore) move the lumi instructions into a registry` | W3（拆分，不改行为） |
| 7 | `(feat) let lumi read the point it is explaining` | W3（`read_point` + 上下文注入 + 教学风格） |
| 8 | `(feat) hand the recent attempts to lumi` | W4 |
| 9 | `(feat) filter the wrong book` | W5 |
| 10 | `(feat) sit a timed mock exam` | W7 |
| 11 | `(feat) back up and restore the local store` | W8 |
| 12 | `(feat) greet a first-time learner` | W9 |
| 13 | `(feat) show the chapter radar and the prerequisites` | W10 |
| — | W0 单独多提交（每章一个） | `(chore) add chapter N questions` 等 |

每个提交前必须跑完 §6 全部命令。

---

## 6. 验证命令

```powershell
npx tsc -b --force
npx vite build
npx vitest run
cargo test --manifest-path src-tauri/Cargo.toml
node scripts/mlps/validatePackage.mjs packages/cn.morrow.calculus.shaanxi-upgrade   # 改包时才跑
```

- 当前基线：10 个测试文件 / 87 个用例全绿。
- `cargo` / `pnpm` 的报错会包一层 `NativeCommandError`，看真实 `$LASTEXITCODE`；`Select-String` 管道会让退出码变 1，别误判。
- 浏览器预览（`pnpm dev`）里所有 `invoke` 走 `isTauriRuntime` 短路，**端到端必须 `pnpm tauri:dev`**。

---

## 7. 关键文件索引

| 主题 | 文件 |
|---|---|
| 路由 | `src/app/router.tsx` |
| 导航 | `src/app/navigation.ts`（`workspaceNavigation`） |
| 界面状态 | `src/features/uiState/{store,scope,usePersistedState}.ts` |
| 数据库迁移 | `src-tauri/src/store/migrations.rs` |
| 存储模块 | `src-tauri/src/store/{attempts,messages,stats,types,workspaces}.rs` |
| Tauri 命令注册 | `src-tauri/src/lib.rs`（`invoke_handler`） |
| 包解析 | `src-tauri/src/package/{content,manifest,archive,checksums,paths}.rs` |
| 提示词 | `src/features/lumi/prompt.ts` → 待拆 `prompts/` |
| 工具层 | `src/features/lumi/{tools,toolContext,useToolContext,agentLoop}.ts` |
| 掌握度 | `src/features/training/mastery.ts` |
| 作答记录 | `src/features/training/attempts.ts`、`attemptCache.ts` |
| 诊断 | `src/pages/training/{DiagnosticPage,DiagnosticResult}.tsx`、`src/features/training/{blueprint,diagnosticRun}.ts` |
| 训练 | `src/pages/training/{DrillPage,PointFilter}.tsx`、`src/features/training/{QuestionCard,DrillToolbar,DrillLumiPanel}.tsx` |
| 画板 | `src/features/scratchpad/{Scratchpad,useScratchpad,geometry,palette}.ts(x)` |
| 知识库 | `src/features/knowledge/{index,view,types,KnowledgeTree,KnowledgeDocument}.ts(x)` |
| 分包接口 | `src/features/library/{api,store,ImportDialog,PackageSheet,useCover,media}.ts(x)` |
| 设置 | `src/pages/settings/*`、`src/features/settings/preferences.ts` |
| BeUI 同步 | `scripts/syncBeui.mjs`（新增组件要加进清单再 `node scripts/syncBeui.mjs`） |

---

## 8. 已知坑（不踩）

1. **`src/` 里有 19 个用户未提交的改动 + 6 个未跟踪文件**，是用户自己的在制品（`MathText.tsx` + 新增 `splitMath.ts`、`knowledge/KnowledgeDocument.tsx`、`training/QuestionCard.tsx`、`lib.rs`、`package/mod.rs`、`vite.config.ts`、几个 `prompts/*` 与 `scripts/*`）。**不要回滚、不要 `git checkout`，改动时叠加。**
2. `node scripts/syncBeui.mjs` 会先 `rm -rf src/vendor/beui` 再全量重下，偶发 `ECONNRESET`，重跑一次。
3. BeUI `Button size="sm"` 内部是 `text-xs h-8`，调用处补 `text-sm`；单图标按钮用 `size="sm"` + `size-8 rounded-full p-0`。
4. BeUI `Input` 是受控 `onChange(value: string)`，默认 `rounded-full h-11`。
5. `next-themes` 未装，`vendor` 里的 `theme-toggle.tsx` 不可用；主题切换走自写 `useThemeReveal`（`circle-blur`）。
6. `?raw` 导入在 vitest 里返回空串；词表一致性测试必须用 `node:fs`。
7. Gravity Icons 名字先查：存在 `House/HouseFill`、`ChevronsDown`、`Tooltip` 用到的一批；**不存在** `ChevronsUpDown`、`Maximize`、`Home`、`Robot`、`Brain`、`Sitemap`。用到新图标先在 `node_modules/@gravity-ui/icons` 里确认。
8. `agent-code.tsx` 的高亮器只支持 `bash|diff|json|tsx|typescript`，未知语言退 `text`。
9. 侧边栏收缩态：隐藏分组标签与文字、不显示 chevron、图标居中、正圆、间距 4px、Hover 用 BeUI `Tooltip`；点击带子项项目弹锚定 `ListBox`；字体固定 `text-sm`。
10. 打开设置页要隐藏侧边栏且 `TitleBar` 的侧边栏开关置灰禁用。
11. 每个工作区必须有仪表盘（`index: true`），面包屑科目层点击回仪表盘，在仪表盘时只显示「书架 / 包名」。
12. 空状态一律带 Lumi（`mood` + `surface`），没有例外。
13. 新增列表/滚动页记得挂 `useScrollMemory`（否则刷新回到顶部，违反「保存状态」要求）。
14. 新增页面若展示掌握度，不加副标题解释，用 `InfoHint`。
15. 迁移数组只 append；改 Rust 结构体后 `cargo test` 里 `content.rs` 的断言与 `tests/shipped_archive.rs` 可能一起失败，需同步。
16. `packages/`、`knowledge/`、`data/`、`dist-packages/` 不进 Git（已 `.gitignore`），别 `git add -A`。
17. 写入中文一律用编辑工具，别用 `Set-Content`。

---

## 9. 明确的「不做」

- 语音输入/语音回复（PRD 4.11）：无接口权限、无额度、跨端风险高，本期不做。
- 力导向知识图谱：用章节雷达 + 邻接卡片替代。
- 自由标签体系：错误类型已足够，避免与包内 `taxonomy/tags.yaml` 冲突。
- 真正的情感/记忆向量库：掌握度 + 作答记录 + 证据状态已够 MVP。
- 云同步 / 多端：本地 SQLite + 备份文件。

---

## 10. 新会话开场建议

> 先读 `docs/06-Project/Next-Round-Brief.md`，然后从 W6 开始做，每完成一个工作包按第 5 节提交并跑第 6 节全部命令。遇到与文档冲突的实现，以本文档第 1 节硬约束为准。
