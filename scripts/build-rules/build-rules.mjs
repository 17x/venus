#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const packageJsonPath = path.join(repoRoot, "package.json");

const REQUIRED_SCRIPTS = [
  "dev",
  "build",
  "typecheck",
  "lint",
  "test",
  "governance:check",
  "governance:file-shape",
  "governance:machine-check",
  "build:rules",
];

const DEPRECATED_SCRIPTS = ["dev vector", "dev playground", "cpr"];

const REQUIRED_COLON_PREFIXES = [
  "dev:",
  "governance:",
  "build:",
  "engine:",
  "ai:",
  "perf:",
  "gh:",
];

const ALLOWED_BARE_SCRIPTS = new Set([
  "init:workspace",
  "dev",
  "build",
  "lint",
  "typecheck",
  "test",
]);

/**
 * Reads and parses root package.json scripts section.
 * @returns {Record<string, string>}
 */
function readRootScripts() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return packageJson.scripts ?? {};
}

/**
 * Validates script naming and required/deprecated script policy.
 * @param {Record<string, string>} scripts Root scripts map.
 * @returns {{ok: boolean, issues: string[]}}
 */
function validateBuildRules(scripts) {
  const issues = [];

  // Enforce colon-style command taxonomy to avoid script-name entropy.
  for (const name of Object.keys(scripts)) {
    if (name.includes(" ")) {
      issues.push(`script name contains space: ${name}`);
    }

    if (name.trim() !== name) {
      issues.push(`script name contains leading/trailing whitespace: ${name}`);
    }

    const hasKnownPrefix = REQUIRED_COLON_PREFIXES.some((prefix) =>
      name.startsWith(prefix),
    );
    if (!hasKnownPrefix && !ALLOWED_BARE_SCRIPTS.has(name)) {
      issues.push(`script name outside naming taxonomy: ${name}`);
    }
  }

  for (const required of REQUIRED_SCRIPTS) {
    if (!(required in scripts)) {
      issues.push(`missing required script: ${required}`);
    }
  }

  for (const deprecated of DEPRECATED_SCRIPTS) {
    if (deprecated in scripts) {
      issues.push(`deprecated script must be removed: ${deprecated}`);
    }
  }

  // Ensure release-level loops include machine governance gate.
  const releaseLoop = scripts["ai:release-loop"] ?? "";
  if (
    releaseLoop.length > 0 &&
    !releaseLoop.includes("governance:machine-check")
  ) {
    issues.push("ai:release-loop must include governance:machine-check");
  }

  if (releaseLoop.length > 0 && !releaseLoop.includes("build:rules")) {
    issues.push("ai:release-loop must include build:rules");
  }

  const fastLoop = scripts["ai:fast-loop"] ?? "";
  if (fastLoop.length > 0 && !fastLoop.includes("governance:file-shape")) {
    issues.push("ai:fast-loop must include governance:file-shape");
  }

  const initWorkspace = scripts["init:workspace"] ?? "";
  if (
    initWorkspace.length > 0 &&
    !initWorkspace.includes("governance:machine-check")
  ) {
    issues.push("init:workspace must include governance:machine-check");
  }
  if (initWorkspace.length > 0 && !initWorkspace.includes("build:rules")) {
    issues.push("init:workspace must include build:rules");
  }

  const buildRepo = scripts["build:repo"] ?? "";
  if (buildRepo.length > 0 && !buildRepo.includes("governance:machine-check")) {
    issues.push("build:repo must include governance:machine-check");
  }
  if (buildRepo.length > 0 && !buildRepo.includes("build:rules")) {
    issues.push("build:repo must include build:rules");
  }

  for (const [name, command] of Object.entries(scripts)) {
    if (command.includes("scripts/module-governance-check.mjs")) {
      issues.push(`${name} uses deprecated module-governance-check path`);
    }
    if (command.includes("scripts/file-shape-guard.mjs")) {
      issues.push(`${name} uses deprecated file-shape-guard path`);
    }
    if (command.includes("scripts/module-governance-check.test.mjs")) {
      issues.push(`${name} uses deprecated module-governance-check test path`);
    }
  }

  return { ok: issues.length === 0, issues };
}

const scripts = readRootScripts();
const result = validateBuildRules(scripts);

if (!result.ok) {
  for (const issue of result.issues) {
    console.error(`[build-rules:error] ${issue}`);
  }
  process.exit(1);
}

console.log("[build-rules] ok");
