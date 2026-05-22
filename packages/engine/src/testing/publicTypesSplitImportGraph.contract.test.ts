import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves absolute path to split public-types folder.
 */
function resolvePublicTypesRoot(): string {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(testDir, "../api/public-types");
}

/**
 * Collects TypeScript files under one root path in deterministic lexical order.
 * @param root Absolute directory path to traverse.
 */
async function collectTypeScriptFiles(root: string): Promise<readonly string[]> {
  const collected: string[] = [];

  /**
   * Walks one directory recursively and appends .ts files.
   * @param currentDir Absolute directory path currently visited.
   */
  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.resolve(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".ts")) {
        collected.push(absolutePath);
      }
    }
  }

  await walk(root);
  collected.sort((left, right) => left.localeCompare(right));
  return collected;
}

/**
 * Verifies split public-types modules do not re-import the parent public-types barrel.
 */
test("split public-types modules never import ../public-types barrel", async () => {
  const publicTypesRoot = resolvePublicTypesRoot();
  const files = await collectTypeScriptFiles(publicTypesRoot);
  assert.equal(files.length > 0, true, "split public-types folder should contain TypeScript modules");

  // Guards against circular type graph regressions introduced by barrel back-references.
  const forbiddenPattern = /from\s+["']\.\.\/public-types["']/;
  for (const filePath of files) {
    const content = await fs.readFile(filePath, "utf8");
    assert.equal(
      forbiddenPattern.test(content),
      false,
      `${path.relative(publicTypesRoot, filePath)} must not import ../public-types`,
    );
  }
});
