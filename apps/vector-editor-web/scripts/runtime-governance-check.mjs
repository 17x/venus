#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Declares one governance violation emitted by runtime governance checks.
 */
class GovernanceViolation {
  /**
   * Creates one governance violation record.
   * @param {string} ruleId Stable rule identifier.
   * @param {string} filePath Workspace-relative file path.
   * @param {string} detail Human-readable violation detail.
   */
  constructor(ruleId, filePath, detail) {
    this.ruleId = ruleId;
    this.filePath = filePath;
    this.detail = detail;
  }
}

/**
 * Resolves absolute app root from this script file location.
 * @returns {string} Absolute app root path.
 */
function resolveAppRoot() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, "..");
}

/**
 * Collects all files under one directory recursively.
 * @param {string} dir Absolute directory to traverse.
 * @returns {string[]} Absolute file paths.
 */
function collectFilesRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursively(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

/**
 * Determines whether one path is a TypeScript runtime source file.
 * @param {string} filePath Absolute file path.
 * @returns {boolean} True when file is a TS/TSX runtime source.
 */
function isRuntimeSourceFile(filePath) {
  return /\/src\/runtime\/.+\.(ts|tsx)$/.test(filePath);
}

/**
 * Determines whether one path is the runtime engine bridge folder.
 * @param {string} filePath Absolute file path.
 * @returns {boolean} True when file belongs to runtime/engine-bridge.
 */
function isEngineBridgeFile(filePath) {
  return /\/src\/runtime\/engine-bridge\//.test(filePath);
}

/**
 * Checks runtime files for illegal direct engine API imports outside engine bridge boundary.
 * @param {string[]} files Absolute file paths.
 * @param {string} appRoot Absolute app root for relative path rendering.
 * @returns {GovernanceViolation[]} Violation list.
 */
function checkEngineApiBoundary(files, appRoot) {
  const violations = [];

  for (const filePath of files) {
    if (!isRuntimeSourceFile(filePath) || isEngineBridgeFile(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const relPath = path.relative(appRoot, filePath);

    if (
      content.includes("'@venus/engine'") ||
      content.includes('"@venus/engine"')
    ) {
      violations.push(
        new GovernanceViolation(
          "runtime-engine-api-boundary",
          relPath,
          "direct @venus/engine import is forbidden outside src/runtime/engine-bridge/",
        ),
      );
    }

    if (content.includes("/engine-bridge/internal/")) {
      violations.push(
        new GovernanceViolation(
          "runtime-engine-internal-boundary",
          relPath,
          "imports from runtime/engine-bridge/internal are forbidden outside engine-bridge",
        ),
      );
    }
  }

  return violations;
}

/**
 * Checks file naming and placement policy for disallowed _test_ pattern.
 * @param {string[]} files Absolute file paths.
 * @param {string} appRoot Absolute app root for relative path rendering.
 * @returns {GovernanceViolation[]} Violation list.
 */
function checkTestNamingPolicy(files, appRoot) {
  const violations = [];

  for (const filePath of files) {
    const relPath = path.relative(appRoot, filePath);

    if (/src\/runtime\/.+\/__tests__\//.test(relPath)) {
      violations.push(
        new GovernanceViolation(
          "runtime-test-folder-naming",
          relPath,
          "forbidden __tests__ folder naming detected under runtime; use tests/ folder naming",
        ),
      );
    }

    if (/_test_/i.test(relPath) || /_test\./i.test(relPath)) {
      violations.push(
        new GovernanceViolation(
          "runtime-test-naming",
          relPath,
          "disallowed _test_ naming detected; use .test.ts naming and tests/ folder placement",
        ),
      );
    }
  }

  return violations;
}

/**
 * Prints one compact governance report and exits with proper status.
 * @param {GovernanceViolation[]} violations Collected governance violations.
 */
function finalizeGovernanceReport(violations) {
  if (violations.length === 0) {
    console.log("[runtime-governance] ok");
    return;
  }

  for (const violation of violations) {
    console.error(
      `[runtime-governance:error] ${violation.ruleId} ${violation.filePath}: ${violation.detail}`,
    );
  }

  process.exit(1);
}

/**
 * Runs runtime governance checks for engine API boundary and test naming policy.
 */
function main() {
  const appRoot = resolveAppRoot();
  const srcRoot = path.join(appRoot, "src");
  const files = collectFilesRecursively(srcRoot);

  const violations = [
    ...checkEngineApiBoundary(files, appRoot),
    ...checkTestNamingPolicy(files, appRoot),
  ];

  finalizeGovernanceReport(violations);
}

main();
