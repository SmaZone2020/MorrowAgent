import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/** Only http(s) ever leaves the app; anything else stays plain text. */
export function isExternalHref(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** The host is what a reader actually judges before clicking. */
export function hostOf(href: string): string {
  try {
    return new URL(href).host;
  } catch {
    return href;
  }
}

/**
 * Hands a link to the system browser. The Rust side re-checks the scheme, so a
 * `file:` or `javascript:` URL can never reach the shell even if one slips
 * through the parser. Returns false when no browser could be reached.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  const href = url.trim();
  if (!isExternalHref(href)) return false;
  if (!isTauriRuntime) {
    window.open(href, "_blank", "noopener,noreferrer");
    return true;
  }
  try {
    await invoke("open_external_url", { url: href });
    return true;
  } catch {
    return false;
  }
}
