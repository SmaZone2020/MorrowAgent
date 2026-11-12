<div align="center">

# Work Plan · 开发计划表

**The engineering backlog: what is done, what is in progress, and how each item is verified.**

[![Reference](https://img.shields.io/badge/REFERENCE-6b7280?style=flat-square)](#) [![中文正文](https://img.shields.io/badge/%E6%AD%A3%E6%96%87-%E4%B8%AD%E6%96%87-2f6f5e?style=flat-square)](#)

</div>

> This document is written in Chinese. The title and summary above are the English entry point.

> 状态：进行中
> 更新：2026-11-10
> 说明：本表是**工程待办**的唯一清单，产品决策仍以 `docs/DECISIONS.md` 为准，未定案项在 `docs/OPEN-QUESTIONS.md`。

## 0. 已完成但未提交

| commit 主题 | 内容 |
|---|---|
| `(feat) vendor the beui agent components` | 同步脚本支持 `agents` 目录；引入 Message / Message Scroller / Prompt Input / Streaming Response / Agent Loading States |
| `(feat) rebuild the lumi conversation surface` | Lumi 页换成 MessageScroller + Message + StreamingResponse + ReasoningText，输入框换成 PromptInput，新增「重新生成」 |
| `(feat) make the drill text scale apply to the whole question` | 字号改为 `calc(scale * 0.875rem)` 显式计算，题干/选项/解析/正确答案四处统一 |
| `(feat) lay out answer options on a responsive grid` | 选项拆成 `AnswerOptions`，2×2 自适应网格，选中态强于 hover |
| `(feat) add a scratchpad tool rail to the drill` | 草稿纸 + 字号工具栏，`perfect-freehand` 笔画层 |

---

## 1. 状态持久化（P0）

目标：任何页面刷新、切页、重启后，用户回到原处，而不是回到默认值。

### 1.1 基础设施

| ID | 任务 | 关键点 | 验收 |
|---|---|---|---|
| S-01 | 新增 `ui-state.json` 存储层 | Rust 侧 `ui_state_load` / `ui_state_save`，整文件读写，结构为 `{ version, scopes: { [key]: unknown } }` | 重启后读回同一份 |
| S-02 | `usePersistedState(key, initial)` | 同步从内存缓存取初值（避免首帧闪烁）→ 异步对齐磁盘 → 变更防抖 300ms 落盘 | 首帧不闪、连点只写一次 |
| S-03 | 浏览器预览降级到 `localStorage` | 与 Tauri 分支同一接口，前缀 `morrow:` | 预览里刷新也保留 |
| S-04 | 写入失败静默降级 | 磁盘写失败不得阻塞交互，只在控制台留痕 | 只读目录下页面仍可用 |

> 已定：独立 `ui-state.json`（D-062），按 `scope` 分区（D-063），走 `usePersistedState`（D-064）。

### 1.2 各页面接入

| ID | 页面 | 需要记住的状态 | scope key |
|---|---|---|---|
| S-10 | 侧边栏 | 折叠/展开、当前展开的分组 | `sidebar.open`、`sidebar.expanded` |
| S-11 | Lumi | 最近会话 id、输入框草稿、历史面板开合 | `lumi.conversationId`、`lumi.draft`、`lumi.listOpen` |
| S-12 | 知识库 | 搜索词、展开的知识点、滚动位置 | `knowledge.query`、`knowledge.openIds`、`knowledge.scrollTop` |
| S-13 | 专项训练 | 当前题号、本轮作答结果与所选答案、工具栏展开项 | `drill.run`、`drill.tool` |
| S-14 | 错题本 | 滚动位置、筛选条件（筛选功能落地后） | `wrongBook.scrollTop` |
| S-15 | 知识画像 | 排序方式（落地后）、滚动位置 | `profile.scrollTop` |
| S-16 | 设置 · Provider | 未保存的表单草稿（baseUrl / model / protocol，**不含 apiKey**） | `settings.provider.draft` |

> 落地时把 scope 拆到字段级：同一页的不同组件（如训练页与工具栏）各写各的键，互不覆盖；
> 仍按页面命名空间分组，`sidebar.open` 属于 `sidebar`。

规则：
- 已经在 URL 里的状态（`point` / `question`）不进 UI 状态，URL 是唯一来源。
- 密钥、Token 一律不写入 UI 状态。
- 状态结构带版本号，字段改名时写迁移，不静默丢数据。
- 滚动位置统一走 `useScrollMemory(scope)`：它等异步内容撑开高度后再恢复，避免空列表时把位置吞掉。

---

## 2. Lumi 多会话（P0）

| ID | 任务 | 关键点 | 验收 |
|---|---|---|---|
| L-01 | Rust 补 `chat_rename` | `UPDATE conversations SET title = ?1` | 改名后列表即时更新 |
| L-02 | `chat_open` 按 id 载入 | 现只有「最近一条」，需要按 id 取 | 点列表任一条都能切换 |
| L-03 | 会话列表 UI | 页内左侧可折叠栏（D-067）：标题、时间、当前高亮；顶部「新对话」 | 可切换、可新建 |
| L-04 | 重命名 | 行内编辑，回车保存、Esc 取消 | 刷新后仍是新名字 |
| L-05 | 删除 | 二次确认；删除当前会话后落到次新的一条 | 删完不白屏 |
| L-06 | 记住最近访问会话 | `ui.lumi.conversationId`，启动时优先恢复；不存在则取 `updated_at` 最新 | 重启回到上次那条 |
| L-07 | 流式期间切会话 | 切走要中止当前请求，避免回复串到另一条会话 | 不串台 |
| L-08 | 空会话清理 | 新建后没发消息就切走，不留空壳 | 列表不出现空标题 |

---

## 3. 训练与画板（P1）

| ID | 任务 | 关键点 | 验收 |
|---|---|---|---|
| T-01 | 画板挂进题目卡片 | 替换「这道题需要画板作答」占位；卡片内可折叠 | 非选择题可手写作答 |
| T-02 | 笔画流持久化 | 自研 JSON + 版本号（D-052），按题目 id 存 | 切题再回来笔迹还在 |
| T-03 | 撤销 / 清空 / 笔宽 | 工具栏已留位 | 三步可回退 |
| T-04 | 笔画聚合回传 | 提交时把笔画摘要（长度、停顿、擦除次数）交给 Lumi | Lumi 能引用过程数据 |
| T-05 | 作答结果回传 Lumi | 对错、耗时、知识点 id 进会话上下文 | Lumi 能主动点评 |
| T-06 | 答题页保存进度 | 题号 + 本轮结果 + 笔画（接 S-13） | 刷新回到原题 |
| T-07 | 错题本筛选 | 按知识点 / 错误类型 / 时间 | 组合筛选可用 |

---

## 4. 知识库（P1）

| ID | 任务 | 关键点 | 验收 |
|---|---|---|---|
| K-01 | 左侧树 + 右侧详情 | 按 D-057 重构，替换现在的就地展开 | 双栏布局 |
| K-02 | 树的状态记忆 | 展开节点、选中节点（接 S-12） | 刷新保持 |
| K-03 | 详情区内容 | 描述、目标、常见错误、配图、关联题目数、练习入口 | 信息完整 |
| K-04 | 「导数与微分」补题 | 骨架已建（D-059），按提示词产出首批题 | `validate:knowledge` 通过 |

---

## 5. 设置补全（P2）

| ID | 任务 | 关键点 | 验收 |
|---|---|---|---|
| C-01 | 外观分区 | 字号、界面密度（仅浅色，D-041） | 改动即时生效并持久化 |
| C-02 | 关于分区 | 版本、开源许可、仓库地址 | 可复制版本号 |
| C-03 | Provider 表单草稿 | 接 S-16，切页不丢输入 | 返回时内容还在 |

---

## 6. 数据与算法（P2）

| ID | 任务 | 关键点 | 验收 |
|---|---|---|---|
| D-01 | 掌握度算法 | 难度加权正确率 + 时间衰减（D-056），权重与半衰期写入决策表 | 分数可追溯到作答记录 |
| D-02 | 置信度 | 与掌握度独立（D-010） | 样本少时置信度低 |
| D-03 | 知识画像升级 | 用 D-01 替换当前「次数 + 正确率」 | 显示掌握度 + 证据 |
| D-04 | 学习报告页 | 趋势、薄弱点、建议 | 不再是占位页 |

---

## 7. 平台与工程（P2）

| ID | 任务 | 关键点 | 验收 |
|---|---|---|---|
| P-01 | 学习目标 / 学习计划页 | 现在都是占位页 | 可录入目标、生成计划 |
| P-02 | 模拟考试 | 简化版（D-021） | 计时、交卷、成绩 |
| P-03 | Android 实机 | 目前只有编译保证 | 能装、能启动、能发一条消息 |
| P-04 | 字体子集化 | D-061 暂缓，安装包 22MB | 体积显著下降且无缺字 |
| P-05 | 真实端点联调回归 | `cargo test -- --ignored` | 三协议各跑通一次 |

---

## 执行顺序

1. S-01 → S-04（基础设施，后续全部依赖它）
2. L-01 → L-08（多会话 + 最近会话恢复）
3. S-10 → S-16（各页面接入）
4. T-01 → T-06（画板闭环）
5. K-01 → K-03（知识库重构）
6. 其余按 P2 排期
