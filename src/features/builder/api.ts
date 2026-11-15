import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/**
 * Builder Mode's side of the Rust commands.
 *
 * The project root travels with every call rather than being remembered on the
 * backend: the user may switch folders mid-conversation, and a root cached in
 * process state would silently keep writing into the folder they left.
 */

export interface ToolProbe {
  name: string;
  command: string;
  available: boolean;
  /** First line of the version output; empty when nothing answered. */
  version: string;
}

export interface BuildEnvironment {
  os: string;
  osVersion: string;
  arch: string;
  /** `powershell` on Windows, `bash` elsewhere. */
  shell: string;
  shellPath: string;
  /** The folder the user opened, as a display path. */
  workspace: string;
  tools: ToolProbe[];
}

export interface FileSlice {
  path: string;
  content: string;
  /** 1-based line of the first line in `content`. */
  startLine: number;
  totalLines: number;
  truncated: boolean;
}

export interface DirEntry {
  path: string;
  name: string;
  directory: boolean;
  size: number;
}

export interface DirListing {
  path: string;
  entries: DirEntry[];
  truncated: boolean;
}

export interface ConvertedDocument {
  path: string;
  title: string | null;
  markdown: string;
  truncated: boolean;
}

export interface ShellResult {
  command: string;
  shell: string;
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
}

function requireTauri(): void {
  if (!isTauriRuntime) {
    throw new Error("构建模式需要桌面应用的文件与命令能力。");
  }
}

/** What the machine can run, reported to the model with the prompt. */
export async function detectEnvironment(
  workspace: string,
): Promise<BuildEnvironment> {
  requireTauri();
  return invoke<BuildEnvironment>("builder_detect_env", { workspace });
}

export async function readFile(
  workspace: string,
  path: string,
  offset?: number,
  limit?: number,
): Promise<FileSlice> {
  requireTauri();
  return invoke<FileSlice>("builder_file_read", {
    workspace,
    path,
    offset,
    limit,
  });
}

export async function writeFile(
  workspace: string,
  path: string,
  content: string,
): Promise<string> {
  requireTauri();
  return invoke<string>("builder_file_write", { workspace, path, content });
}

export async function editFile(
  workspace: string,
  path: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): Promise<string> {
  requireTauri();
  return invoke<string>("builder_file_edit", {
    workspace,
    path,
    oldString,
    newString,
    replaceAll,
  });
}

export async function listDirectory(
  workspace: string,
  path = "",
  recursive = false,
): Promise<DirListing> {
  requireTauri();
  return invoke<DirListing>("builder_dir_read", {
    workspace,
    path,
    recursive,
  });
}

/** Converts one document to Markdown. The result is never written to disk. */
export async function convertDocument(
  workspace: string,
  path: string,
): Promise<ConvertedDocument> {
  requireTauri();
  return invoke<ConvertedDocument>("builder_file2md", { workspace, path });
}

/**
 * Runs one command in the workspace. Windows gets PowerShell, everywhere else
 * the user's own bash; the timeout is the backend's, not the caller's.
 */
export async function runShell(
  workspace: string,
  command: string,
): Promise<ShellResult> {
  requireTauri();
  return invoke<ShellResult>("builder_shell", { workspace, command });
}
