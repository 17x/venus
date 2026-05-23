import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves absolute path for the engine test-system manifest.
 */
function resolveTestSystemManifestPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(
    currentDir,
    "../../ai/engine-test-system-manifest-2026-05-23.json",
  );
}

/**
 * Resolves absolute path for the engine direction ledger.
 */
function resolveEngineLedgerPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(
    currentDir,
    "../../ai/engine-direction-evolution-task-ledger-2026-05-23.md",
  );
}

/**
 * Resolves absolute path for one engine source-relative file.
 * @param relativePath Path relative to packages/engine root.
 */
function resolveEngineFilePath(relativePath) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../..", relativePath);
}

/**
 * Verifies engine test-system manifest includes required test types and existing mapped test files.
 */
test("engine test system manifest keeps required test-type coverage", async () => {
  const manifestPath = resolveTestSystemManifestPath();
  const manifestSource = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestSource);

  const requiredTypeIds = [
    "unit",
    "regression",
    "rendering_snapshot",
    "performance_benchmark",
    "interaction",
    "stress",
    "visual_regression",
    "e2e",
    "fuzz",
    "deterministic",
  ];

  assert.equal(manifest.externalEnvironmentGuards, false);
  assert.equal(typeof manifest.baselineConfig, "string");
  assert.equal(manifest.baselineConfig.length > 0, true);
  const typeIds = manifest.testTypes.map((entry) => entry.id);
  assert.deepEqual(typeIds.sort(), [...requiredTypeIds].sort());

  for (const testType of manifest.testTypes) {
    assert.equal(
      Array.isArray(testType.files),
      true,
      `test type ${testType.id} files must be array`,
    );
    assert.equal(
      testType.files.length > 0,
      true,
      `test type ${testType.id} must map at least one file`,
    );

    for (const filePath of testType.files) {
      const absoluteFilePath = resolveEngineFilePath(filePath);
      const stat = await fs.stat(absoluteFilePath);
      assert.equal(
        stat.isFile(),
        true,
        `mapped test file must exist: ${filePath}`,
      );
    }
  }
});

/**
 * Verifies manifest-linked baseline config exists and includes required baseline domains.
 */
test("engine test system manifest links a complete baseline config", async () => {
  const manifestPath = resolveTestSystemManifestPath();
  const manifestSource = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestSource);

  const baselinePath = resolveEngineFilePath(manifest.baselineConfig);
  const baselineSource = await fs.readFile(baselinePath, "utf8");
  const baseline = JSON.parse(baselineSource);

  assert.equal(typeof baseline.version, "string");
  assert.equal(
    typeof baseline.performanceBenchmark?.framePlanning?.iterations,
    "number",
  );
  assert.equal(
    typeof baseline.performanceBenchmark?.framePlanning
      ?.maxAverageMsPerIteration,
    "number",
  );
  assert.equal(typeof baseline.renderingSnapshot?.proxy?.drawCount, "number");
  assert.equal(
    typeof baseline.renderingSnapshot?.proxy?.visibleCount,
    "number",
  );
  assert.equal(
    typeof baseline.renderingSnapshot?.proxy?.imageMimeType,
    "string",
  );
  assert.equal(
    typeof baseline.renderingSnapshot?.proxy?.imageDataUrl,
    "string",
  );
  assert.equal(
    typeof baseline.visualRegression?.proxy?.vectorDenseSceneSignature,
    "string",
  );
  assert.equal(
    typeof baseline.apiSurface?.topLevelIndexExportSignature,
    "string",
  );
});

/**
 * Verifies all scenario ids are mapped in test-system manifest and each scenario has test-type coverage.
 */
test("engine test system manifest maps scenario coverage for S1-S13", async () => {
  const manifestPath = resolveTestSystemManifestPath();
  const manifestSource = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestSource);

  const scenarioIds = Array.from({ length: 13 }).map(
    (_, index) => `S${index + 1}`,
  );
  const knownTypeIds = new Set(manifest.testTypes.map((entry) => entry.id));

  for (const scenarioId of scenarioIds) {
    const mappedTypes = manifest.scenarioCoverage[scenarioId];
    assert.equal(
      Array.isArray(mappedTypes),
      true,
      `scenario ${scenarioId} must map to test-type array`,
    );
    assert.equal(
      mappedTypes.length > 0,
      true,
      `scenario ${scenarioId} must include at least one test type`,
    );
    for (const typeId of mappedTypes) {
      assert.equal(
        knownTypeIds.has(typeId),
        true,
        `scenario ${scenarioId} references unknown test type ${typeId}`,
      );
    }
  }
});

/**
 * Verifies engine ledger no longer keeps vector-editor external-environment typecheck guard.
 */
test("engine ledger removes vector editor external environment test guard", async () => {
  const ledgerPath = resolveEngineLedgerPath();
  const ledgerSource = await fs.readFile(ledgerPath, "utf8");

  assert.equal(
    ledgerSource.includes("pnpm --filter @venus/vector-editor-web typecheck"),
    false,
    "engine ledger must not enforce vector-editor-web typecheck as external environment guard",
  );
});
