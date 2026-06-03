import assert from 'node:assert/strict'
import test from 'node:test'
import {createEngine, createTestSurface} from '@venus/engine'
import {buildThreeEditorEngineGraph} from '../runtime/threeEditor/buildThreeEditorEngineGraph'
import {
  DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
  type ThreeEditorOverlayState,
} from '../runtime/threeEditor/threeEditorRuntimeContracts'

const overlayState: ThreeEditorOverlayState = {
  axesEnabled: false,
  gridEnabled: true,
  gizmoEnabled: true,
  depthLayeringEnabled: false,
  visibilityMaskEnabled: false,
  lightingMode: 'lit',
}

function buildEditorGraph() {
  return buildThreeEditorEngineGraph({
    cameraState: {yaw: 25, pitch: 35, distance: 720, targetX: 0, targetY: 0, targetZ: 0},
    overlayState,
    worldObjects: DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
    selectedEntityId: 'mesh-main-cube',
    hoverEntityId: 'mesh-main-cube',
  })
}

test('3d editor authoring/runtime split produces deterministic parity signature', () => {
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  try {
    const graph = buildEditorGraph()
    const createPair = (revision: number) => {
      const authoring = engine.runtime.authoring.createGraphSnapshot({
        graphId: 'three-editor-runtime',
        role: 'authoring',
        revision,
        nodes: graph.nodes,
        materials: graph.materials ?? [],
      })
      const runtime = engine.runtime.authoring.createGraphSnapshot({
        graphId: 'three-editor-runtime',
        role: 'runtime',
        revision,
        nodes: graph.nodes,
        materials: graph.materials ?? [],
      })
      const comparison = engine.runtime.authoring.compareGraphSnapshots({authoring: authoring.snapshotId, runtime: runtime.snapshotId})
      const preview = engine.runtime.authoring.createPreviewToken({scope: 'three-editor-runtime', snapshot: runtime.snapshotId, stepIndex: revision})
      return {authoring, runtime, comparison, preview}
    }

    const first = createPair(11)
    const second = createPair(11)

    assert.equal(first.comparison.matching, true)
    assert.equal(first.comparison.revisionDelta, 0)
    assert.equal(first.comparison.addedNodeIds.length, 0)
    assert.equal(first.comparison.removedNodeIds.length, 0)
    assert.equal(first.comparison.addedMaterialIds.length, 0)
    assert.equal(first.comparison.removedMaterialIds.length, 0)
    assert.equal(first.authoring.signature, first.runtime.signature)
    assert.equal(second.authoring.signature, first.authoring.signature)
    assert.equal(second.runtime.signature, first.runtime.signature)
    assert.equal(first.authoring.nodeCount, graph.nodes.length)
    assert.equal(first.runtime.nodeCount, graph.nodes.length)
    assert.equal(first.authoring.materialCount, graph.materials?.length ?? 0)
    assert.equal(first.runtime.materialCount, graph.materials?.length ?? 0)
    assert.equal(first.preview.stepIndex, 11)
    assert.equal(first.preview.signature, first.runtime.signature)
  } finally {
    engine.dispose()
  }
})
