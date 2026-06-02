import test from 'node:test'
import assert from 'node:assert/strict'
import {createEngine, createTestSurface} from '@venus/engine'
import {buildDrivingGameScene, createDrivingGameModelAssets, createDrivingGameModelInstances} from '../demos/drivingGameScene'
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

test('driving game scene exposes generic model assets for dynamic actor families', () => {
  const state = createInitialDrivingGameState()
  const assets = createDrivingGameModelAssets()
  const instances = createDrivingGameModelInstances(state)
  const graph = buildDrivingGameScene(state) as {nodes: Array<Record<string, unknown>>}

  assert.deepEqual(
    assets.map((asset) => asset.id).sort(),
    [
      'driving-game-model-lamp',
      'driving-game-model-moon',
      'driving-game-model-pedestrian',
      'driving-game-model-sun',
      'driving-game-model-vehicle',
    ],
  )
  assert.equal(assets.every((asset) => asset.scene.nodes.some((node) => node.mesh)), true)
  assert.equal(instances.some((instance) => instance.modelId === 'driving-game-model-vehicle'), true)
  assert.equal(instances.some((instance) => instance.modelId === 'driving-game-model-pedestrian'), true)
  assert.equal(instances.some((instance) => instance.modelId === 'driving-game-model-lamp'), true)
  assert.equal(instances.some((instance) => instance.modelId === 'driving-game-model-sun'), true)

  const modelDerivedNodeIds = new Set(graph.nodes.map((node) => String(node.id)))
  assert.equal(modelDerivedNodeIds.has('player-car-body'), true)
  assert.equal([...modelDerivedNodeIds].some((id) => id.startsWith('npc-car-')), true)
  assert.equal([...modelDerivedNodeIds].some((id) => id.startsWith('ped-')), true)
  assert.equal([...modelDerivedNodeIds].some((id) => id.startsWith('lamp-')), true)
  assert.equal(modelDerivedNodeIds.has('sun-sphere'), true)
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

test('game and 3d editor graphs validate through runtime authoring parity API', () => {
  const engine = createEngine({surface: createTestSurface(320, 180), backend: 'headless'})
  const gameGraph = buildDrivingGameScene(createInitialDrivingGameState()) as {
    nodes: Array<Record<string, unknown>>
    materials: Array<Record<string, unknown>>
  }
  const editorGraph = buildThreeEditorEngineGraph({
    cameraState: {yaw: 25, pitch: 35, distance: 720, targetX: 0, targetY: 0, targetZ: 0},
    overlayState: {axesEnabled: false, gridEnabled: true, gizmoEnabled: true, depthLayeringEnabled: false, visibilityMaskEnabled: false, lightingMode: 'lit'},
    worldObjects: DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
    selectedEntityId: null,
    hoverEntityId: null,
  })

  for (const [graphId, graph] of [['s10-driving-game', gameGraph], ['three-editor-runtime', editorGraph]] as const) {
    const authoring = engine.runtime.authoring.createGraphSnapshot({graphId, role: 'authoring', revision: 1, nodes: graph.nodes, materials: graph.materials ?? []})
    const runtime = engine.runtime.authoring.createGraphSnapshot({graphId, role: 'runtime', revision: 1, nodes: graph.nodes, materials: graph.materials ?? []})
    const comparison = engine.runtime.authoring.compareGraphSnapshots({authoring: authoring.snapshotId, runtime: runtime.snapshotId})
    assert.equal(comparison.matching, true)
    assert.equal(comparison.addedNodeIds.length, 0)
    assert.equal(comparison.removedNodeIds.length, 0)
    assert.equal(engine.runtime.authoring.createPreviewToken({scope: graphId, snapshot: runtime.snapshotId, stepIndex: 1}).stepIndex, 1)
  }

  assert.equal(engine.runtime.authoring.getDiagnostics().lastComparisonMatching, true)
  engine.dispose()
})
