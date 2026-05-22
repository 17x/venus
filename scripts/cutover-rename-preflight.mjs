#!/usr/bin/env node

import { existsSync, readdirSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

/**
 * Intent: parse CLI flags for cutover rename preflight.
 * @param {string[]} argv Raw argv tokens.
 * @returns {{apply: boolean, allowDirty: boolean}} Parsed options.
 */
function parseFlags(argv) {
  return {
    apply: argv.includes("--apply"),
    allowDirty: argv.includes("--allow-dirty"),
  };
}

/**
 * Intent: detect whether git worktree has pending changes.
 * @param {string} repoRoot Absolute repository root.
 * @returns {boolean} True when worktree has pending changes.
 */
function isWorktreeDirty(repoRoot) {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error("CUTOVER_RENAME_PRECHECK_FAIL: unable to read git status");
  }
  return (result.stdout ?? "").trim().length > 0;
}

/**
 * Intent: build rename candidates from packages/_vnext to packages/<name>.
 * @param {string} repoRoot Absolute repository root.
 * @returns {Array<{name: string, from: string, to: string}>} Planned rename operations.
 */
function buildRenamePlan(repoRoot) {
  const stagingRoot = join(repoRoot, "packages", "_vnext");
  const canonicalRoot = join(repoRoot, "packages");

  if (!existsSync(stagingRoot)) {
    throw new Error(
      "CUTOVER_RENAME_PRECHECK_FAIL: packages/_vnext does not exist",
    );
  }

  const names = readdirSync(stagingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return names.map((name) => ({
    name,
    from: join(stagingRoot, name),
    to: join(canonicalRoot, name),
  }));
}

/**
 * Intent: validate rename plan invariants before optional apply execution.
 * @param {Array<{name: string, from: string, to: string}>} plan Planned rename operations.
 * @param {string} repoRoot Absolute repository root.
 * @param {boolean} allowDirty Whether dirty worktrees are allowed in apply mode.
 */
function validatePlan(plan, repoRoot, allowDirty) {
  const errors = [];

  if (plan.length === 0) {
    errors.push("packages/_vnext has no package directories to rename");
  }

  for (const step of plan) {
    if (!existsSync(step.from)) {
      errors.push(`staging source missing: ${step.from}`);
    }
    if (existsSync(step.to)) {
      errors.push(`canonical target already exists: ${step.to}`);
    }
  }

  if (!allowDirty && isWorktreeDirty(repoRoot)) {
    errors.push(
      "worktree is dirty; commit/stash first or pass --allow-dirty for explicit override",
    );
  }

  if (errors.length > 0) {
    throw new Error(`CUTOVER_RENAME_PRECHECK_FAIL: ${errors.join("; ")}`);
  }
}

/**
 * Intent: execute rename plan in dry-run mode or apply mode.
 * @param {Array<{name: string, from: string, to: string}>} plan Planned rename operations.
 * @param {boolean} apply Whether filesystem mutations are enabled.
 */
function runPlan(plan, apply) {
  if (!apply) {
    for (const step of plan) {
      console.log(`CUTOVER_RENAME_DRY_RUN ${step.from} -> ${step.to}`);
    }
    return;
  }

  for (const step of plan) {
    renameSync(step.from, step.to);
    console.log(`CUTOVER_RENAME_APPLY_DONE ${step.from} -> ${step.to}`);
  }
}

/**
 * Intent: run cutover rename preflight for R5 rename-back readiness.
 */
function main() {
  const repoRoot = process.cwd();
  const { apply, allowDirty } = parseFlags(process.argv.slice(2));
  const plan = buildRenamePlan(repoRoot);

  // AI-TEMP: keep rename command dry-run by default until cutover execution window is approved;
  // remove when R5 rename-back execution is authorized as standard flow;
  // ref ai/refactor-vnext/repo-refactor-management.md
  if (apply) {
    validatePlan(plan, repoRoot, allowDirty);
  }

  runPlan(plan, apply);
}

main();
