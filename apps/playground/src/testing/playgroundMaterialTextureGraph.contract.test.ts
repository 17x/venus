import test from 'node:test'
import assert from 'node:assert/strict'
import {buildDrivingGameScene} from '../demos/drivingGameScene'
import {createInitialDrivingGameState} from '../demos/drivingGameTypes'
import {buildThreeEditorEngineGraph} from '../runtime/threeEditor/buildThreeEditorEngineGraph'
import {
  DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
  type ThreeEditorOverlayState,
} from '../runtime/threeEditor/threeEditorRuntimeContracts'

const assertTexturedNode = (node: Record<string, unknown>, expectedMaterialId: string): void => {
  const mesh = node.mesh as Record<string, unknown> | undefined
  assert.ok(mesh, `${String(node.id)} should include mesh payload`)
  assert.equal(mesh.materialId, expectedMaterialId)
  assert.equal(node.materialId, expectedMaterialId)
  assert.ok(Array.isArray(mesh.uvs), `${String(node.id)} should include mesh UVs`)
  assert.ok((mesh.uvs as unknown[]).length > 0, `${String(node.id)} should include non-empty mesh UVs`)
}

test('driving game scene submits ground and road texture materials through engine graph contract', () => {
  const graph = buildDrivingGameScene(createInitialDrivingGameState()) as {
    nodes: Array<Record<string, unknown>>
    materials: Array<Record<string, unknown>>
  }

  assert.deepEqual(
    graph.materials.map((material) => material.id).sort(),
    ['game-ground-material', 'game-road-material'],
  )

  const ground = graph.nodes.find((node) => node.id === 'ground')
  const road = graph.nodes.find((node) => String(node.id).startsWith('road-') && !String(node.id).startsWith('road-mark-'))
  assert.ok(ground, 'ground node should be present')
  assert.ok(road, 'road node should be present')
  assertTexturedNode(ground, 'game-ground-material')
  assertTexturedNode(road, 'game-road-material')
})

test('3d editor scene submits floor and object panel texture materials through engine graph contract', () => {
  const overlayState: ThreeEditorOverlayState = {
    axesEnabled: false,
    gridEnabled: true,
    gizmoEnabled: true,
    depthLayeringEnabled: false,
    visibilityMaskEnabled: false,
    lightingMode: 'lit',
  }
  const graph = buildThreeEditorEngineGraph({
    cameraState: {
      yaw: 25,
      pitch: 35,
      distance: 720,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    },
    overlayState,
    worldObjects: DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
    selectedEntityId: null,
    hoverEntityId: null,
  })

  assert.deepEqual(
    (graph.materials ?? []).map((material) => material.id).sort(),
    ['editor-floor-material', 'editor-panel-material'],
  )

  const floorPatch = graph.nodes.find((node) => String(node.id).startsWith('floor-tex-'))
  const objectPanel = graph.nodes.find((node) => String(node.id).startsWith('obj-tex-'))
  assert.ok(floorPatch, 'floor texture patch should be present')
  assert.ok(objectPanel, 'object texture panel should be present')
  assertTexturedNode(floorPatch, 'editor-floor-material')
  assertTexturedNode(objectPanel, 'editor-panel-material')
})
