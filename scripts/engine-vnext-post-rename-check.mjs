import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads one UTF-8 text file from repository root.
 * @param repoRoot Absolute repository root path.
 * @param relativePath Repository-relative path.
 */
function readText(repoRoot, relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

/**
 * Verifies workspace and package metadata expose canonical engine path after rename-back.
 * @param repoRoot Absolute repository root path.
 */
function runPostRenameChecks(repoRoot) {
  const workspaceYaml = readText(repoRoot, "pnpm-workspace.yaml");
  const canonicalEnginePackage = readText(
    repoRoot,
    "packages/engine/package.json",
  );

  const errors = [];
  if (!workspaceYaml.includes("packages/*")) {
    errors.push("pnpm-workspace.yaml missing packages/* glob");
  }
  if (!canonicalEnginePackage.includes('"name": "@venus/engine"')) {
    errors.push("packages/engine/package.json name is not @venus/engine");
  }

  if (errors.length > 0) {
    throw new Error(`POST_RENAME_CHECK_FAIL: ${errors.join("; ")}`);
  }
}

/**
 * Entry point for post-rename metadata checks.
 */
function main() {
  const repoRoot = process.cwd();
  runPostRenameChecks(repoRoot);
  console.log("POST_RENAME_CHECK_PASS");
}

main();
