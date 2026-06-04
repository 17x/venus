import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDocumentImageAssetUrlMap,
  createEngineSceneAdapterDiagnosticsReport,
  createEngineSceneFromRuntimeSnapshot,
  ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX,
} from '../../../runtime/presets/engineSceneAdapter/engineSceneAdapter.ts'
import {resolveRuntimeRenderPolicy} from '../../../runtime/engine-bridge/renderPolicy.ts'
import {resolveHitGeometryV2} from '../../../runtime/engine-bridge/engineContractAdapters.ts'
import type {EditorDocument} from '../../../runtime/model/index.ts'
import type {SceneShapeSnapshot} from '../../../runtime/shared-memory/index.ts'
import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

function createShapeSnapshotsFromDocument(document: EditorDocument): SceneShapeSnapshot[] {
  return document.shapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    isHovered: false,
    isSelected: false,
    pathPointCount: shape.points?.length,
    pathBezierPointCount: shape.bezierPoints?.length,
  }))
}

// ---------------------------------------------------------------------------
// TC-01: Hit Geometry Contract
// ---------------------------------------------------------------------------

test('TC-01.1 resolveHitGeometryV2 returns stable apiVersion with empty nodes', () => {
  const result = resolveHitGeometryV2({nodes: []})

  assert.equal(result.apiVersion, '2.0.0')
})

test('TC-01.2 resolveHitGeometryV2 diagnostics contain candidateCount/filteredCount/costMs', () => {
  const result = resolveHitGeometryV2({nodes: []})

  assert.ok(typeof result.diagnostics.candidateCount === 'number')
  assert.ok(typeof result.diagnostics.filteredCount === 'number')
  assert.ok(typeof result.diagnostics.costMs === 'number')
  assert.ok(result.diagnostics.costMs >= 0)
})

test('TC-01.3 resolveHitGeometryV2 does not throw on empty input', () => {
  assert.doesNotThrow(() => resolveHitGeometryV2({nodes: []}))
})

test('TC-01.4 resolveHitGeometryV2 returns deterministic field shape for single-node input', () => {
  const result = resolveHitGeometryV2({
    nodes: [{id: 'test-rect', type: 'shape', shape: 'rect', x: 0, y: 0, width: 100, height: 100}],
  })

  assert.equal(result.apiVersion, '2.0.0')
  assert.ok(Array.isArray(result.pointHitNodeIds))
  assert.ok(Array.isArray(result.marqueeCandidateNodeIds))
  assert.ok(Array.isArray(result.marqueeResolvedNodeIds))
})

// ---------------------------------------------------------------------------
// TC-RP: Render Policy Contracts (existing)
// ---------------------------------------------------------------------------

test('runtime-engine policy contract keeps pan phase at full quality interaction mode', () => {
  const policy = resolveRuntimeRenderPolicy({
    phase: 'pan',
    lodLevel: 3,
    viewportScale: 1,
    deviceDpr: 2,
  })

  assert.equal(policy.quality, 'full')
  assert.equal(policy.interactionActive, true)
})

test('runtime-engine policy contract applies high-zoom sharpness guard', () => {
  const policy = resolveRuntimeRenderPolicy({
    phase: 'zoom',
    lodLevel: 3,
    viewportScale: 3,
    deviceDpr: 2,
  })

  assert.equal(typeof policy.dpr, 'number')
  assert.ok((policy.dpr as number) >= 2)
})

test('Vector2D image registry map uses the exact engine asset key without duplicate shape keys', () => {
  const document = createCanonicalDocumentModelFixture()
  document.shapes.push({
    id: 'image-with-asset',
    type: 'image',
    name: 'Image With Asset',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    assetId: 'asset-image',
    assetUrl: 'data:image/png;base64,image',
  })

  const imageAssets = buildDocumentImageAssetUrlMap(document)

  assert.equal(imageAssets.get('asset-image'), 'data:image/png;base64,image')
  assert.equal(imageAssets.has('image-with-asset'), false)
})

test('Vector2D engine scene adapter emits explicit 2D opt-in metadata and degradation diagnostics', () => {
  const document = createCanonicalDocumentModelFixture()
  const scene = createEngineSceneFromRuntimeSnapshot({
    document,
    shapes: createShapeSnapshotsFromDocument(document),
    revision: 'adapter-contract',
  })

  assert.equal(scene.adapter.version, 'vector2d.engine-scene-adapter.v1')
  assert.equal(scene.adapter.dimensionMode, '2d')
  assert.equal(scene.nodes.length > 0, true)
  assert.equal(scene.diagnostics.length > 0, true)

  const diagnosticCodes = new Set(scene.diagnostics.map((diagnostic) => diagnostic.code))
  assert.equal(diagnosticCodes.has('v2d.adapter.degraded.fill-gradient'), true)
  assert.equal(diagnosticCodes.has('v2d.adapter.degraded.stroke-gradient'), true)
  assert.equal(diagnosticCodes.has('v2d.adapter.degraded.blur'), true)
  assert.equal(diagnosticCodes.has('v2d.adapter.degraded.boolean'), true)
  assert.equal(diagnosticCodes.has('v2d.adapter.degraded.component'), true)
})

