#!/usr/bin/env node

import { execSync } from "node:child_process";

/**
 * Intent: run one git command and return trimmed stdout, or empty string on failure.
 * @param {string} command Shell command to execute.
 * @returns {string} Command output without trailing whitespace.
 */
function getCommandOutput(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Intent: choose a diff range that works in CI and local runs.
 * @returns {string} Git diff range expression.
 */
function resolveDiffRange() {
  const base = process.env.CR_CHECK_BASE ?? "origin/main";
  const head = process.env.CR_CHECK_HEAD ?? "HEAD";
  const remoteHasBase =
    getCommandOutput(`git rev-parse --verify ${base}`) !== "";
  if (remoteHasBase) {
    return `${base}...${head}`;
  }
  return "HEAD";
}

/**
 * Intent: collect changed files for the selected diff range.
 * @param {string} diffRange Git revision range.
 * @returns {string[]} Changed file paths.
 */
function listChangedFiles(diffRange) {
  const trackedCommand =
    diffRange === "HEAD"
      ? "git diff --name-only HEAD"
      : `git diff --name-only ${diffRange}`;
  const trackedOutput = getCommandOutput(trackedCommand);
  const untrackedOutput = getCommandOutput(
    "git ls-files --others --exclude-standard",
  );

  const trackedFiles = trackedOutput
    ? trackedOutput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  const untrackedFiles = untrackedOutput
    ? untrackedOutput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return Array.from(new Set([...trackedFiles, ...untrackedFiles]));
}

/**
 * Intent: detect whether a changed file touches engine implementation paths.
 * @param {string} filePath Changed file path.
 * @returns {boolean} True when CR is mandatory.
 */
function requiresCrForFile(filePath) {
  const normalizedPath = filePath.replace(/^\.\//, "");
  return (
    normalizedPath.startsWith("packages/engine/src/") ||
    normalizedPath.startsWith("packages/engine/scripts/") ||
    normalizedPath.startsWith("src/") ||
    normalizedPath.startsWith("scripts/")
  );
}

/**
 * Intent: detect whether a changed file qualifies as CR evidence.
 * @param {string} filePath Changed file path.
 * @returns {boolean} True when file is a CR artifact.
 */
function isCrArtifact(filePath) {
  const normalizedPath = filePath.replace(/^\.\//, "");
  return (
    (normalizedPath.startsWith(
      "packages/engine/docs/industrial-refactor/change-requests/",
    ) ||
      normalizedPath.startsWith("docs/industrial-refactor/change-requests/")) &&
    normalizedPath.endsWith(".md")
  );
}

/**
 * Intent: enforce CR artifact presence for engine implementation changes.
 */
function main() {
  const diffRange = resolveDiffRange();
  const changedFiles = listChangedFiles(diffRange);

  const hasEngineImplementationChange = changedFiles.some((filePath) =>
    requiresCrForFile(filePath),
  );
  const hasCrArtifact = changedFiles.some((filePath) => isCrArtifact(filePath));

  if (!hasEngineImplementationChange) {
    console.log("[CR Gate] PASS: no engine implementation change detected.");
    process.exit(0);
  }

  if (hasCrArtifact) {
    console.log("[CR Gate] PASS: CHANGE REQUEST artifact detected.");
    process.exit(0);
  }

  console.error(
    "[CR Gate] FAIL: engine implementation changed but no CR artifact was included.",
  );
  console.error(
    "[CR Gate] Add a file under packages/engine/docs/industrial-refactor/change-requests/*.md",
  );
  process.exit(1);
}

main();
