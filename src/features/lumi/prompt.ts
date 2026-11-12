import { buildPrompt, EMPTY_PROFILE } from "@/features/lumi/prompts/registry";

/**
 * The prompts, as the rest of the app has always imported them.
 *
 * The real text now lives in `prompts/`, one module per concern, because the
 * HTML vocabulary has to be generated from the sanitizer's allow-list rather
 * than copied beside it. These two exports remain the no-context baseline; a
 * conversation builds its own prompt per request so the learner block is
 * current.
 */
export const SYSTEM_PROMPT = buildPrompt("lumi", EMPTY_PROFILE);
export const TUTOR_PROMPT = buildPrompt("drill", EMPTY_PROFILE);

export { buildPrompt, PROMPTS, promptFor } from "@/features/lumi/prompts/registry";
export type {
  LearnerProfile,
  PromptSpec,
  PromptSurface,
} from "@/features/lumi/prompts/registry";
export { EMPTY_PROFILE } from "@/features/lumi/prompts/registry";
