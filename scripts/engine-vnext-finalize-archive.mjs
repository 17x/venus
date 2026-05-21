import { existsSync, mkdirSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

/**
 * Resolves command-line flags for archive finalization.
 * @param argv Process argv tokens.
 */
function parseFlags(argv) {
  const apply = argv.includes("--apply");
  const allowDirty = argv.includes("--allow-dirty");
  return { apply, allowDirty };
}

/**
 * Resolves whether current git worktree has pending changes.
 * @param repoRoot Absolute repository root.
 */
function isWorktreeDirty(repoRoot) {
  const status = spawnSync("git", ["status", "--porcelain"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (status.status !== 0) {
    throw new Error(
      "FINALIZE_ARCHIVE_PRECHECK_FAIL: unable to read git status",
    );
  }

  return (status.stdout ?? "").trim().length > 0;
}

/**
 * Builds canonical path configuration for the finalize-archive operation.
 * @param repoRoot Absolute repository root.
 */
function createPathConfig(repoRoot) {
  return {
    canonicalPath: join(repoRoot, "packages", "engine"),
    vnextPath: join(repoRoot, "packages", "_vnext", "engine"),
    archiveRoot: join(repoRoot, "archive"),
    archivePath: join(
      repoRoot,
      "archive",
      `engine-vnext-snapshot-${new Date().toISOString().slice(0, 10)}`,
    ),
  };
}

/**
 * Validates preconditions before archive finalization.
 * @param paths Repository path configuration.
 * @param allowDirty Whether dirty worktrees are allowed.
 */
function validatePreconditions(paths, allowDirty) {
  const errors = [];

  if (!existsSync(paths.canonicalPath)) {
    errors.push("canonical engine path is missing at packages/engine");
  }
  if (!existsSync(paths.vnextPath)) {
    errors.push("vNext path is missing at packages/_vnext/engine");
  }
  if (existsSync(paths.archivePath)) {
    errors.push(`archive target already exists: ${paths.archivePath}`);
  }
  if (!allowDirty && isWorktreeDirty(paths.repoRoot)) {
    errors.push(
      "worktree is dirty; commit/stash first or pass --allow-dirty for explicit override",
    );
  }

  if (errors.length > 0) {
    throw new Error(`FINALIZE_ARCHIVE_PRECHECK_FAIL: ${errors.join("; ")}`);
  }
}

/**
 * Runs archive finalization in dry-run or apply mode.
 * @param paths Repository path configuration.
 * @param apply Whether filesystem mutations should be executed.
 */
function runFinalize(paths, apply) {
  if (!apply) {
    console.log(
      `FINALIZE_ARCHIVE_DRY_RUN would move ${paths.vnextPath} -> ${paths.archivePath}`,
    );
    return;
  }

  mkdirSync(paths.archiveRoot, { recursive: true });
  renameSync(paths.vnextPath, paths.archivePath);
  console.log(
    `FINALIZE_ARCHIVE_APPLY_DONE moved ${paths.vnextPath} -> ${paths.archivePath}`,
  );
}

/**
 * Entry point for vNext archive finalization helper.
 */
function main() {
  const { apply, allowDirty } = parseFlags(process.argv.slice(2));
  const repoRoot = process.cwd();
  const paths = {
    ...createPathConfig(repoRoot),
    repoRoot,
  };
  // Only enforce clean worktree in apply mode; dry-run remains lightweight.
  validatePreconditions(paths, apply ? allowDirty : true);
  runFinalize(paths, apply);
}

main();
