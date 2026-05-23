import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const MOVED_CORE_MODULE_FILES = [
  "../kernel/core/document/document-store-module.ts",
  "../kernel/core/compiler/incremental-compiler-module.ts",
  "../kernel/core/world/runtime-world-module.ts",
  "../kernel/core/view/viewport-module.ts",
  "../kernel/core/scheduler/frame-budget-module.ts",
];

/**
 * Resolves whether one source file imports adapter/platform ownership paths.
 * @param {string} sourceFileContent Source file text.
 */
function hasForbiddenOwnershipImport(sourceFileContent) {
  const forbiddenImportPattern =
    /^\s*import\s+[^;]*\sfrom\s+["'][^"']*(adapters\/|platform\/)[^"']*["'];?/m;
  return forbiddenImportPattern.test(sourceFileContent);
}

/**
 * Verifies moved core modules do not import adapters or platform ownership paths.
 */
test("moved core modules keep adapter and platform boundaries", async () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const offendingFiles = [];

  for (const relativePath of MOVED_CORE_MODULE_FILES) {
    const absolutePath = path.resolve(currentDir, relativePath);
    const content = await fs.readFile(absolutePath, "utf8");
    if (hasForbiddenOwnershipImport(content)) {
      offendingFiles.push(relativePath);
    }
  }

  assert.deepEqual(
    offendingFiles,
    [],
    "moved core modules must not import adapters or platform ownership paths",
  );
});
