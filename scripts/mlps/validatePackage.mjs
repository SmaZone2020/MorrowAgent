import { existsSync } from "node:fs";
import { join } from "node:path";
import { readText } from "./documents.mjs";
import { checkDirectoryPaths, hashFiles, verifyChecksums } from "./paths.mjs";
import { validateCover, validateDependencies, validateManifest, validateStructure } from "./checks/package.mjs";
import { validateKnowledge } from "./checks/knowledge.mjs";
import { validateQuestions } from "./checks/questions.mjs";
import { validateSolutions } from "./checks/solutions.mjs";
import { validateTaxonomy } from "./checks/taxonomy.mjs";
import { validateLimits, validateSources, validateTagRefs } from "./checks/security.mjs";

/**
 * Validates one extracted learning package.
 *
 * Ordering matters: the manifest decides where everything else lives, so it is
 * read first; the path and extension sweep runs before any content file is
 * opened, so a hostile package cannot make the validator read outside its own
 * directory; checksums come last because they cover the whole tree.
 *
 * The result is a report object rather than a thrown error: the importer needs
 * every problem at once to show the user, not the first one.
 */
export function validatePackage(dir, options = {}) {
  const errors = [];
  const warnings = [];

  const ctx = {
    root: dir,
    validators: options.validators,
    archiveBytes: options.archiveBytes,
    error: (message, details) => {
      errors.push(details ? `${message}\n${details}` : message);
    },
    warn: (message) => warnings.push(message),
    pendingSourceRefs: [],
    pendingTagRefs: [],
    stats: {},
    conceptIds: new Set(),
    questionIds: new Set(),
  };

  validateStructure(ctx);
  validateManifest(ctx);

  if (!ctx.manifest) {
    return finish(ctx, errors, warnings);
  }

  const pathErrors = checkDirectoryPaths(dir);
  for (const message of pathErrors) ctx.error(message);

  const files = hashFiles(dir);
  validateLimits(ctx, files);

  const checksumPath = join(dir, "checksums.sha256");
  if (existsSync(checksumPath)) {
    const declared = readText(dir, "checksums.sha256");
    for (const message of verifyChecksums(dir, declared, files)) ctx.error(message);
  }

  validateCover(ctx);
  validateDependencies(ctx, options.installedPackages);

  validateKnowledge(ctx);
  validateTaxonomy(ctx);
  validateQuestions(ctx);
  validateSolutions(ctx);
  validateSources(ctx);
  validateTagRefs(ctx);

  return finish(ctx, errors, warnings);
}

function finish(ctx, errors, warnings) {
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: ctx.stats,
    manifest: ctx.manifest ?? null,
  };
}

export function describeReport(report) {
  const lines = [];

  for (const message of report.errors) lines.push(`\u2717 ${message}`);
  for (const message of report.warnings) lines.push(`! ${message}`);

  if (report.ok) {
    const { stats } = report;
    lines.push(
      `\u2713 ${stats.packageId}@${stats.packageVersion}：` +
        `${stats.chapters ?? 0} 章、${stats.points ?? 0} 知识点、` +
        `${stats.questions ?? 0} 题、${stats.solutions ?? 0} 份解析、` +
        `${stats.relations ?? 0} 条关系、` +
        `${stats.sources ?? 0} 条来源`,
    );
  }

  return lines.join("\n");
}
