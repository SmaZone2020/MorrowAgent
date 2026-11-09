export type PageStage = "skeleton" | "planned";

export interface PageMeta {
  path: string;
  title: string;
  section: string;
  stage: PageStage;
  scope: string[];
}

export const pageMetaList: PageMeta[] = [
  {
    path: "/learning/goal",
    title: "学习目标",
    section: "我的学习",
    stage: "planned",
    scope: [
      "考试、目标分数、考试日期、难度层次字段",
      "Lumi 建议与用户确认流程",
      "目标调整历史记录",
    ],
  },
  {
    path: "/learning/plan",
    title: "学习计划",
    section: "我的学习",
    stage: "planned",
    scope: [
      "阶段任务与日/周计划视图",
      "任务完成与延期状态",
      "计划调整通知与记录",
    ],
  },
  {
    path: "/learning/profile",
    title: "知识画像",
    section: "我的学习",
    stage: "planned",
    scope: [
      "知识点树与前置依赖关系",
      "掌握度 0-100 与独立置信度",
      "证据列表与用户纠正入口",
    ],
  },
  {
    path: "/learning/report",
    title: "学习报告",
    section: "我的学习",
    stage: "planned",
    scope: ["周期报告与前后测对照", "薄弱点变化与训练建议", "讲解难度反馈"],
  },
  {
    path: "/training/assessment",
    title: "智能测评",
    section: "训练中心",
    stage: "planned",
    scope: [
      "覆盖性测评流程",
      "疑似弱项追问与变式验证",
      "结论状态：observed / hypothesized / verified / user_corrected",
    ],
  },
  {
    path: "/training/drill",
    title: "专项训练",
    section: "训练中心",
    stage: "skeleton",
    scope: ["训练时长与知识点选择", "诊断驱动的题目推荐", "训练后掌握度更新"],
  },
  {
    path: "/training/mock",
    title: "模拟考试",
    section: "训练中心",
    stage: "planned",
    scope: ["固定试卷与计时", "交卷与统一评分", "考试分析报告"],
  },
  {
    path: "/wrong-book",
    title: "错题本",
    section: "资源与记录",
    stage: "skeleton",
    scope: ["自动收录与手动编辑", "错误类型与知识点标签", "画板证据关联"],
  },
  {
    path: "/knowledge",
    title: "知识库",
    section: "资源与记录",
    stage: "skeleton",
    scope: ["章节树与知识点详情", "前置依赖与关联关系", "资源包版本策略"],
  },
  {
    path: "/settings",
    title: "设置",
    section: "设置",
    stage: "skeleton",
    scope: ["分区导航", "AI Provider 与模型配置", "数据管理"],
  },
  {
    path: "/settings/provider",
    title: "AI Provider",
    section: "设置",
    stage: "skeleton",
    scope: [
      "OpenAI Chat Completions 与 Responses 协议",
      "Anthropic Messages 协议",
      "本地加密存储与连通性测试",
    ],
  },
  {
    path: "/settings/model",
    title: "模型配置",
    section: "设置",
    stage: "skeleton",
    scope: ["默认模型与备用模型", "生成参数", "教学风格与难度偏好"],
  },
  {
    path: "/settings/data",
    title: "数据管理",
    section: "设置",
    stage: "skeleton",
    scope: ["数据库位置与体积", "备份、导出与删除", "Demo 数据重置"],
  },
];

export function findPageMeta(pathname: string): PageMeta | undefined {
  return pageMetaList.find((page) => page.path === pathname);
}
