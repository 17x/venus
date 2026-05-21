import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Declares the responsibility category for each runtime top-level value export.
 * Keep this map aligned with src/index.ts and the operations write-back document.
 */
const RUNTIME_EXPORT_RESPONSIBILITY_MAP = {
  createEngine: "runtime",
  ENGINE_RUNTIME_CAPABILITY_SCHEMA_VERSION: "runtime",
  ENGINE_RUNTIME_CAPABILITY_REGISTRY: "runtime",
  ENGINE_RUNTIME_CAPABILITY_MAP: "runtime",
  resolveEngineRuntimeCapabilityDescriptor: "runtime",
  resolveEnginePerformanceOptions: "runtime",
  resolveCreateEnginePolicyBootstrap: "runtime",
  resolveCreateEngineFrame: "runtime",
  createViewportFacade: "runtime",
  panViewportState: "runtime",
  resolveViewportState: "runtime",
  zoomViewportState: "runtime",
  resolveEngineRenderStrategy: "runtime",
  resolveRuntimeFrameController: "runtime",
  createEngineRuntimeFacade: "runtime",
  drawCanvas2DScenePayload: "runtime",
  applyPressureContraction: "runtime",
  resolveEngineFrameBudget: "runtime",
  resolveFrameBudgetPressure: "runtime",
  resolveFrameBudgetPressureReason: "runtime",
  resolveFrameBudgetPressureSignals: "runtime",
  resolvePhaseBudget: "runtime",
  compileDocumentChangeSet: "runtime",
  applyDocumentChangeSet: "runtime",
  createDocumentSnapshot: "runtime",
  createRuntimeWorldFromDocument: "runtime",
  createSpatialIndexFromWorld: "runtime",
  querySpatialCandidates: "runtime",
  createEngineSpatialQueryModule: "runtime",
  resolveSpatialQueryResult: "runtime",
  createDefaultEngineBackendProbes: "runtime",
  resolveAutoBackendMode: "runtime",
  resolveBackendSelectionFromProtocol: "runtime",
  resolveBackendSelection: "runtime",
  resolvePickingHitStack: "runtime",
  createEngineHitTestRayModule: "runtime",
  resolveNearestRayHit: "runtime",
  resolveStagedExecutionSnapshot: "runtime",
  createEngineRuntimeFromProfile: "runtime",
  createTestSurface: "runtime",
  resolveEngineModuleRegistry: "core",
  createEngineDocumentStoreModule: "core",
  createEngineCompilerModule: "core",
  createEngineWorldModule: "core",
  createEngineViewModule: "core",
  createEngineSchedulerModule: "core",
  assertEngineRuntimeProfile: "core",
  resolveEngineCapabilityAccess: "core",
  validateEngineRuntimeProfile: "core",
  createEngineDocumentGraphModule: "core",
  createEngineSceneCompilerModule: "core",
  createEngineRuntimeWorldModule: "core",
  createEngineDirtyPropagationModule: "core",
  createEngineCommandEncoderModule: "core",
  createEngineCommandReplayModule: "core",
  createEngineBackendSelectorModule: "core",
  createEngineProductAdapterBoundaryModule: "core",
  createEnginePublicApiSurfaceModule: "core",
  baseRuntimeProfile: "core",
  engineObservabilityModule: "core",
  engineSchedulerModule: "core",
  engineCompilerModule: "core",
  engineDocumentModule: "core",
  engineWorldModule: "core",
  headlessRuntimeProfile: "core",
  browserPlatformRuntimeProfile: "core",
  engineCompositionModule: "core",
  engineExtractionModule: "core",
  engineRenderPlanningModule: "core",
  engineViewModule: "core",
  headlessReplayScenarioProfile: "scenario",
};

/**
 * Reads the engine top-level barrel text for responsibility contract parsing.
 */
async function readEngineIndexSource() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const indexPath = path.resolve(currentDir, "../index.ts");
  return fs.readFile(indexPath, "utf8");
}

/**
 * Parses value-export names from src/index.ts while excluding type-only exports.
 * @param source Engine index source text.
 */
function parseValueExportNames(source) {
  const exportNames = new Set();

  const functionExportRegex = /^export\s+function\s+([A-Za-z0-9_]+)/gm;
  for (const match of source.matchAll(functionExportRegex)) {
    exportNames.add(match[1]);
  }

  const namedExportRegex =
    /^export\s+(?!type\b)\{([\s\S]*?)\}\s+from\s+"[^"]+";/gm;
  for (const match of source.matchAll(namedExportRegex)) {
    const specifierBlock = match[1] ?? "";
    const specifiers = specifierBlock
      .split(",")
      .map((specifier) => specifier.trim())
      .filter(Boolean);

    for (const specifier of specifiers) {
      const aliasMatch = specifier.match(
        /^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/,
      );
      if (aliasMatch) {
        exportNames.add(aliasMatch[2]);
        continue;
      }
      exportNames.add(specifier);
    }
  }

  return exportNames;
}

/**
 * Verifies every top-level value export has a declared responsibility category.
 */
test("engine top-level value exports require responsibility mapping", async () => {
  const indexSource = await readEngineIndexSource();
  const indexExports = parseValueExportNames(indexSource);
  const mappedExports = new Set(Object.keys(RUNTIME_EXPORT_RESPONSIBILITY_MAP));

  const missingMappings = [...indexExports].filter(
    (name) => !mappedExports.has(name),
  );
  assert.deepEqual(
    missingMappings,
    [],
    `Missing responsibility mapping for top-level exports: ${missingMappings.join(", ")}`,
  );

  const staleMappings = [...mappedExports].filter(
    (name) => !indexExports.has(name),
  );
  assert.deepEqual(
    staleMappings,
    [],
    `Stale responsibility mapping entries not exported from index.ts: ${staleMappings.join(", ")}`,
  );
});

/**
 * Verifies responsibility categories stay inside runtime/core/scenario contract.
 */
test("engine export responsibility categories stay within allowed domains", () => {
  const allowedCategories = new Set(["runtime", "core", "scenario"]);

  for (const [exportName, category] of Object.entries(
    RUNTIME_EXPORT_RESPONSIBILITY_MAP,
  )) {
    assert.equal(
      allowedCategories.has(category),
      true,
      `${exportName} has invalid responsibility category: ${category}`,
    );
  }
});
