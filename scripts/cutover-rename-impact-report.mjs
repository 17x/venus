#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Intent: decide whether one path should be scanned for rename-impact references.
 * @param {string} relativePath Repository-relative file path.
 * @returns {boolean} True when the file belongs to precheck scan scope.
 */
function isScannableFile(relativePath) {
  if (
    relativePath === "package.json" ||
    relativePath === "pnpm-workspace.yaml"
  ) {
    return true;
  }

  if (/^tsconfig.*\.json$/.test(relativePath)) {
    return true;
  }

  if (/^(packages|apps)\/.+\/package\.json$/.test(relativePath)) {
    return true;
  }

  if (
    /^(packages|apps)\/.+\.(ts|tsx|js|mjs)$/.test(relativePath) &&
    !relativePath.includes("/dist/")
  ) {
    return true;
  }

  return false;
}

/**
 * Intent: recursively collect repository-relative files for rename-impact scanning.
 * @param {string} repoRoot Absolute repository root.
 * @returns {string[]} Matched lines in "path:line:text" format.
 */
function collectScannableFiles(repoRoot) {
  const queue = ["."];
  const files = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentPath = current === "." ? repoRoot : join(repoRoot, current);
    const entries = readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const childRelative =
        current === "." ? entry.name : `${current}/${entry.name}`;

      if (entry.isDirectory()) {
        if (
          childRelative === ".git" ||
          childRelative.includes("/.git/") ||
          childRelative.includes("/node_modules/") ||
          childRelative.startsWith("node_modules/")
        ) {
          continue;
        }
        queue.push(childRelative);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (isScannableFile(childRelative)) {
        files.push(childRelative);
      }
    }
  }

  return files.sort();
}

/**
 * Intent: find per-line string matches in one UTF-8 file.
 * @param {string} repoRoot Absolute repository root.
 * @param {string} relativePath Repository-relative file path.
 * @param {string} needle Literal text to match.
 * @returns {string[]} Match lines in "path:line:text" format.
 */
function findLiteralMatches(repoRoot, relativePath, needle) {
  const absolutePath = join(repoRoot, relativePath);
  const stat = statSync(absolutePath);
  if (!stat.isFile()) {
    return [];
  }

  const text = readFileSync(absolutePath, "utf8");
  const lines = text.split("\n");
  const matches = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes(needle)) {
      continue;
    }
    matches.push(`${relativePath}:${index + 1}:${lines[index].trim()}`);
  }

  return matches;
}

/**
 * Intent: collect staged package rename plan candidates from packages/_vnext.
 * @param {string} repoRoot Absolute repository root.
 * @returns {Array<{name: string, from: string, to: string, targetExists: boolean}>} Planned rename steps with collision status.
 */
function resolveRenamePlan(repoRoot) {
  const stagingRoot = join(repoRoot, "packages", "_vnext");
  if (!existsSync(stagingRoot)) {
    throw new Error(
      "CUTOVER_RENAME_IMPACT_FAIL: packages/_vnext does not exist",
    );
  }

  return readdirSync(stagingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const name = entry.name;
      const from = `packages/_vnext/${name}`;
      const to = `packages/${name}`;
      return {
        name,
        from,
        to,
        targetExists: existsSync(join(repoRoot, to)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Intent: verify workspace-level invariants that affect rename-back execution.
 * @param {string} repoRoot Absolute repository root.
 * @returns {{workspaceHasPackagesGlob: boolean}} Workspace invariant summary.
 */
function readWorkspaceInvariants(repoRoot) {
  const workspaceFile = join(repoRoot, "pnpm-workspace.yaml");
  const workspaceText = readFileSync(workspaceFile, "utf8");
  return {
    workspaceHasPackagesGlob: workspaceText.includes('"packages/*"'),
  };
}

/**
 * Intent: collect key rename-impact references across configuration and source files.
 * @param {string} repoRoot Absolute repository root.
 * @returns {{vnextPathRefs: string[], engineLegacyRefs: string[]}} Reference match groups.
 */
function collectImpactReferences(repoRoot) {
  const files = collectScannableFiles(repoRoot);
  const vnextPathRefs = [];
  const engineLegacyRefs = [];

  for (const relativePath of files) {
    vnextPathRefs.push(
      ...findLiteralMatches(repoRoot, relativePath, "packages/_vnext/"),
    );
    engineLegacyRefs.push(
      ...findLiteralMatches(repoRoot, relativePath, "@venus/engine-legacy"),
    );
  }

  return { vnextPathRefs, engineLegacyRefs };
}

/**
 * Intent: print one concise report for cutover rename-impact precheck.
 * @param {{workspaceHasPackagesGlob: boolean}} invariants Workspace invariant summary.
 * @param {Array<{name: string, from: string, to: string, targetExists: boolean}>} plan Rename plan steps.
 * @param {{vnextPathRefs: string[], engineLegacyRefs: string[]}} refs Reference match groups.
 */
function printReport(invariants, plan, refs) {
  console.log("CUTOVER_RENAME_IMPACT_REPORT");
  console.log(`workspace.packagesGlob=${invariants.workspaceHasPackagesGlob}`);
  console.log(`rename.plan.count=${plan.length}`);

  for (const step of plan) {
    console.log(
      `rename.plan ${step.from} -> ${step.to} targetExists=${step.targetExists}`,
    );
  }

  console.log(`refs.vnextPath.count=${refs.vnextPathRefs.length}`);
  for (const line of refs.vnextPathRefs.slice(0, 30)) {
    console.log(`refs.vnextPath ${line}`);
  }

  console.log(`refs.engineLegacy.count=${refs.engineLegacyRefs.length}`);
  for (const line of refs.engineLegacyRefs.slice(0, 30)) {
    console.log(`refs.engineLegacy ${line}`);
  }
}

/**
 * Intent: fail when hard blockers prevent R5 task-5 rename-back update execution.
 * @param {{workspaceHasPackagesGlob: boolean}} invariants Workspace invariant summary.
 * @param {Array<{name: string, from: string, to: string, targetExists: boolean}>} plan Rename plan steps.
 */
function assertNoHardBlockers(invariants, plan) {
  const blockers = [];

  if (!invariants.workspaceHasPackagesGlob) {
    blockers.push("pnpm-workspace.yaml missing packages/* glob");
  }

  if (plan.length === 0) {
    blockers.push("packages/_vnext has no directories for rename-back");
  }

  for (const step of plan) {
    if (step.targetExists) {
      blockers.push(`canonical target already exists for ${step.name}`);
    }
  }

  if (blockers.length > 0) {
    throw new Error(`CUTOVER_RENAME_IMPACT_FAIL: ${blockers.join("; ")}`);
  }
}

/**
 * Intent: execute cutover rename-impact report command for R5 task-5 precheck.
 */
function main() {
  const repoRoot = process.cwd();
  const invariants = readWorkspaceInvariants(repoRoot);
  const plan = resolveRenamePlan(repoRoot);
  const refs = collectImpactReferences(repoRoot);

  printReport(invariants, plan, refs);
  assertNoHardBlockers(invariants, plan);

  console.log("CUTOVER_RENAME_IMPACT_PASS");
}

main();
