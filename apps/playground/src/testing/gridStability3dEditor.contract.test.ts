import assert from 'node:assert/strict'
import test from 'node:test'
import {buildThreeEditorEngineGraph} from '../runtime/threeEditor/buildThreeEditorEngineGraph'
import {
  DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
  type ThreeEditorOverlayState,
} from '../runtime/threeEditor/threeEditorRuntimeContracts'
import {build3DEditorValidationScene} from '../scenarios/3d-editor-validation/scene'

const editorOverlayState: ThreeEditorOverlayState = {
  axesEnabled: false,
  gridEnabled: true,
  gizmoEnabled: true,
  depthLayeringEnabled: false,
  visibilityMaskEnabled: false,
  lightingMode: 'lit',
}

function collectRuntimeGridSignature(cameraState: {yaw: number; pitch: number; distance: number}) {
  const graph = buildThreeEditorEngineGraph({
    cameraState: {
      ...cameraState,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
    },
    overlayState: editorOverlayState,
    worldObjects: DEFAULT_THREE_EDITOR_WORLD_OBJECTS,
    selectedEntityId: null,
    hoverEntityId: null,
  })

  return graph.nodes
    .filter((node) => String((node as Record<string, unknown>).id).startsWith('grid-'))
    .map((node) => {
      const record = node as Record<string, unknown>
      const mesh = record.mesh as Record<string, unknown> | undefined
      assert.ok(mesh, `${String(record.id)} should include mesh geometry`)
      const positions = mesh.positions as unknown[] | undefined
      const indices = mesh.indices as unknown[] | undefined
      assert.ok(Array.isArray(positions), `${String(record.id)} should include positions`)
      assert.ok(Array.isArray(indices), `${String(record.id)} should include indices`)
      assert.equal(positions.every((value) => Number.isFinite(Number(value))), true)
      assert.equal(indices.every((value) => Number.isInteger(Number(value))), true)
      return [
        String(record.id),
        String(mesh.topology),
        String(mesh.color),
        positions.map((value) => Number(value).toFixed(3)).join(','),
        indices.join(','),
      ].join('|')
    })
    .sort()
}

test('3d editor grid-only scene contains no floating model nodes', () => {
  const scene = build3DEditorValidationScene(1)
  const ids = scene.nodes.map((node) => String((node as Record<string, unknown>).id ?? ''))
  assert.equal(ids.some((id) => id.startsWith('object-main-cube')), false)
  assert.equal(ids.some((id) => id.startsWith('object-sphere')), false)
  assert.equal(ids.some((id) => id.startsWith('hit-')), false)
})

test('3d editor grid-only strips keep finite positive geometry', () => {
  const scene = build3DEditorValidationScene(1)
  const gridNodes = scene.nodes.filter((node) => {
    const id = String((node as Record<string, unknown>).id ?? '')
    return id.startsWith('ground-grid-') || id.startsWith('ground-axis-')
  }) as Array<Record<string, unknown>>

  assert.equal(gridNodes.length > 0, true)
  gridNodes.forEach((node) => {
    assert.equal(Number.isFinite(Number(node.x)), true)
    assert.equal(Number.isFinite(Number(node.y)), true)
    assert.equal(Number.isFinite(Number(node.width)), true)
    assert.equal(Number.isFinite(Number(node.height)), true)
    assert.equal(Number(node.width) > 0, true)
    assert.equal(Number(node.height) > 0, true)
    assert.equal(node.shape, 'rect')
  })
})

test('3d editor runtime grid graph remains deterministic across camera distance and angle', () => {
  const baseline = collectRuntimeGridSignature({yaw: 0, pitch: 18, distance: 320})
  const mid = collectRuntimeGridSignature({yaw: 34, pitch: 42, distance: 720})
  const far = collectRuntimeGridSignature({yaw: -55, pitch: 28, distance: 1800})

  assert.equal(baseline.length, 18)
  assert.deepEqual(mid, baseline)
  assert.deepEqual(far, baseline)
})
