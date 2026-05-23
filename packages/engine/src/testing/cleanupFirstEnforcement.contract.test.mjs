import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_PACKAGE_ROOT = path.resolve(CURRENT_DIR, "../..");
const ENFORCED_DIRECTORIES = [
  path.resolve(ENGINE_PACKAGE_ROOT, "src"),
  path.resolve(ENGINE_PACKAGE_ROOT, "scripts"),
];
const ENFORCED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);

/**
 * Resolves whether one file should be scanned by cleanup-first enforcement.
 * @param filePath Absolute file path.
 */
function isEnforcedSourceFile(filePath) {
  if (filePath.endsWith(".d.ts")) {
    return false;
  }

  const fileName = path.basename(filePath);
  if (fileName === "cleanupFirstEnforcement.contract.test.mjs") {
    return false;
  }

  return ENFORCED_EXTENSIONS.has(path.extname(filePath));
}

/**
 * Collects enforced source files recursively from one directory.
 * @param directory Absolute directory path.
 */
async function collectEnforcedSourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await collectEnforcedSourceFiles(entryPath);
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && isEnforcedSourceFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Resolves one-based line number for one source offset.
 * @param source Full source text.
 * @param offset Zero-based character offset.
 */
function resolveLineNumberFromOffset(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

/**
 * Resolves cleanup-marker violations for one source file.
 * @param filePath Absolute file path.
 * @param source Full source text.
 */
function resolveForbiddenMarkerViolations(filePath, source) {
  const markerRegex = /\b(TODO|FIXME|HACK)\b/g;
  const violations = [];
  let match = markerRegex.exec(source);

  while (match) {
    const line = resolveLineNumberFromOffset(source, match.index);
    violations.push(
      `${path.relative(ENGINE_PACKAGE_ROOT, filePath)}:${line} contains forbidden marker \"${match[1]}\"`,
    );
    match = markerRegex.exec(source);
  }

  return violations;
}

/**
 * Resolves AI-TEMP contract violations for one source file.
 * @param filePath Absolute file path.
 * @param source Full source text.
 */
function resolveAiTempContractViolations(filePath, source) {
  const lines = source.split("\n");
  const violations = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes("AI-TEMP:")) {
      continue;
    }

    // Allow one AI-TEMP declaration line followed by two rationale lines.
    const tempWindow = lines
      .slice(index, index + 3)
      .join(" ")
      .toLowerCase();
    if (!tempWindow.includes("remove when") || !tempWindow.includes("ref")) {
      const line = index + 1;
      violations.push(
        `${path.relative(ENGINE_PACKAGE_ROOT, filePath)}:${line} has AI-TEMP without \"remove when\" and \"ref\" contract`,
      );
    }
  }

  return violations;
}

/**
 * Resolves all enforced files from configured engine source roots.
 */
async function resolveAllEnforcedFiles() {
  const filesByRoot = await Promise.all(
    ENFORCED_DIRECTORIES.map((directory) =>
      collectEnforcedSourceFiles(directory),
    ),
  );
  return filesByRoot.flat().sort();
}

/**
 * Verifies cleanup-first policy forbids raw TODO/FIXME/HACK markers in engine source.
 */
test("cleanup-first policy forbids raw TODO/FIXME/HACK markers", async () => {
  const enforcedFiles = await resolveAllEnforcedFiles();
  const violations = [];

  for (const filePath of enforcedFiles) {
    const source = await fs.readFile(filePath, "utf8");
    violations.push(...resolveForbiddenMarkerViolations(filePath, source));
  }

  assert.deepEqual(violations, []);
});

/**
 * Verifies AI-TEMP declarations keep explicit removal condition and reference marker.
 */
test("cleanup-first policy enforces AI-TEMP removal contract", async () => {
  const enforcedFiles = await resolveAllEnforcedFiles();
  const violations = [];

  for (const filePath of enforcedFiles) {
    const source = await fs.readFile(filePath, "utf8");
    violations.push(...resolveAiTempContractViolations(filePath, source));
  }

  assert.deepEqual(violations, []);
});
