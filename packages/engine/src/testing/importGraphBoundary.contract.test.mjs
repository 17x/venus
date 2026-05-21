import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const IMPORT_PATTERN = /^\s*import\s+[^;]*\sfrom\s+["']([^"']+)["'];?/gm;

/**
 * Reads every TypeScript source file below the provided root directory.
 * @param {string} rootDir Absolute source root path.
 * @returns {Promise<string[]>} Absolute file paths.
 */
async function collectTypeScriptFiles(rootDir) {
  const files = [];

  /**
   * Walks directories recursively and accumulates TypeScript files.
   * @param {string} currentDir Absolute directory path to traverse.
   */
  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.endsWith(".ts") || entry.name.endsWith(".d.ts")) {
        continue;
      }
      files.push(absolutePath);
    }
  }

  await walk(rootDir);
  return files;
}

/**
 * Resolves one relative import specifier to a known workspace file path.
 * @param {string} fromFile Absolute importing file path.
 * @param {string} specifier Import specifier.
 * @param {Set<string>} knownFiles Known absolute TypeScript file paths.
 * @returns {string | undefined} Resolved absolute file path when found.
 */
function resolveRelativeImport(fromFile, specifier, knownFiles) {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const fromDir = path.dirname(fromFile);
  const absoluteBase = path.resolve(fromDir, specifier);
  const candidates = [
    absoluteBase,
    `${absoluteBase}.ts`,
    path.join(absoluteBase, "index.ts"),
  ];

  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Parses static import specifiers from source text.
 * @param {string} sourceText File source text.
 * @returns {string[]} Import specifier list.
 */
function parseImportSpecifiers(sourceText) {
  const specifiers = [];
  for (const match of sourceText.matchAll(IMPORT_PATTERN)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

/**
 * Determines whether a source-relative file path belongs to a namespace.
 * @param {string} relativeFilePath File path relative to src root.
 * @param {string} namespace Namespace folder prefix.
 */
function isInNamespace(relativeFilePath, namespace) {
  return relativeFilePath.startsWith(`${namespace}/`);
}

/**
 * Detects whether any file in one namespace can reach any file in another namespace through import edges.
 * @param {Map<string, string[]>} graph Directed import graph keyed by source-relative path.
 * @param {string} fromNamespace Source namespace prefix.
 * @param {string} toNamespace Target namespace prefix.
 * @returns {{hasPath: boolean, witnessPath: string[]}} Reachability result with one witness path.
 */
function findCrossNamespacePath(graph, fromNamespace, toNamespace) {
  const fromNodes = [...graph.keys()].filter((node) =>
    isInNamespace(node, fromNamespace),
  );
  const toNodeSet = new Set(
    [...graph.keys()].filter((node) => isInNamespace(node, toNamespace)),
  );

  for (const start of fromNodes) {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const currentPath = queue.shift();
      if (!currentPath) {
        continue;
      }
      const currentNode = currentPath[currentPath.length - 1];
      if (toNodeSet.has(currentNode)) {
        return {
          hasPath: true,
          witnessPath: currentPath,
        };
      }
      const nextNodes = graph.get(currentNode) ?? [];
      for (const next of nextNodes) {
        if (visited.has(next)) {
          continue;
        }
        visited.add(next);
        queue.push([...currentPath, next]);
      }
    }
  }

  return {
    hasPath: false,
    witnessPath: [],
  };
}

/**
 * Verifies engine import graph keeps core/adapters boundaries isolated in both directions.
 */
test("engine import graph keeps core and adapters isolated", async () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const srcRoot = path.resolve(testDir, "..");
  const allFiles = await collectTypeScriptFiles(srcRoot);
  const knownFileSet = new Set(allFiles);

  const graph = new Map();
  for (const absoluteFile of allFiles) {
    const sourceText = await fs.readFile(absoluteFile, "utf8");
    const relativeSourcePath = path
      .relative(srcRoot, absoluteFile)
      .split(path.sep)
      .join("/");

    const edges = [];
    const specifiers = parseImportSpecifiers(sourceText);
    for (const specifier of specifiers) {
      const resolved = resolveRelativeImport(
        absoluteFile,
        specifier,
        knownFileSet,
      );
      if (!resolved) {
        continue;
      }
      edges.push(path.relative(srcRoot, resolved).split(path.sep).join("/"));
    }

    graph.set(relativeSourcePath, edges);
  }

  const coreToAdapters = findCrossNamespacePath(graph, "core", "adapters");
  const adaptersToCore = findCrossNamespacePath(graph, "adapters", "core");

  assert.equal(
    coreToAdapters.hasPath,
    false,
    `core->adapters path detected: ${coreToAdapters.witnessPath.join(" -> ")}`,
  );
  assert.equal(
    adaptersToCore.hasPath,
    false,
    `adapters->core path detected: ${adaptersToCore.witnessPath.join(" -> ")}`,
  );
});
