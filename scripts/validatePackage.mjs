#!/usr/bin/env node
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildValidators } from "./mlps/schemas.mjs";
import { describeReport, validatePackage } from "./mlps/validatePackage.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const schemaDir = resolve(projectRoot, "schemas", "mlps");

const target = process.argv[2];
if (!target) {
  console.error("用法：node scripts/validatePackage.mjs <学习包目录>");
  process.exit(2);
}

const validators = buildValidators(schemaDir);
const report = validatePackage(resolve(target), { validators });

console.log(describeReport(report));
process.exit(report.ok ? 0 : 1);
