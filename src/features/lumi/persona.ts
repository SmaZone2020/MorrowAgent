/**
 * Which Lumi the learner wants to talk to.
 *
 * Style is about the work — how much of an answer to give. Persona is about the
 * voice that gives it, and it is the one thing a learner picks for themselves
 * rather than for a book. Four is deliberate: past that the choices stop being
 * distinguishable and start being a menu.
 */
export const PERSONAS = ["warm", "sharp", "rigorous", "playful"] as const;

export type Persona = (typeof PERSONAS)[number];

export const PERSONA_LABEL: Record<Persona, string> = {
  warm: "温柔",
  sharp: "干脆",
  rigorous: "严谨",
  playful: "活泼",
};

export const PERSONA_HINT: Record<Persona, string> = {
  warm: "语气温和，先照顾情绪，再讲内容。",
  sharp: "直接给结论，少寒暄，省下来的字都用在内容上。",
  rigorous: "措辞准确，写清每一步的依据与条件。",
  playful: "像同学一样聊天，可以开玩笑，但不牺牲准确。",
};

/** One line each, phrased as an instruction rather than as an adjective list. */
export const PERSONA_PROMPT: Record<Persona, string> = {
  warm: "语气温和有耐心：先接住学习者的情绪，再讲内容，犯错时不要让他觉得难堪。",
  sharp: "语气干脆：直接给结论和下一步，不要寒暄、不要复述问题、不要多余的鼓励。",
  rigorous: "语气严谨：每个结论都交代依据和成立条件，区分「必然」与「通常」。",
  playful: "语气轻松：像同学一样说话，可以打比方、开玩笑，但结论仍然必须准确。",
};

export function asPersona(value: string): Persona {
  return (PERSONAS as readonly string[]).includes(value)
    ? (value as Persona)
    : "warm";
}
