#!/usr/bin/env node

import { execSync } from "node:child_process";

/**
 * Intent: run a git command and return trimmed stdout, or empty string when command fails.
 * @param {string} command shell command to execute.
 * @returns {string} command output without trailing whitespace.
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
 * Intent: choose a diff range usable in both CI and local runs.
 * @returns {string} git diff range expression.
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
 * @param {string} diffRange git revision range.
 * @returns {string[]} changed file paths.
 */
function listChangedFiles(diffRange) {
  const command =
    diffRange === "HEAD"
      ? "git diff --name-only HEAD"
      : `git diff --name-only ${diffRange}`;
  const trackedOutput = getCommandOutput(command);
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
 * Intent: determine whether a changed file requires a CR by touching engine implementation paths.
 * @param {string} filePath changed file path.
 * @returns {boolean} true when CR is mandatory for this change path.
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
 * Intent: determine whether a changed file satisfies CR evidence requirement.
 * @param {string} filePath changed file path.
 * @returns {boolean} true when file is a CR artifact.
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
 * Intent: enforce CR presence for non-trivial engine changes.
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
