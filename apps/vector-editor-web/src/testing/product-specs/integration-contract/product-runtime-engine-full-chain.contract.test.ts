import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveVector2DCommandContract,
} from '../../../product/runtime/commandContract.ts'
import type {EditorDocument} from '../../../runtime/model/index.ts'
import {
  createEngineSceneAdapterDiagnosticsReport,
  createEngineSceneFromRuntimeSnapshot,
} from '../../../runtime/presets/index.ts'
import type {SceneShapeSnapshot} from '../../../runtime/shared-memory/index.ts'
import type {EditorRuntimeCommand} from '../../../runtime/worker/index.ts'
import {
  EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
  getRuntimeRenderDiagnosticsSnapshot,
  publishRuntimeRenderDiagnostics,
  resetRuntimeEventSnapshots,
} from '../../../runtime/events/index/index.ts'
import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

function createShapeSnapshotsFromDocument(
  document: EditorDocument,
  selectedShapeIds: readonly string[],
): SceneShapeSnapshot[] {
  const selectedShapeIdSet = new Set(selectedShapeIds)
  return document.shapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    isHovered: false,
    isSelected: selectedShapeIdSet.has(shape.id),
    pathPointCount: shape.points?.length,
    pathBezierPointCount: shape.bezierPoints?.length,
  }))
}

function applyShapePatchCommand(
  document: EditorDocument,
  command: Extract<EditorRuntimeCommand, {type: 'shape.patch'}>,
): EditorDocument {
  return {
    ...document,
    updatedAt: 1735689602000,
    lifecycle: {
      ...document.lifecycle,
      dirty: true,
      state: 'dirty',
      lastDirtySource: {
        commandType: command.type,
        commandId: 'cmd-full-chain-style-patch',
        transactionId: 'txn-full-chain-smoke',
        issuedAt: 1735689602000,
      },
    },
    shapes: document.shapes.map((shape) => (
      shape.id === command.shapeId
        ? {
            ...shape,
            ...command.patch,
          }
        : shape
    )),
  }
}

function createNodeTypeCounts(nodes: Array<{type: string}>) {
  return nodes.reduce<Record<string, number>>((counts, node) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1
    return counts
  }, {})
}

