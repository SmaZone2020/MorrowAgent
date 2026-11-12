/**
 * `@calculus.limit.q.000001` in prose.
 *
 * A reply, a note or a textbook page may point at a question by id. The reader
 * cannot tell one hex-ish id from the next, so the id is drawn as a badge and
 * the question itself opens on click instead of being pasted into the text.
 *
 * Detection lives here rather than in the renderer: the rule for what counts as
 * a reference is worth a test, and the badge needs the same rule to decide
 * whether a mention is live.
 */
const REFERENCE = /^@([A-Za-z0-9._-]+)/;

/** Question ids are namespaced by chapter, so a reference always names one. */
const QUESTION_ID = /\.q\.[A-Za-z0-9._-]+$/;

/** A trailing full stop belongs to the sentence, not to the id. */
function trimId(raw: string): string {
  return raw.replace(/[._-]+$/, "");
}

/**
 * The reference that starts at the beginning of `text`, if any.
 *
 * Returns null for `@someone` and for a bare `@`: only an id shaped like a
 * question is a reference, and anything else has to stay a character.
 */
export function referenceAt(text: string): string | null {
  const match = REFERENCE.exec(text);
  if (!match) return null;
  const id = trimId(match[1]!);
  return QUESTION_ID.test(id) ? id : null;
}

export type TextSegment =
  | { kind: "text"; value: string }
  | { kind: "reference"; id: string };

/** Splits a plain string into prose and the question references inside it. */
export function splitReferences(text: string): TextSegment[] {
  const out: TextSegment[] = [];
  let rest = text;

  const pushText = (value: string) => {
    if (!value) return;
    const last = out.at(-1);
    if (last?.kind === "text") last.value += value;
    else out.push({ kind: "text", value });
  };

  while (rest.length > 0) {
    const at = rest.indexOf("@");
    if (at === -1) {
      pushText(rest);
      break;
    }
    pushText(rest.slice(0, at));
    const id = referenceAt(rest.slice(at));
    if (!id) {
      pushText("@");
      rest = rest.slice(at + 1);
      continue;
    }
    out.push({ kind: "reference", id });
    rest = rest.slice(at + 1 + id.length);
  }

  return out;
}

/** The number a reader recognises, e.g. `000001` out of a full question id. */
export function referenceLabel(id: string): string {
  return id.split(".").at(-1) || id;
}
