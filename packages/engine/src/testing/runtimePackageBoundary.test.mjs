import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const EXPECTED_RUNTIME_EXTERNAL_IMPORT_FILES = [].sort();

/**
 * Recursively collects source files under one directory.
 * @param rootDir Directory to scan.
 * @returns Relative source file paths rooted at rootDir.
 */
async function collectSourceFiles(rootDir) {
  const collected = [];

  /**
   * Walks one directory and appends matching source files.
   * @param dirPath Directory path to walk.
   */
  async function walk(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "testing") {
          continue;
        }
        await walk(absolutePath);
        continue;
      }

      if (!entry.name.endsWith(".ts")) {
        continue;
      }

      collected.push(path.relative(rootDir, absolutePath));
    }
  }

  await walk(rootDir);
  return collected.sort();
}

/**
 * Resolves whether one source file contains a runtime import from the external bridge package.
 * @param sourceFileContent File content to inspect.
 * @returns True when at least one runtime (non-type) package import exists.
 */
function hasRuntimePackageImport(sourceFileContent) {
  const runtimeImportPattern =
    /^\s*import\s+(?!type\b)[^;]*\sfrom\s+["']@venus\/engine-legacy["'];?/m;
  return runtimeImportPattern.test(sourceFileContent);
}

/**
 * Resolves whether one source file contains a direct runtime re-export from the external bridge package.
 * @param sourceFileContent File content to inspect.
 * @returns True when at least one direct runtime re-export exists.
 */
function hasDirectRuntimePackageReExport(sourceFileContent) {
  const runtimeReExportPattern =
    /^\s*export\s+(?!type\b)\{[^}]*\}\s*from\s*["']@venus\/engine-legacy["'];?/m;
  return runtimeReExportPattern.test(sourceFileContent);
}

/**
 * Ensures canonical engine source does not reintroduce direct runtime re-exports from external package root.
 */
test("canonical source forbids direct runtime package re-exports", async () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const sourceRoot = path.resolve(currentDir, "..");
  const sourceFiles = await collectSourceFiles(sourceRoot);

  const offendingFiles = [];
  for (const relativePath of sourceFiles) {
    const absolutePath = path.resolve(sourceRoot, relativePath);
    const content = await fs.readFile(absolutePath, "utf8");
    if (hasDirectRuntimePackageReExport(content)) {
      offendingFiles.push(relativePath);
    }
  }

  assert.deepEqual(
    offendingFiles,
    [],
    "direct runtime re-exports from @venus/engine-legacy are forbidden in canonical source",
  );
});

/**
 * Locks current runtime external-import inventory so dependency surface can only shrink intentionally.
 */
test("canonical source keeps runtime package import inventory explicit", async () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const sourceRoot = path.resolve(currentDir, "..");
  const sourceFiles = await collectSourceFiles(sourceRoot);

  const actualRuntimeImportFiles = [];
  for (const relativePath of sourceFiles) {
    const absolutePath = path.resolve(sourceRoot, relativePath);
    const content = await fs.readFile(absolutePath, "utf8");
    if (hasRuntimePackageImport(content)) {
      actualRuntimeImportFiles.push(relativePath);
    }
  }

  assert.deepEqual(
    actualRuntimeImportFiles.sort(),
    EXPECTED_RUNTIME_EXTERNAL_IMPORT_FILES,
    "runtime @venus/engine-legacy import inventory changed; update this list only when boundary scope intentionally shrinks",
  );
});
