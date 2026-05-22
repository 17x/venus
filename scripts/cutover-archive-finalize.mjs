#!/usr/bin/env node

import { existsSync, mkdirSync, renameSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, normalize } from "node:path";

const DEFAULT_CONFIG_PATH = "ai/refactor-vnext/cutover-freeze-roots.json";

/**
 * Intent: resolve CLI flags for cutover archive finalization.
 * @param {string[]} argv Raw argv tokens.
 * @returns {{apply: boolean, allowDirty: boolean, configPath: string}} Parsed options.
 */
function parseFlags(argv) {
  const apply = argv.includes("--apply");
  const allowDirty = argv.includes("--allow-dirty");
  const configIndex = argv.indexOf("--config");
  const configPath =
    configIndex >= 0 && argv[configIndex + 1]
      ? argv[configIndex + 1]
      : DEFAULT_CONFIG_PATH;

  return { apply, allowDirty, configPath };
}

/**
 * Intent: verify repository worktree cleanliness before destructive apply mode.
 * @param {string} repoRoot Absolute repository root path.
 * @returns {boolean} True when worktree has pending changes.
 */
function isWorktreeDirty(repoRoot) {
  const status = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (status.status !== 0) {
    throw new Error("CUTOVER_ARCHIVE_PRECHECK_FAIL: unable to read git status");
  }

  return (status.stdout ?? "").trim().length > 0;
}

/**
 * Intent: normalize and validate one repo-relative archive target from config.
 * @param {string} value Raw config root value.
 * @returns {string} Safe repository-relative path without trailing slash.
 */
function normalizeTarget(value) {
  const normalized = String(value).replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error(
      `CUTOVER_ARCHIVE_PRECHECK_FAIL: invalid frozen root ${value}`,
    );
  }
  return normalized;
}

/**
 * Intent: load archive targets from cutover freeze configuration.
 * @param {string} repoRoot Absolute repository root path.
 * @param {string} configPath Repo-relative or absolute config path.
 * @returns {string[]} Safe repository-relative target paths.
 */
function loadArchiveTargets(repoRoot, configPath) {
  const resolvedConfigPath = configPath.startsWith("/")
    ? configPath
    : join(repoRoot, configPath);

  if (!existsSync(resolvedConfigPath)) {
    throw new Error(
      `CUTOVER_ARCHIVE_PRECHECK_FAIL: freeze config missing at ${resolvedConfigPath}`,
    );
  }

  const text = readFileSync(resolvedConfigPath, "utf8");
  const parsed = JSON.parse(text);
  const roots = Array.isArray(parsed.frozenRoots) ? parsed.frozenRoots : [];
  return roots.map((root) => normalizeTarget(root));
}

/**
 * Intent: build archive move plan under archive/refactor-cutover-YYYY-MM-DD.
 * @param {string} repoRoot Absolute repository root path.
 * @param {string[]} targets Repository-relative source targets.
 * @returns {{archiveRoot: string, moves: Array<{from:string,to:string,label:string}>}} Planned move operations.
 */
function createMovePlan(repoRoot, targets) {
  const dateTag = new Date().toISOString().slice(0, 10);
  const archiveRoot = join(repoRoot, "archive", `refactor-cutover-${dateTag}`);
  const moves = targets.map((target) => {
    const safeTarget = normalize(target).replace(/^\/+/, "");
    return {
      label: safeTarget,
      from: join(repoRoot, safeTarget),
      to: join(archiveRoot, safeTarget),
    };
  });
  return { archiveRoot, moves };
}

/**
 * Intent: validate preconditions for archive move plan before execution.
 * @param {{archiveRoot: string, moves: Array<{from:string,to:string,label:string}>}} plan Archive move plan.
 * @param {string} repoRoot Absolute repository root path.
 * @param {boolean} allowDirty Whether dirty worktree is allowed for apply mode.
 */
function validatePlan(plan, repoRoot, allowDirty) {
  const errors = [];

  for (const move of plan.moves) {
    if (!existsSync(move.from)) {
      errors.push(`source missing: ${move.label}`);
    }
    if (existsSync(move.to)) {
      errors.push(`archive target already exists: ${move.to}`);
    }
  }

  if (!allowDirty && isWorktreeDirty(repoRoot)) {
    errors.push(
      "worktree is dirty; commit/stash first or pass --allow-dirty for explicit override",
    );
  }

  if (errors.length > 0) {
    throw new Error(`CUTOVER_ARCHIVE_PRECHECK_FAIL: ${errors.join("; ")}`);
  }
}

/**
 * Intent: execute planned archive moves in dry-run or apply mode.
 * @param {{archiveRoot: string, moves: Array<{from:string,to:string,label:string}>}} plan Archive move plan.
 * @param {boolean} apply Whether to apply filesystem mutations.
 */
function runPlan(plan, apply) {
  if (!apply) {
    for (const move of plan.moves) {
      console.log(`CUTOVER_ARCHIVE_DRY_RUN ${move.from} -> ${move.to}`);
    }
    return;
  }

  for (const move of plan.moves) {
    mkdirSync(dirname(move.to), { recursive: true });
    renameSync(move.from, move.to);
    console.log(`CUTOVER_ARCHIVE_APPLY_DONE ${move.from} -> ${move.to}`);
  }
}

/**
 * Intent: orchestrate cutover archive finalization command execution.
 */
function main() {
  const repoRoot = process.cwd();
  const { apply, allowDirty, configPath } = parseFlags(process.argv.slice(2));
  const targets = loadArchiveTargets(repoRoot, configPath);
  const plan = createMovePlan(repoRoot, targets);

  if (targets.length === 0) {
    throw new Error(
      "CUTOVER_ARCHIVE_PRECHECK_FAIL: no frozen roots configured",
    );
  }

  // AI-TEMP: keep dry-run default until cutover execution window starts;
  // remove when R5 archive apply is approved as default behavior;
  // ref ai/refactor-vnext/repo-refactor-management.md
  if (apply) {
    validatePlan(plan, repoRoot, allowDirty);
  }

  runPlan(plan, apply);
}

main();
