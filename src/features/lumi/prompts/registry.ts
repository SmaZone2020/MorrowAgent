import type { StudyGoal } from "@/features/plan/types";
import type { TeachingStyle } from "@/features/lumi/teachingStyle";
import { TEACHING_STYLE_HINT } from "@/features/lumi/teachingStyle";
import { artifactsPrompt, corePrompt, quizPrompt, referencePrompt } from "@/features/lumi/prompts/core";

/**
 * What the model is told about this learner, gathered once per request.
 *
 * The prompt is the only place the model learns who it is talking to. Without
 * this it would have to call `get_mastery` before it could say anything useful,
 * and most replies do not spend a tool round on that.
 */
export interface LearnerProfile {
  packageName: string;
  packageVersion: string;
  goal: StudyGoal | null;
  /** Weakest points, already ranked; `score` is null when never tested. */
  weakest: { id: string; name: string; score: number | null }[];
  teachingStyle: TeachingStyle;
}

export const EMPTY_PROFILE: LearnerProfile = {
  packageName: "",
  packageVersion: "",
  goal: null,
  weakest: [],
  teachingStyle: "guided",
};

/** Which surface is asking, because the drill rail must not restate the stem. */
export type PromptSurface = "lumi" | "drill";

export interface PromptSpec {
  id: string;
  version: number;
  surface: PromptSurface;
  build: (profile: LearnerProfile) => string;
}

/**
 * The learner block appended to the system prompt.
 *
 * It is deliberately short and factual: a long persona description crowds out
 * the actual question, and the model already knows how to teach. What it cannot
 * guess is which package this is, what the learner is aiming at, and which
 * points are weak — so that is all this says.
 */
function learnerBlock(profile: LearnerProfile): string {
  const lines: string[] = ["当前学习者："];

  if (profile.packageName) {
    lines.push(
      `- 学习包：${profile.packageName}${profile.packageVersion ? ` v${profile.packageVersion}` : ""}`,
    );
  }

  const goal = profile.goal;
  if (goal) {
    const parts: string[] = [];
    if (goal.targetScore !== null) parts.push(`目标 ${goal.targetScore} 分`);
    if (goal.examDate) parts.push(`考试日期 ${goal.examDate}`);
    if (goal.minutesPerDay) parts.push(`每天约 ${goal.minutesPerDay} 分钟`);
    if (parts.length > 0) lines.push(`- 学习目标：${parts.join("，")}`);
    if (goal.note) lines.push(`- 学习者自己的备注：${goal.note}`);
  }

  if (profile.weakest.length > 0) {
    const weakest = profile.weakest
      .map((point) =>
        point.score === null ? `${point.name}（未测）` : `${point.name}（${point.score}%）`,
      )
      .join("、");
    lines.push(`- 目前最薄弱的几个知识点：${weakest}`);
  }

  lines.push(`- 教学风格：${TEACHING_STYLE_HINT[profile.teachingStyle]}`);

  return lines.join("\n");
}

const LUMI: PromptSpec = {
  id: "lumi.system",
  version: 2,
  surface: "lumi",
  build: (profile) =>
    [
      corePrompt(),
      "",
      artifactsPrompt(),
      "",
      quizPrompt(),
      "",
      referencePrompt(),
      "",
      learnerBlock(profile),
    ].join("\n"),
};

const DRILL: PromptSpec = {
  id: "drill.system",
  version: 2,
  surface: "drill",
  build: (profile) =>
    [
      corePrompt(),
      "",
      referencePrompt(),
      "",
      "当前场景：用户正在专项训练里做一道题，问题会附带 @题目ID 引用。",
      "先调用 read_question 拿到题干与选项，再判断用户卡在哪一步，给出可以立刻用上的下一步，不要整段重讲题干。",
      "如果用户还没作答，不要直接说出答案；引导他自己算出下一步。用户已经作答或主动要答案时，再完整讲解。",
      "",
      learnerBlock(profile),
    ].join("\n"),
};

/**
 * Every system prompt the app can send, in one place.
 *
 * A prompt is versioned because a transcript is stored without it: when a reply
 * looks wrong months later, the version is what tells us which instructions
 * produced it.
 */
export const PROMPTS: PromptSpec[] = [LUMI, DRILL];

export function promptFor(surface: PromptSurface): PromptSpec {
  return PROMPTS.find((spec) => spec.surface === surface) ?? LUMI;
}

export function buildPrompt(
  surface: PromptSurface,
  profile: LearnerProfile = EMPTY_PROFILE,
): string {
  return promptFor(surface).build(profile);
}
