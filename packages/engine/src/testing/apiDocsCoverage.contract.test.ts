import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves absolute docs root for @venus/engine from test file location.
 */
function resolveEngineDocsRoot(): string {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(testDir, "../../docs");
}

/**
 * Reads one UTF-8 markdown file.
 * @param filePath Absolute markdown file path.
 */
async function readMarkdown(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

/**
 * Collects markdown file paths below one docs language root using forward-slash separators.
 * @param root Absolute language root path, for example docs/en or docs/cn.
 */
async function collectMarkdownPaths(root: string): Promise<readonly string[]> {
  const collected: string[] = [];

  /**
   * Recursively traverses docs directories and accumulates markdown file paths.
   * @param currentDir Absolute directory path currently being traversed.
   */
  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.resolve(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const relativePath = path
        .relative(root, absolutePath)
        .split(path.sep)
        .join("/");
      collected.push(relativePath);
    }
  }

  await walk(root);
  return collected.sort((left, right) => left.localeCompare(right));
}

/**
 * Verifies canonical EN/CN API docs pairs exist and keep required structural markers.
 */
test("api docs coverage and EN/CN parity baseline", async () => {
  const docsRoot = resolveEngineDocsRoot();
  const [enMarkdownPaths, cnMarkdownPaths] = await Promise.all([
    collectMarkdownPaths(path.resolve(docsRoot, "en")),
    collectMarkdownPaths(path.resolve(docsRoot, "cn")),
  ]);

  assert.deepEqual(
    enMarkdownPaths,
    cnMarkdownPaths,
    "docs/en and docs/cn markdown trees must stay isomorphic",
  );

  const pairs: ReadonlyArray<{ en: string; cn: string; markers: readonly string[] }> = [
    {
      en: "en/api/developer-api.md",
      cn: "cn/api/developer-api.md",
      markers: ["createEngine(options)", "Errors", "engine.pick(point, options)"],
    },
    {
      en: "en/api/runtime-api.md",
      cn: "cn/api/runtime-api.md",
      markers: ["engine.runtime.compileWorld", "engine.runtime.submit", "Runtime API"],
    },
    {
      en: "en/api/capability-api.md",
      cn: "cn/api/capability-api.md",
      markers: ["engine.capability.geometry.setModel", "engine.capability.replay.run"],
    },
    {
      en: "en/api/event-api.md",
      cn: "cn/api/event-api.md",
      markers: [
        "engine.events.on",
        "Event Envelope",
        "engine.lifecycle.beforeMount",
        "engine.view.viewportResized",
        "engine.streaming.backpressure",
        "engine.diagnostics.traceReady",
        "engine.diagnostics.captureReady",
        "engine.diagnostics.error",
        "engine.replay.started",
        "engine.replay.completed",
        "engine.replay.failed",
        "engine.render.frameCompleted",
      ],
    },
    {
      en: "en/api/runtime-governance.md",
      cn: "cn/api/runtime-governance.md",
      markers: [
        "engine.extension.register",
        "engine.hooks.beforeCompile",
        "engine.scheduler.schedule",
        "engine.security.setTrustLevel",
      ],
    },
    {
      en: "en/backends/backend-capability-matrix.md",
      cn: "cn/backends/backend-capability-matrix.md",
      markers: ["Backend Profiles", "Feature Matrix", "Selection Policy"],
    },
    {
      en: "en/editor-integration/interaction-primitives.md",
      cn: "cn/editor-integration/interaction-primitives.md",
      markers: ["engine.pick(point, options)", "Overlay APIs", "Transform Preview APIs"],
    },
    {
      en: "en/migration/app-adapter-migration.md",
      cn: "cn/migration/app-adapter-migration.md",
      markers: ["Migration Goal", "Step-by-Step Migration", "Canonical Readiness Criteria"],
    },
  ];

  for (const pair of pairs) {
    const enPath = path.resolve(docsRoot, pair.en);
    const cnPath = path.resolve(docsRoot, pair.cn);

    const [enContent, cnContent] = await Promise.all([
      readMarkdown(enPath),
      readMarkdown(cnPath),
    ]);

    assert.ok(enContent.length > 400, `${pair.en} should be non-trivial official docs content`);
    assert.ok(cnContent.length > 400, `${pair.cn} should be non-trivial official docs content`);

    for (const marker of pair.markers) {
      assert.ok(enContent.includes(marker), `${pair.en} missing marker: ${marker}`);
    }
  }
});
