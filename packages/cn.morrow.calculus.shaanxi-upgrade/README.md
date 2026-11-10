# 应用高等数学（陕西专升本专项）

陕西专升本高等数学学习包。首批内容覆盖函数与极限、导数与微分两章。

## 目录

- `manifest.yaml` 学习包入口，客户端只读它来定位内容
- `knowledge/` 章节树与知识点 Markdown 正文
- `questions/` 按来源类型分组的题库
- `taxonomy/` 标签与错误类型
- `citations/` 资料来源与授权状态

## 使用

在 Morrow Agent 的书架上通过「导入学习包」选择 `.morrow` 文件，或在开发时直接指向本目录。

## 内容边界

本包不含真题原文。标注为 adapted 的题目均为自写题干，仅在 `source_id` 中登记母题出处，母题的授权状态见 `citations/sources.yaml`。
