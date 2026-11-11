import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "@/app/shell/windowControls";

/** One card on the shelf: the data side of a learning package. */
export interface Workspace {
  id: string;
  packageId: string;
  packageVersion: string;
  name: string;
  rootPath: string;
  coverPath: string | null;
  accent: string | null;
  tags: string[];
  installedAt: number;
  lastOpenedAt: number;
  orphaned: boolean;
}

export interface PackageSummary {
  id: string;
  name: string;
  version: string;
  description: string;
  subject: string;
  tags: string[];
  author: string;
  accent: string | null;
  coverFile: string | null;
  coverAlt: string | null;
  focus: number[] | null;
}

export interface ContentStats {
  chapters: number;
  points: number;
  questions: number;
  relations: number;
}

export interface PackageChapter {
  id: string;
  name: string;
  summary: string;
  order: number;
  pointIds: string[];
}

export interface PackagePoint {
  id: string;
  name: string;
  chapterId: string;
  summary: string;
  body: string;
  difficulty: number;
  examImportance: string;
  objectives: string[];
  prerequisites: string[];
  tags: string[];
  sources: string[];
}

export interface PackageQuestion {
  id: string;
  type: string;
  content: string;
  options: { key: string; content: string }[];
  answerType: string;
  answer: string[];
  knowledgePoints: string[];
  tags: string[];
  difficulty: number;
  status: string;
  sourceType: string;
  sourceId: string | null;
  estimatedMinutes: number | null;
}

export interface PackageRelation {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
}

export interface PackageContent {
  manifest: PackageSummary;
  chapters: PackageChapter[];
  points: PackagePoint[];
  questions: PackageQuestion[];
  relations: PackageRelation[];
  tags: { id: string; name: string }[];
  sources: { id: string; title: string; license: string }[];
  stats: ContentStats;
}

export interface CheckLine {
  key: string;
  label: string;
  ok: boolean;
  details: string[];
}

export interface ValidationReport {
  file: string;
  ok: boolean;
  checks: CheckLine[];
  summary: PackageSummary | null;
  stats: ContentStats | null;
  update: boolean;
  staging: string | null;
}

// The browser preview has no filesystem and no database, so every call here
// degrades to an empty result rather than throwing on a page load.
export async function listWorkspaces(): Promise<Workspace[]> {
  if (!isTauriRuntime) return [];
  return invoke<Workspace[]>("workspace_list");
}

export async function workspaceContent(
  workspaceId: string,
): Promise<PackageContent | null> {
  if (!isTauriRuntime) return null;
  try {
    return await invoke<PackageContent>("workspace_content", { workspaceId });
  } catch {
    return null;
  }
}

export async function touchWorkspace(workspaceId: string): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("workspace_touch", { workspaceId });
}

export async function removeWorkspace(
  workspaceId: string,
  deleteData: boolean,
): Promise<void> {
  if (!isTauriRuntime) return;
  await invoke("workspace_remove", { workspaceId, deleteData });
}

export async function inspectPackage(path: string): Promise<ValidationReport> {
  return invoke<ValidationReport>("package_inspect", { path });
}

export async function installPackage(
  staging: string,
  update: boolean,
): Promise<Workspace> {
  return invoke<Workspace>("package_install", { staging, update });
}

export async function cancelImport(staging: string): Promise<void> {
  if (!isTauriRuntime || !staging) return;
  await invoke("package_cancel", { staging });
}

export async function exportPackage(
  workspaceId: string,
  target: string,
): Promise<number> {
  return invoke<number>("package_export", { workspaceId, target });
}

/** One figure from a package's `media/` directory, as a data URI. */
export async function mediaData(
  workspaceId: string,
  path: string,
): Promise<string | null> {
  if (!isTauriRuntime) return null;
  try {
    return await invoke<string>("package_media_data", { workspaceId, path });
  } catch {
    return null;
  }
}

/** Cover bytes as a data URI; the browser preview simply has none. */
export async function coverData(
  workspaceId: string,
  coverPath: string,
): Promise<string | null> {
  if (!isTauriRuntime) return null;
  try {
    return await invoke<string>("package_cover_data", { workspaceId, coverPath });
  } catch {
    return null;
  }
}