test('Vector2D product-runtime-engine full-chain smoke emits deterministic release signature', () => {
  resetRuntimeEventSnapshots()

  const initialDocument = createCanonicalDocumentModelFixture()
  const command = {
    type: 'shape.patch',
    shapeId: 'fixture-styled',
    patch: {
      stroke: {enabled: true, color: '#f97316', weight: 5},
      shadow: {
        enabled: true,
        kind: 'drop',
        color: 'rgba(15,23,42,0.45)',
        offsetX: 4,
        offsetY: 6,
        blur: 12,
        spread: 2,
        blendMode: 'multiply',
      },
    },
  } satisfies Extract<EditorRuntimeCommand, {type: 'shape.patch'}>
  const commandContract = resolveVector2DCommandContract(command)
  const nextDocument = applyShapePatchCommand(initialDocument, command)
  const runtimeShapes = createShapeSnapshotsFromDocument(nextDocument, [command.shapeId])
  const engineScene = createEngineSceneFromRuntimeSnapshot({
    document: nextDocument,
    shapes: runtimeShapes,
    revision: 'full-chain-smoke:style-patch',
    compatibility: {
      dimensionMode: 'hybrid-2d3d',
      defaultLightingMode: 'unlit',
      defaultMaterialId: 'vector2d-commercial-smoke-material',
    },
  })
  const adapterReport = createEngineSceneAdapterDiagnosticsReport(engineScene.diagnostics)

  publishRuntimeRenderDiagnostics({
    ...EMPTY_RUNTIME_RENDER_DIAGNOSTICS,
    frameCount: 1,
    diagnosticsUpdatedAtMs: 1735689602001,
    drawCount: engineScene.nodes.length,
    visibleShapeCount: runtimeShapes.length,
    framePlanSceneNodeCount: engineScene.nodes.length,
    framePlanCandidateCount: engineScene.nodes.length,
    framePlanVisibleRatio: 1,
    engineSceneAdapterReport: adapterReport,
  })
  const productVisibleDiagnostics = getRuntimeRenderDiagnosticsSnapshot()
  const styledNode = nextDocument.shapes.find((shape) => shape.id === command.shapeId)

  assert.ok(styledNode, 'patched fixture node should exist')
  assert.deepEqual({
    command: {
      type: commandContract.commandType,
      family: commandContract.family,
      beforeAfterPolicy: commandContract.beforeAfterPolicy,
      mergePolicy: commandContract.mergePolicy,
      targetIds: commandContract.targetIds,
      diagnostics: commandContract.diagnostics,
    },
    document: {
      id: nextDocument.id,
      dirty: nextDocument.lifecycle?.dirty,
      dirtyCommandType: nextDocument.lifecycle?.lastDirtySource?.commandType,
      patchedStroke: styledNode?.stroke,
      patchedShadowSpread: styledNode?.shadow?.spread,
    },
    runtime: {
      shapeCount: runtimeShapes.length,
      selectedIds: runtimeShapes.filter((shape) => shape.isSelected).map((shape) => shape.id),
    },
    engine: {
      adapterVersion: engineScene.adapter.version,
      dimensionMode: engineScene.adapter.dimensionMode,
      nodeCount: engineScene.nodes.length,
      nodeTypeCounts: createNodeTypeCounts(engineScene.nodes),
      styledNodeUsesGenericMaterial: engineScene.nodes.some((node) => (
        node.id === command.shapeId &&
        node.materialId === 'vector2d-commercial-smoke-material' &&
        node.lightingMode === 'unlit'
      )),
    },
    diagnostics: {
      uiReportSchemaVersion: productVisibleDiagnostics.engineSceneAdapterReport.schemaVersion,
      uiReportTotalCount: productVisibleDiagnostics.engineSceneAdapterReport.totalCount,
      uiReportWarningCount: productVisibleDiagnostics.engineSceneAdapterReport.severityCounts.warning,
      blurCodeCount: productVisibleDiagnostics.engineSceneAdapterReport.codeCounts['v2d.adapter.degraded.blur'] ?? 0,
      shadowSpreadCodeCount:
        productVisibleDiagnostics.engineSceneAdapterReport.codeCounts['v2d.adapter.degraded.shadow-spread'] ?? 0,
      affectedIncludesPatchedNode:
        productVisibleDiagnostics.engineSceneAdapterReport.affectedNodeIds.includes(command.shapeId),
    },
  }, {
    command: {
      type: 'shape.patch',
      family: 'style',
      beforeAfterPolicy: 'document-patch',
      mergePolicy: 'continuous',
      targetIds: ['fixture-styled'],
      diagnostics: [
        'v2d.command.family.style',
        'v2d.command.beforeAfter.document-patch',
        'v2d.command.merge.continuous',
      ],
    },
    document: {
      id: 'canonical-doc-fixture',
      dirty: true,
      dirtyCommandType: 'shape.patch',
      patchedStroke: {enabled: true, color: '#f97316', weight: 5},
      patchedShadowSpread: 2,
    },
    runtime: {
      shapeCount: 11,
      selectedIds: ['fixture-styled'],
    },
    engine: {
      adapterVersion: 'vector2d.engine-scene-adapter.v1',
      dimensionMode: 'hybrid-2d3d',
      nodeCount: 12,
      nodeTypeCounts: {
        group: 1,
        image: 1,
        shape: 9,
        text: 1,
      },
      styledNodeUsesGenericMaterial: true,
    },
    diagnostics: {
      uiReportSchemaVersion: 1,
      uiReportTotalCount: 8,
      uiReportWarningCount: 7,
      blurCodeCount: 1,
      shadowSpreadCodeCount: 1,
      affectedIncludesPatchedNode: true,
    },
  })
})
