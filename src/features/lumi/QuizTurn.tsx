import type { ToolCall } from "@/features/settings/aiBridge";
import { parseQuizRequest } from "@/features/lumi/quizSpec";
import { useQuizSession } from "@/features/lumi/useQuizSession";
import { QuizBlock } from "@/features/lumi/QuizBlock";
import { QUIZ_TOOL } from "@/features/lumi/tools";

/** True for the call kind that renders a card instead of a result line. */
export function isQuizCall(call: ToolCall): boolean {
  return call.name === QUIZ_TOOL;
}

/**
 * The card for one `ask_questions` call.
 *
 * It keeps rendering after the set is submitted: the words the model writes in
 * reply are feedback on work that is no longer on screen otherwise, so the
 * marked cards stay put and `locked` turns the footer into a plain summary.
 */
export function QuizTurn({
  call,
  pending,
  onComplete,
}: {
  call: ToolCall;
  /** True while this call is still waiting for the user. */
  pending: boolean;
  onComplete: (callId: string, output: string) => void;
}) {
  const request = parseQuizRequest(call.arguments);
  const session = useQuizSession(
    // The call id is unique per reply, while a model may reuse its own
    // `componentId` ("set_1") in every conversation.
    call.id,
    request?.componentId ?? null,
    request?.questions ?? [],
    (output) => onComplete(call.id, output),
  );

  if (!request) {
    return (
      <p className="my-2 text-sm text-muted-foreground">
        题组格式不完整，这一组未能显示。
      </p>
    );
  }

  return (
    <QuizBlock
      request={request}
      state={session.answers}
      locked={!pending}
      onConfirm={session.confirm}
      onComplete={session.complete}
    />
  );
}