test('Vector2D engine scene adapter keeps product and competitor semantics out of engine payload keys', () => {
  const document = createCanonicalDocumentModelFixture()
  const scene = createEngineSceneFromRuntimeSnapshot({
    document,
    shapes: createShapeSnapshotsFromDocument(document),
    revision: 'adapter-neutrality',
    compatibility: {
      dimensionMode: 'hybrid-2d3d',
      defaultLightingMode: 'unlit',
      defaultMaterialId: 'neutral-material',
    },
  })
  const forbiddenKeyTokens = [
    'artboard',
    'layerPanel',
    'penTool',
    'directSelection',
    'pathfinder',
    'figma',
    'illustrator',
  ]

  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') {
      return
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      assert.equal(
        forbiddenKeyTokens.some((token) => key.toLowerCase().includes(token.toLowerCase())),
        false,
        `engine payload key should stay product-neutral: ${key}`,
      )
      visit(child)
    })
  }

  visit(scene)
  assert.equal(scene.adapter.dimensionMode, 'hybrid-2d3d')
  assert.equal(scene.nodes.some((node) => node.lightingMode === 'unlit'), true)
  assert.equal(scene.nodes.some((node) => node.materialId === 'neutral-material'), true)
})

test('Vector2D engine scene adapter render support matrix covers commercial feature families', () => {
  const expectedFeatures = [
    'image',
    'rich-text',
    'fills',
    'strokes',
    'effects',
    'masks',
    'groups',
    'components',
    'booleans',
  ]

  assert.deepEqual(
    ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX.map((row) => row.feature).sort(),
    expectedFeatures.sort(),
  )
  ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX.forEach((row) => {
    assert.equal(row.enginePayloadFields.length > 0, true)
    assert.equal(typeof row.policy, 'string')
    assert.equal(row.policy.length > 0, true)
    assert.equal(
      row.enginePayloadFields.some((field) => field.includes('artboard') || field.includes('layerPanel') || field.includes('tool')),
      false,
    )
  })
})

test('Vector2D engine scene adapter diagnostics stay aligned with render support matrix', () => {
  const document = createCanonicalDocumentModelFixture()
  const scene = createEngineSceneFromRuntimeSnapshot({
    document,
    shapes: createShapeSnapshotsFromDocument(document),
    revision: 'adapter-matrix',
  })
  const matrixDiagnosticCodes = new Set(
    ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX.flatMap((row) => row.diagnosticCodes),
  )

  scene.diagnostics.forEach((diagnostic) => {
    assert.equal(
      matrixDiagnosticCodes.has(diagnostic.code),
      true,
      `diagnostic code must be represented in render support matrix: ${diagnostic.code}`,
    )
  })

  const degradedRows = ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX.filter((row) => row.status !== 'projected')
  assert.equal(degradedRows.length > 0, true)
  degradedRows.forEach((row) => {
    assert.equal(row.diagnosticCodes.length > 0, true, `${row.feature} should declare diagnostics when not fully projected`)
  })
})

test('Vector2D engine scene adapter diagnostics report summarizes release-facing adapter degradation', () => {
  const document = createCanonicalDocumentModelFixture()
  const scene = createEngineSceneFromRuntimeSnapshot({
    document,
    shapes: createShapeSnapshotsFromDocument(document),
    revision: 'adapter-report',
  })
  const report = createEngineSceneAdapterDiagnosticsReport(scene.diagnostics)

  assert.equal(report.schemaVersion, 1)
  assert.equal(report.adapterVersion, scene.adapter.version)
  assert.equal(report.totalCount, scene.diagnostics.length)
  assert.equal(report.severityCounts.warning > 0, true)
  assert.equal((report.codeCounts['v2d.adapter.degraded.blur'] ?? 0) > 0, true)
  assert.equal((report.codeCounts['v2d.adapter.degraded.component'] ?? 0) > 0, true)
  assert.equal(report.affectedNodeIds.includes('fixture-styled'), true)
  assert.deepEqual(report.supportMatrix, ENGINE_SCENE_ADAPTER_RENDER_SUPPORT_MATRIX)
})
