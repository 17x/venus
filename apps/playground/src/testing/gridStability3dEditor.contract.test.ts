import assert from 'node:assert/strict'
import test from 'node:test'
import {build3DEditorValidationScene} from '../scenarios/3d-editor-validation/scene'

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
