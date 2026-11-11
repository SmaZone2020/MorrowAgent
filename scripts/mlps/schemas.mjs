import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Every schema this validator knows about, keyed by the file it lives in. */
const SCHEMAS = [
  "cover.schema.json",
  "manifest.schema.json",
  "knowledge.schema.json",
  "knowledge-index.schema.json",
  "question.schema.json",
  "question-index.schema.json",
  "solution.schema.json",
  "solution-index.schema.json",
  "relation.schema.json",
  "taxonomy.schema.json",
  "error-types.schema.json",
  "sources.schema.json",
];

export function formatErrors(errors) {
  return (errors ?? [])
    .map((error) => {
      const at = error.instancePath || "(root)";
      return `    ${at} ${error.message}`;
    })
    .join("\n");
}

/**
 * Compiles every schema up front. They reference each other by `$id`, so the
 * whole set is registered before any of them is used for validation.
 */
export function buildValidators(schemaDir) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
  });
  addFormats(ajv);

  const sources = new Map();
  for (const name of SCHEMAS) {
    const schema = JSON.parse(readFileSync(join(schemaDir, name), "utf8"));
    ajv.addSchema(schema);
    sources.set(name, schema);
  }

  const compile = (name) => ajv.getSchema(sources.get(name).$id);

  return {
    manifest: compile("manifest.schema.json"),
    knowledge: compile("knowledge.schema.json"),
    knowledgeIndex: compile("knowledge-index.schema.json"),
    question: compile("question.schema.json"),
    questionIndex: compile("question-index.schema.json"),
    solution: compile("solution.schema.json"),
    solutionIndex: compile("solution-index.schema.json"),
    relation: compile("relation.schema.json"),
    taxonomy: compile("taxonomy.schema.json"),
    errorTypes: compile("error-types.schema.json"),
    sources: compile("sources.schema.json"),
  };
}
