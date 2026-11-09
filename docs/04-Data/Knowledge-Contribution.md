# 12 Morrow-Knowledge 贡献与版本规范

## 1. 仓库定位

`Morrow-Knowledge` 是公共教学资源仓库，负责维护结构化知识点、知识关系、题目和相关教学资料。

## 2. 建议目录

```text
Morrow-Knowledge/
├── README.md
├── manifest.json
├── schemas/
│   ├── knowledge-point.schema.json
│   └── question.schema.json
├── subjects/
│   └── math-higher/
│       ├── subject.yaml
│       ├── chapters/
│       ├── knowledge-points/
│       └── questions/
├── sources/
├── changelog/
└── scripts/
    └── validate/
```

## 3. 贡献流程

1. 贡献者按模板新增或修改数据。
2. 本地运行格式和引用校验。
3. 提交 Pull Request。
4. 维护者审核内容准确性、知识点关系和来源。
5. 合并后更新版本与变更记录。
6. 客户端按版本策略更新资源包。

## 4. 版本策略

- 资源包提供明确版本号。
- 用户可锁定当前版本或跟随最新版。
- 更新公共知识库不能覆盖个人错题、画像和学习记录。
- 删除知识点时应提供迁移或弃用标记，避免历史数据悬空。

## 5. 四人协作约定

- 产品负责人发布字段标准和枚举。
- 知识点负责人维护章节树、定义和依赖关系。
- 题库负责人维护题目、答案、解析和来源。
- 数据工具/质量负责人维护生成工具流程、自动校验和重复数据检查。
- 所有人不得私自改变公共字段含义；变更需先更新标准并评审。
