#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultConfigPath = path.join(
  repoRoot,
  "ai/refactor-vnext/cutover-freeze-roots.json",
);

/**
 * Resolves command options for freeze guard execution.
 * @param {string[]} argv Raw CLI argv.
 * @returns {{baseRef: string, configPath: string}} Parsed guard options.
 */
function resolveOptions(argv) {
  const baseIndex = argv.indexOf("--base");
  const configIndex = argv.indexOf("--config");
  return {
    baseRef: baseIndex >= 0 ? argv[baseIndex + 1] : "origin/main",
    configPath: configIndex >= 0 ? argv[configIndex + 1] : defaultConfigPath,
  };
}

/**
 * Reads frozen roots from configuration file.
 * @param {string} configPath Absolute config path.
 * @returns {string[]} Normalized repository-relative frozen root prefixes.
 */
function resolveFrozenRoots(configPath) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`freeze config not found: ${configPath}`);
  }

  const configText = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(configText);
  const frozenRoots = Array.isArray(parsed.frozenRoots)
    ? parsed.frozenRoots
    : [];

  return frozenRoots
    .map((root) => String(root).replace(/\\/g, "/"))
    .map((root) => (root.endsWith("/") ? root : `${root}/`))
    .filter(Boolean);
}

/**
 * Resolves changed files from git diff against a base ref.
 * @param {string} baseRef Git diff base reference.
 * @returns {string[]} Repository-relative changed file paths.
 */
function resolveChangedFiles(baseRef) {
  const command = `git diff --name-only ${baseRef}...HEAD`;
  try {
    const output = execSync(command, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/\\/g, "/"));
  } catch {
    const fallbackOutput = execSync("git diff --name-only HEAD~1...HEAD", {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    console.warn(
      `[cutover-freeze:warn] base ref not available (${baseRef}); fallback to HEAD~1...HEAD`,
    );
    return fallbackOutput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/\\/g, "/"));
  }
}

/**
 * Runs freeze write guard and blocks modifications under frozen roots.
 * @param {{baseRef: string, configPath: string}} options Guard options.
 * @returns {{ok: boolean, checked: number, blocked: number}} Guard execution result.
 */
function runFreezeGuard(options) {
  const frozenRoots = resolveFrozenRoots(options.configPath);
  const changedFiles = resolveChangedFiles(options.baseRef);
  const blockedFiles = changedFiles.filter((filePath) =>
    frozenRoots.some((root) => filePath.startsWith(root)),
  );

  if (blockedFiles.length > 0) {
    for (const blockedFile of blockedFiles) {
      console.error(`[cutover-freeze:error] blocked write: ${blockedFile}`);
    }
    return {
      ok: false,
      checked: changedFiles.length,
      blocked: blockedFiles.length,
    };
  }

  console.log(
    `[cutover-freeze] ok (checked=${changedFiles.length}, frozenRoots=${frozenRoots.length})`,
  );
  return {
    ok: true,
    checked: changedFiles.length,
    blocked: 0,
  };
}

const options = resolveOptions(process.argv);
const result = runFreezeGuard(options);
if (!result.ok) {
  process.exit(1);
}
