import assert from 'node:assert/strict'
import test from 'node:test'
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

function buildSelectionGraph(input: {selectedEntityId: string | null; hoverEntityId: string | null}) {
  return buildThreeEditorEngineGraph({
    cameraState: {yaw: 25, pitch: 35, distance: 720, targetX: 0, targetY: 0, targetZ: 0},
    overlayState,
    worldObjects: DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
    selectedEntityId: input.selectedEntityId,
    hoverEntityId: input.hoverEntityId,
  })
}

function findNode(graph: ReturnType<typeof buildSelectionGraph>, id: string): Record<string, unknown> {
  const node = graph.nodes.find((candidate) => String((candidate as Record<string, unknown>).id) === id)
  assert.ok(node, `${id} should exist`)
  return node as Record<string, unknown>
}

test('3d editor selected object uses transparent mesh color and back-edge outline nodes', () => {
  const graph = buildSelectionGraph({selectedEntityId: 'mesh-main-cube', hoverEntityId: null})
  const selectedNode = findNode(graph, 'object-mesh-main-cube')
  const mesh = selectedNode.mesh as Record<string, unknown> | undefined
  assert.ok(mesh)
  assert.equal(mesh.color, 'rgba(14, 165, 233, 0.45)')

  const outlineNodes = graph.nodes.filter((node) => String((node as Record<string, unknown>).id).startsWith('selected-outline-mesh-main-cube-be-'))
  assert.equal(outlineNodes.length, 4)
  outlineNodes.forEach((node) => {
    const outlineMesh = (node as Record<string, unknown>).mesh as Record<string, unknown> | undefined
    assert.ok(outlineMesh)
    assert.equal(outlineMesh.color, '#fbbf24')
    assert.equal(outlineMesh.topology, 'triangles')
    assert.equal(Array.isArray(outlineMesh.positions), true)
    assert.equal(Array.isArray(outlineMesh.indices), true)
  })

  const gizmoNodes = graph.nodes.filter((node) => String((node as Record<string, unknown>).id).startsWith('selected-gizmo-mesh-main-cube-'))
  assert.equal(gizmoNodes.length > 0, true)
})

test('3d editor hover and selected states remain visually distinct', () => {
  const hoverGraph = buildSelectionGraph({selectedEntityId: null, hoverEntityId: 'mesh-left-cube'})
  const hoverNode = findNode(hoverGraph, 'object-mesh-left-cube')
  const hoverMesh = hoverNode.mesh as Record<string, unknown> | undefined
  assert.ok(hoverMesh)
  assert.equal(hoverMesh.color, '#f59e0b')
  assert.equal(hoverGraph.nodes.some((node) => String((node as Record<string, unknown>).id).startsWith('selected-outline-mesh-left-cube-')), false)

  const selectedGraph = buildSelectionGraph({selectedEntityId: 'mesh-left-cube', hoverEntityId: 'mesh-left-cube'})
  const selectedNode = findNode(selectedGraph, 'object-mesh-left-cube')
  const selectedMesh = selectedNode.mesh as Record<string, unknown> | undefined
  assert.ok(selectedMesh)
  assert.equal(selectedMesh.color, 'rgba(20, 184, 166, 0.45)')
  assert.notEqual(selectedMesh.color, hoverMesh.color)
  assert.equal(selectedGraph.nodes.some((node) => String((node as Record<string, unknown>).id).startsWith('selected-outline-mesh-left-cube-be-')), true)
})
