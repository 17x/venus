import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
 * Resolves create-engine contract source for opt-in boundary assertions.
 */
async function readCreateEngineContractsSource() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const contractPath = path.resolve(
    currentDir,
    "../orchestration/api/createEngineContracts.ts",
  );
  return fs.readFile(contractPath, "utf8");
}

/**
 * Resolves API governance documentation source for exception-record assertions.
 */
async function readApiGovernanceDocSource() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const docPath = path.resolve(
    currentDir,
    "../../docs/en/concepts/api-surface-governance.md",
  );
  return fs.readFile(docPath, "utf8");
}

/**
 * Resolves baseline configuration source for test-driven API surface guards.
 */
async function readEngineTestBaselineSource() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const baselinePath = path.resolve(
    currentDir,
    "../../ai/engine-test-baselines-2026-05-23.json",
  );
  return fs.readFile(baselinePath, "utf8");
}

/**
 * Resolves export-from specifiers from TypeScript barrel source text.
 */
function resolveExportSpecifiers(indexSource) {
  const exportFromRegex =
    /export\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g;
  const specifiers = [];
  let match = exportFromRegex.exec(indexSource);

  while (match) {
    if (typeof match[1] === "string") {
      specifiers.push(match[1]);
    }
    match = exportFromRegex.exec(indexSource);
  }

  return specifiers;
}

/**
 * Creates deterministic top-level export signature from normalized export statements.
 */
function resolveTopLevelExportSignature(indexSource) {
  const normalizedExportStatements = indexSource
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export "))
    .join("\n");
  return createHash("sha256").update(normalizedExportStatements).digest("hex");
}

const EXPLICIT_ALLOWED_EXPORTS = new Set(["./testing/createTestSurface"]);

/**
 * Resolves absolute engine source root for layer-boundary checks.
 */
function resolveEngineSourceRoot() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "..");
}

/**
 * Collects TypeScript source files under one canonical layer directory.
 */
async function collectLayerSourceFiles(layerRootPath) {
  const collectedPaths = [];
  const pendingPaths = [layerRootPath];

  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop();
    if (!currentPath) {
      continue;
    }

    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        pendingPaths.push(entryPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.endsWith(".ts")) {
        continue;
      }
      if (entry.name.endsWith(".test.ts")) {
        continue;
      }
      collectedPaths.push(entryPath);
    }
  }

  return collectedPaths;
}

/**
 * Resolves static import specifiers from one TypeScript source string.
 */
function resolveImportSpecifiers(sourceText) {
  const importRegex = /from\s+["']([^"']+)["']/g;
  const specifiers = [];
  let match = importRegex.exec(sourceText);

  while (match) {
    if (typeof match[1] === "string") {
      specifiers.push(match[1]);
    }
    match = importRegex.exec(sourceText);
  }

  return specifiers;
}

/**
 * Normalizes one relative import into canonical source-layer edge id.
 */
