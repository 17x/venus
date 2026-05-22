#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Intent: parse command flags for cutover reference rewrite execution.
 * @param {string[]} argv Raw process argv tokens.
 * @returns {{apply: boolean}} Parsed command flags.
 */
function parseFlags(argv) {
  return {
    apply: argv.includes("--apply"),
  };
}

/**
 * Intent: decide whether one repository-relative path is eligible for rewrite scanning.
 * @param {string} relativePath Repository-relative path.
 * @returns {boolean} True when this path is a supported text/config/source file for rewrite.
 */
function isRewriteEligible(relativePath) {
  if (
    relativePath === "package.json" ||
    relativePath === "pnpm-workspace.yaml"
  ) {
    return true;
  }

  if (/^tsconfig.*\.json$/.test(relativePath)) {
    return true;
  }

  if (
    /^(packages|apps)\/.+\/(package\.json|tsconfig.*\.json)$/.test(relativePath)
  ) {
    return true;
  }

  if (/^(packages|apps)\/.+\.(ts|tsx|js|mjs|md)$/.test(relativePath)) {
    return true;
  }

  if (/^ai\/.+\.md$/.test(relativePath)) {
    return true;
  }

  if (/^scripts\/.+\.(mjs|js|ts)$/.test(relativePath)) {
    return true;
  }

  return false;
}

/**
 * Intent: recursively collect all rewrite-eligible files under repository root.
 * @param {string} repoRoot Absolute repository root.
 * @returns {string[]} Sorted list of repository-relative file paths.
 */
function collectEligibleFiles(repoRoot) {
  const queue = ["."];
  const files = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const absolute = current === "." ? repoRoot : join(repoRoot, current);
    const entries = readdirSync(absolute, { withFileTypes: true });

    for (const entry of entries) {
      const relative =
        current === "." ? entry.name : `${current}/${entry.name}`;

      if (entry.isDirectory()) {
        if (
          relative === ".git" ||
          relative.startsWith("node_modules/") ||
          relative.includes("/node_modules/") ||
          relative.startsWith("archive/") ||
          relative.includes("/dist/")
        ) {
          continue;
        }
        queue.push(relative);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (isRewriteEligible(relative)) {
        files.push(relative);
      }
    }
  }

  return files.sort();
}

/**
 * Intent: build literal rename-back path replacements from packages/_vnext contents.
 * @param {string} repoRoot Absolute repository root.
 * @returns {Array<{from: string, to: string}>} Replacement rules.
 */
function buildReplacementRules(repoRoot) {
  const stagingRoot = join(repoRoot, "packages", "_vnext");
  const entries = readdirSync(stagingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((name) => ({
    from: `packages/_vnext/${name}`,
    to: `packages/${name}`,
  }));
}

/**
 * Intent: apply replacement rules to one file and report replacement counts per rule.
 * @param {string} repoRoot Absolute repository root.
 * @param {string} relativePath Repository-relative file path.
 * @param {Array<{from: string, to: string}>} rules Replacement rules.
 * @param {boolean} apply Whether file writes are enabled.
 * @returns {{path: string, changed: boolean, replacementCounts: Array<{from:string,to:string,count:number}>}} Rewrite result.
 */
function rewriteFile(repoRoot, relativePath, rules, apply) {
  const absolutePath = join(repoRoot, relativePath);
  const stat = statSync(absolutePath);
  if (!stat.isFile()) {
    return { path: relativePath, changed: false, replacementCounts: [] };
  }

  const original = readFileSync(absolutePath, "utf8");
  let next = original;
  const replacementCounts = [];

  for (const rule of rules) {
    const count = next.split(rule.from).length - 1;
    if (count > 0) {
      next = next.split(rule.from).join(rule.to);
      replacementCounts.push({ ...rule, count });
    }
  }

  if (next !== original && apply) {
    writeFileSync(absolutePath, next, "utf8");
  }

  return {
    path: relativePath,
    changed: next !== original,
    replacementCounts,
  };
}

/**
 * Intent: execute repository-wide rename-back path rewrite in dry-run or apply mode.
 * @param {string} repoRoot Absolute repository root.
 * @param {boolean} apply Whether file writes are enabled.
 */
function runRewrite(repoRoot, apply) {
  const files = collectEligibleFiles(repoRoot);
  const rules = buildReplacementRules(repoRoot);

  if (rules.length === 0) {
    throw new Error(
      "CUTOVER_REWRITE_FAIL: no packages/_vnext/* directories found",
    );
  }

  let changedFiles = 0;
  let totalReplacements = 0;

  for (const relativePath of files) {
    const result = rewriteFile(repoRoot, relativePath, rules, apply);
    if (!result.changed) {
      continue;
    }

    changedFiles += 1;
    for (const item of result.replacementCounts) {
      totalReplacements += item.count;
      console.log(
        `CUTOVER_REWRITE_MATCH ${result.path} ${item.from} -> ${item.to} count=${item.count}`,
      );
    }
  }

  console.log(
    `CUTOVER_REWRITE_SUMMARY changedFiles=${changedFiles} replacements=${totalReplacements} apply=${apply}`,
  );
}

/**
 * Intent: run cutover reference rewrite command for R5 task-5 execution support.
 */
function main() {
  const repoRoot = process.cwd();
  const { apply } = parseFlags(process.argv.slice(2));

  // AI-TEMP: keep rewrite command dry-run by default during staged cutover preparation;
  // remove when R5 task-5 rewrite is authorized for default apply execution;
  // ref ai/refactor-vnext/repo-refactor-management.md
  runRewrite(repoRoot, apply);
}

main();
