import assert from 'node:assert/strict'
import test from 'node:test'
import {buildThreeEditorEngineGraph} from '../runtime/threeEditor/buildThreeEditorEngineGraph'
import {
  createThreeEditorGizmoDragSnapshot,
  resolveThreeEditorGizmoAxisFromNodeId,
  resolveThreeEditorGizmoDragTransform,
  resolveThreeEditorGizmoModeFromNodeId,
} from '../runtime/threeEditor/threeEditorTransformControls'
import {
  DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
  type ThreeEditorOverlayState,
  type ThreeEditorWorldObject,
} from '../runtime/threeEditor/threeEditorRuntimeContracts'

const overlayState: ThreeEditorOverlayState = {
  axesEnabled: false,
  gridEnabled: true,
  gizmoEnabled: true,
  depthLayeringEnabled: false,
  visibilityMaskEnabled: false,
  lightingMode: 'lit',
}

const baseObject: ThreeEditorWorldObject = {
  id: 'mesh-main-cube',
  label: 'Main Cube',
  kind: 'box',
  x: 10,
  y: 20,
  z: 30,
  width: 100,
  height: 120,
  depth: 140,
  color: '#0ea5e9',
  rotationXDeg: 5,
  rotationYDeg: 10,
  rotationZDeg: 15,
  scaleX: 1.2,
  scaleY: 0.9,
  scaleZ: 1.1,
}

function snapshot(axis: 'x' | 'y' | 'z', mode: 'translate' | 'rotate' | 'scale') {
  return createThreeEditorGizmoDragSnapshot(baseObject, {axis, mode, startX: 100, startY: 100})
}

test('3d editor gizmo node ids resolve axis and mode for hit handling', () => {
  assert.equal(resolveThreeEditorGizmoAxisFromNodeId('selected-gizmo-mesh-main-cube-tx'), 'x')
  assert.equal(resolveThreeEditorGizmoModeFromNodeId('selected-gizmo-mesh-main-cube-tx'), 'translate')
  assert.equal(resolveThreeEditorGizmoAxisFromNodeId('selected-gizmo-mesh-main-cube-ry-12'), 'y')
  assert.equal(resolveThreeEditorGizmoModeFromNodeId('selected-gizmo-mesh-main-cube-ry-12'), 'rotate')
  assert.equal(resolveThreeEditorGizmoAxisFromNodeId('selected-gizmo-mesh-main-cube-sz'), 'z')
  assert.equal(resolveThreeEditorGizmoModeFromNodeId('selected-gizmo-mesh-main-cube-sz'), 'scale')
})

test('3d editor selected graph exposes translate rotate and scale gizmo handles', () => {
  const graph = buildThreeEditorEngineGraph({
    cameraState: {yaw: 25, pitch: 35, distance: 720, targetX: 0, targetY: 0, targetZ: 0},
    overlayState,
    worldObjects: DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
    selectedEntityId: 'mesh-main-cube',
    hoverEntityId: 'mesh-main-cube',
  })
  const ids = new Set(graph.nodes.map((node) => String((node as Record<string, unknown>).id)))

  ;['tx', 'ty', 'tz', 'sx', 'sy', 'sz'].forEach((suffix) => {
    assert.equal(ids.has(`selected-gizmo-mesh-main-cube-${suffix}`), true)
  })
  assert.equal([...ids].some((id) => id.startsWith('selected-gizmo-mesh-main-cube-rx-')), true)
  assert.equal([...ids].some((id) => id.startsWith('selected-gizmo-mesh-main-cube-ry-')), true)
  assert.equal([...ids].some((id) => id.startsWith('selected-gizmo-mesh-main-cube-rz-')), true)
})

test('3d editor translate handles change only the expected position component', () => {
  const xTransform = resolveThreeEditorGizmoDragTransform(snapshot('x', 'translate'), {x: 125, y: 140}, 500)
  assert.deepEqual(xTransform, {x: 37.5})

  const yTransform = resolveThreeEditorGizmoDragTransform(snapshot('y', 'translate'), {x: 125, y: 140}, 500)
  assert.deepEqual(yTransform, {y: -24})

  const zTransform = resolveThreeEditorGizmoDragTransform(snapshot('z', 'translate'), {x: 125, y: 140}, 500)
  assert.deepEqual(zTransform, {z: -14})
})

test('3d editor rotate and scale handles mutate deterministic axis-specific transform fields', () => {
  const rotateTransform = resolveThreeEditorGizmoDragTransform(snapshot('y', 'rotate'), {x: 140, y: 85}, 720)
  assert.deepEqual(rotateTransform, {rotationYDeg: 23.75})

  const scaleTransform = resolveThreeEditorGizmoDragTransform(snapshot('z', 'scale'), {x: 150, y: 70}, 720)
  assert.deepEqual(scaleTransform, {scaleZ: 1.54})
})

test('3d editor graph exposes transformed rotation and scale semantics', () => {
  const graph = buildThreeEditorEngineGraph({
    cameraState: {yaw: 25, pitch: 35, distance: 720, targetX: 0, targetY: 0, targetZ: 0},
    overlayState,
    worldObjects: [baseObject],
    selectedEntityId: 'mesh-main-cube',
    hoverEntityId: null,
  })
  const node = graph.nodes.find((candidate) => String((candidate as Record<string, unknown>).id) === 'object-mesh-main-cube') as Record<string, unknown> | undefined
  assert.ok(node)
  const semantic3d = node.semantic3d as Record<string, unknown>
  const transform = semantic3d.transform as Record<string, unknown>

  assert.equal(transform.rotationX, 5)
  assert.equal(transform.rotationY, 10)
  assert.equal(transform.rotationZ, 15)
  assert.equal(transform.scaleX, 1.2)
  assert.equal(transform.scaleY, 0.9)
  assert.equal(transform.scaleZ, 1.1)
})