function resolveLayerEdgeId({
  sourceRootPath,
  sourceLayer,
  sourceFilePath,
  importSpecifier,
  canonicalLayers,
}) {
  if (!importSpecifier.startsWith(".")) {
    return null;
  }

  const sourceDirectory = path.dirname(sourceFilePath);
  const resolvedTargetPath = path.resolve(sourceDirectory, importSpecifier);
  const relativeTargetPath = path.relative(sourceRootPath, resolvedTargetPath);

  if (relativeTargetPath.startsWith("..")) {
    return null;
  }

  const normalizedRelativeTarget = relativeTargetPath.split(path.sep).join("/");
  const targetLayer = normalizedRelativeTarget.split("/")[0] ?? "";
  if (!canonicalLayers.has(targetLayer)) {
    return null;
  }
  if (targetLayer === sourceLayer) {
    return null;
  }

  return `${sourceLayer}->${targetLayer}:${normalizedRelativeTarget}`;
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

/**
 * Verifies top-level barrel only re-exports from canonical five-layer roots.
 */
test("engine top-level export paths stay within canonical layer roots", async () => {
  const indexSource = await readEngineIndexSource();
  const exportSpecifiers = resolveExportSpecifiers(indexSource);
  const allowedLayerRootPrefixes = [
    "./backend/",
    "./kernel/",
    "./optimization/",
    "./orchestration/",
    "./platform/",
  ];
  for (const exportSpecifier of exportSpecifiers) {
    if (EXPLICIT_ALLOWED_EXPORTS.has(exportSpecifier)) {
      continue;
    }

    const isLayerRootExport = allowedLayerRootPrefixes.some((prefix) =>
      exportSpecifier.startsWith(prefix),
    );

    assert.equal(
      isLayerRootExport,
      true,
      `top-level engine barrel must export only from canonical layer roots: ${exportSpecifier}`,
    );

    assert.equal(
      exportSpecifier.includes("engine-legacy"),
      false,
      `top-level engine barrel must not export legacy path: ${exportSpecifier}`,
    );
    assert.equal(
      exportSpecifier.includes("_vnext"),
      false,
      `top-level engine barrel must not export _vnext path: ${exportSpecifier}`,
    );
  }
});

/**
 * Verifies 2D-related top-level exports are constrained to explicit opt-in surfaces.
 */
test("engine 2d-related exports remain explicit opt-in only", async () => {
  const indexSource = await readEngineIndexSource();
  const exportSpecifiers = resolveExportSpecifiers(indexSource);
  const allowed2DExportSpecifiers = new Set([
    "./orchestration/render-runtime/canvas2dSceneDrawPayload",
  ]);
  const twoDSpecifiers = exportSpecifiers.filter((specifier) =>
    specifier.toLowerCase().includes("2d"),
  );

  for (const twoDSpecifier of twoDSpecifiers) {
    assert.equal(
      allowed2DExportSpecifiers.has(twoDSpecifier),
      true,
      `2D-related export must stay explicit and approved: ${twoDSpecifier}`,
    );
  }
});

/**
 * Verifies create-engine contract does not expose canvas2d hook wiring.
 */
test("create-engine contract does not expose canvas2d integration hook", async () => {
  const contractSource = await readCreateEngineContractsSource();

  assert.equal(
    /canvas2d\?\s*:\s*Canvas2DBackendHooks/.test(contractSource),
    false,
    "create-engine contract must not expose canvas2d hook in public options",
  );
});

/**
 * Verifies explicit non-layer export exceptions are documented in governance docs.
 */
test("explicit top-level export exceptions are documented", async () => {
  const governanceDocSource = await readApiGovernanceDocSource();

  for (const exceptionPath of EXPLICIT_ALLOWED_EXPORTS) {
    assert.equal(
      governanceDocSource.includes(exceptionPath),
      true,
      `API governance doc must record explicit export exception: ${exceptionPath}`,
    );
  }
});

/**
 * Verifies top-level export statements match the versioned API surface signature baseline.
 */
test("engine top-level export surface matches versioned signature baseline", async () => {
  const indexSource = await readEngineIndexSource();
  const baselineSource = await readEngineTestBaselineSource();
  const baseline = JSON.parse(baselineSource);
  const actualSignature = resolveTopLevelExportSignature(indexSource);

  assert.equal(
    actualSignature,
    baseline.apiSurface?.topLevelIndexExportSignature,
    "top-level export surface changed; update API governance decision and baseline intentionally",
  );
});

/**
 * Verifies forbidden cross-layer imports cannot grow beyond acknowledged baseline debt.
 */
test("engine layer imports do not introduce new forbidden cross-layer edges", async () => {
  const sourceRootPath = resolveEngineSourceRoot();
  const canonicalLayerNames = [
    "backend",
    "kernel",
    "optimization",
    "orchestration",
    "platform",
  ];
  const canonicalLayers = new Set(canonicalLayerNames);
  const allowedLayerEdges = new Set([
    "backend->platform",
    "kernel->backend",
    "kernel->platform",
    "optimization->kernel",
    "optimization->backend",
    "optimization->platform",
    "orchestration->kernel",
    "orchestration->optimization",
    "orchestration->backend",
    "orchestration->platform",
  ]);
  const allowedDebtEdges = new Set([]);
  const forbiddenEdgeIds = [];

  for (const sourceLayer of canonicalLayerNames) {
    const sourceLayerPath = path.join(sourceRootPath, sourceLayer);
    const sourceFilePaths = await collectLayerSourceFiles(sourceLayerPath);

    for (const sourceFilePath of sourceFilePaths) {
      const sourceText = await fs.readFile(sourceFilePath, "utf8");
      const importSpecifiers = resolveImportSpecifiers(sourceText);

      for (const importSpecifier of importSpecifiers) {
        const edgeId = resolveLayerEdgeId({
          sourceRootPath,
          sourceLayer,
          sourceFilePath,
          importSpecifier,
          canonicalLayers,
        });

        if (!edgeId) {
          continue;
        }

        const edgeHead = edgeId.split(":")[0] ?? "";
        if (allowedLayerEdges.has(edgeHead)) {
          continue;
        }

        forbiddenEdgeIds.push(edgeId);
      }
    }
  }

  const uniqueForbiddenEdges = [...new Set(forbiddenEdgeIds)].sort();
  const unexpectedForbiddenEdges = uniqueForbiddenEdges.filter(
    (edgeId) => !allowedDebtEdges.has(edgeId),
  );

  assert.deepEqual(
    unexpectedForbiddenEdges,
    [],
    `New forbidden layer-import edges detected: ${unexpectedForbiddenEdges.join(", ")}`,
  );
});
