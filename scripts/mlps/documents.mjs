import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Splits a knowledge document into its YAML front matter and Markdown body.
 * A point whose metadata lives in the body would be two sources of truth, so a
 * missing block is an error rather than an empty object.
 */
export function splitFrontMatter(text) {
  const match = text.match(FRONT_MATTER);
  if (!match) return null;

  try {
    return { data: parseYaml(match[1]) ?? {}, body: match[2] };
  } catch (error) {
    throw new Error(`front matter 解析失败：${error.message}`);
  }
}

export function readFrontMatter(file) {
  return splitFrontMatter(readFileSync(file, "utf8"));
}

export function readYaml(file, label) {
  try {
    return parseYaml(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} 解析失败：${error.message}`);
  }
}

export function readJson(file, label) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} 解析失败：${error.message}`);
  }
}

export function readText(root, path) {
  return readFileSync(join(root, path), "utf8");
}
