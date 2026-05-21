import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Resolves engine top-level barrel source for export-boundary assertions.
 */
async function readEngineIndexSource() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const indexPath = path.resolve(currentDir, "../index.ts");
  return fs.readFile(indexPath, "utf8");
}

/**
 * Verifies top-level barrel keeps canonical runtime API exports.
 */
test("engine top-level exports keep runtime API surface", async () => {
  const indexSource = await readEngineIndexSource();

  assert.equal(indexSource.includes("export function createEngine("), true);
  assert.equal(indexSource.includes("createEngineRuntimeFacade"), true);
  assert.equal(indexSource.includes("createEngineSpatialQueryModule"), true);
  assert.equal(indexSource.includes("createEngineHitTestRayModule"), true);
});

/**
 * Verifies top-level barrel does not re-expose non-runtime domain helpers.
 */
test("engine top-level exports forbid non-runtime helper surface", async () => {
  const indexSource = await readEngineIndexSource();

  const forbiddenExportNames = [
    "resolveEngineGeometryPayload",
    "isPointInsideEngineClipShape",
    "isPointInsideEngineShapeHitArea",
    "resolveEngineAdaptiveHitTolerance",
    "resolveEngineCanvasLodProfile",
    "resolveEngineMoveSnapPreview",
    "accumulateEnginePointerPanOffset",
    "accumulateEngineWheelPanOffset",
    "createEngineViewportPanOrigin",
    "resolveEngineVisibilityHitTestBudget",
    "resolveEngineWorkerMode",
    "DEFAULT_ENGINE_ZOOM_SESSION",
    "accumulateEngineZoomSession",
    "detectEngineZoomInputSource",
    "getEngineZoomSettleDelay",
    "handleEngineZoomWheel",
    "normalizeEngineZoomDelta",
    "resetEngineZoomSession",
    "createEngineSpatialIndex",
    "createEngineAnimationController",
    "EngineGeometryPayload",
    "ResolveEngineGeometryPayloadOptions",
    "ResolveEngineAdaptiveHitToleranceOptions",
    "EngineNormalizedZoomDelta",
    "EngineZoomInputSource",
    "EngineZoomSessionState",
    "EngineZoomWheelInput",
    "EngineZoomWheelResult",
    "AffineMatrix",
    "NormalizedBounds",
    "ShapeTransformBatchCommand",
    "ShapeTransformBatchItem",
    "EngineAnimationController",
    "EngineEasingDefinition",
    "EngineEasingFunction",
    "vectorEditorRuntimeProfile",
    "vectorDenseSceneScenarioProfile",
    "engineInteractionModule",
    "enginePickingModule",
    "engineSpatialModule",
    "engineVisibilityModule",
    "VECTOR_EDITOR_COMPOSITION_LAYERS",
  ];

  for (const exportName of forbiddenExportNames) {
    assert.equal(
      indexSource.includes(exportName),
      false,
      `top-level engine barrel should not expose ${exportName}`,
    );
  }
});
