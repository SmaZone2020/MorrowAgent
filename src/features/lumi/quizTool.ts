import type { ToolHandler } from "@/features/lumi/tools";

/**
 * `ask_questions` does not produce an answer on its own: it hands the questions
 * to the conversation, and the user's submission becomes the tool result. That
 * is why its handler is a placeholder — the loop detects it by name.
 */
export const QUIZ_TOOL = "ask_questions";

/** The schema is long because the model has to emit a whole question set. */
export const quizTool: ToolHandler = {
  definition: {
    name: QUIZ_TOOL,
    description:
      "给学生出题并等待作答。调用后本轮结束，学生会看到题卡；学生提交后你才会收到每题的对错与作答内容。一次可以做 1–8 题，题型可混排（单选、多选、填空、画板）。",
    parameters: {
      type: "object",
      required: ["componentId", "questions"],
      properties: {
        componentId: {
          type: "string",
          description: "本次题组的唯一标识，字母数字与下划线，例如 set_2024_03。",
        },
        title: { type: "string", description: "题组标题，例如「导数定义 · 3 题」。" },
        questions: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            required: ["id", "type", "stem"],
            properties: {
              id: { type: "string", description: "组内唯一，例如 q1。" },
              type: {
                type: "string",
                enum: ["single_choice", "multiple_choice", "fill_blank", "board"],
              },
              stem: { type: "string", description: "题干，数学用 $...$。" },
              options: {
                type: "array",
                description: "选择/多选题必填。",
                items: {
                  type: "object",
                  required: ["key", "content", "correct"],
                  properties: {
                    key: { type: "string", description: "选项标识，如 A。" },
                    content: { type: "string" },
                    correct: { type: "boolean" },
                    explanation: {
                      type: "string",
                      description: "该选项为什么对，或错在哪一步。",
                    },
                  },
                },
              },
              answer: {
                type: "array",
                items: { type: "string" },
                description: "选择题填选项 key；填空题填标准答案文本。",
              },
              explanation: { type: "string", description: "整体解析。" },
              knowledgePoints: {
                type: "array",
                items: { type: "string" },
                description: "关联知识点 ID，尽量使用知识库里已有的。",
              },
              difficulty: { type: "number", description: "1–5。" },
            },
          },
        },
      },
    },
  },
  run: () => ({
    status: "error",
    output: "ask_questions 由前端挂起，不应走到这里。",
  }),
};
