import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const SOURCE_ROOTS = ["apps/vector-editor-web/src", "apps/playground/src"];
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs)$/;
const PRIVATE_ENGINE_IMPORT_PATTERN =
  /from\s+["'](?:@venus\/engine\/|.*packages\/engine\/src\/)|import\s*\(\s*["'](?:@venus\/engine\/|.*packages\/engine\/src\/)/;

function collectSourceFiles(directory) {
  const absoluteDirectory = path.join(repoRoot, directory);
  if (!fs.existsSync(absoluteDirectory)) {
    return [];
  }
  return fs
    .readdirSync(absoluteDirectory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(path.relative(repoRoot, absolutePath));
      }
      return SOURCE_FILE_PATTERN.test(entry.name) ? [absolutePath] : [];
    });
}

/**
 * Verifies app consumers do not import private engine internals or deep package paths.
 */
test("engine app consumers avoid private engine deep imports", () => {
  const violations = SOURCE_ROOTS.flatMap((sourceRoot) =>
    collectSourceFiles(sourceRoot),
  )
    .filter((filePath) =>
      PRIVATE_ENGINE_IMPORT_PATTERN.test(fs.readFileSync(filePath, "utf8")),
    )
    .map((filePath) =>
      path.relative(repoRoot, filePath).replaceAll(path.sep, "/"),
    )
    .sort();

  assert.deepEqual(violations, []);
});
