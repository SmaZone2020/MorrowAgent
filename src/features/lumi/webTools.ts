import type { ToolDef } from "@/features/settings/aiBridge";

/**
 * The tools the composer's search switch owns.
 *
 * They travel together because `fetch_page` without `web_search` is close to
 * useless — the model would have to guess urls — and leaving one behind would
 * make the switch look broken.
 */
export const WEB_TOOL_NAMES = ["web_search", "fetch_page"];

/**
 * The definitions to send once the switch has had its say.
 *
 * Off removes the tools rather than asking the model not to use them: a tool the
 * endpoint accepts but the user forbade costs a round trip, a billed search, and
 * an explanation of why it happened.
 */
export function withoutWebTools(
  defs: ToolDef[] | undefined,
  searchOn: boolean,
): ToolDef[] | undefined {
  if (!defs || searchOn) return defs;
  return defs.filter((tool) => !WEB_TOOL_NAMES.includes(tool.name));
}
