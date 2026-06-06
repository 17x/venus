import assert from 'node:assert/strict'
import test from 'node:test'

import {buildSelectionState} from '../../../runtime/interaction/selection/selectionManager.ts'
import type {SceneShapeSnapshot} from '../../../runtime/shared-memory/index.ts'
import {createCanonicalDocumentModelFixture} from '../document-structure/canonicalDocumentFixture.ts'

/**
 * Creates SceneShapeSnapshot list from canonical document for selection testing.
 */
function createSceneSnapshots(): SceneShapeSnapshot[] {
  const document = createCanonicalDocumentModelFixture()
  return document.shapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    isHovered: shape.id === 'fixture-rect',
    isSelected: shape.id === 'fixture-frame' || shape.id === 'fixture-rect',
  }))
}

/**
 * Verifies buildSelectionState resolves selected ids, hover id, and union bounds deterministically.
 */
test('buildSelectionState resolves selected ids, hover, and union bounds', () => {
  const document = createCanonicalDocumentModelFixture()
  const snapshots = createSceneSnapshots()
  const state = buildSelectionState(document, snapshots)

  assert.deepEqual(state.selectedIds.slice().sort(), ['fixture-frame', 'fixture-rect'])
  assert.equal(state.hoverId, 'fixture-rect')
  assert.ok(state.selectedBounds)
  assert.equal(state.selectedBounds.minX < state.selectedBounds.maxX, true)
  assert.equal(state.selectedBounds.minY < state.selectedBounds.maxY, true)
})

/**
 * Verifies buildSelectionState returns null bounds when no shape is selected.
 */
test('buildSelectionState returns null bounds when nothing selected', () => {
  const document = createCanonicalDocumentModelFixture()
  const snapshots: SceneShapeSnapshot[] = document.shapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    isHovered: false,
    isSelected: false,
  }))
  const state = buildSelectionState(document, snapshots)

  assert.deepEqual(state.selectedIds, [])
  assert.equal(state.hoverId, null)
  assert.equal(state.selectedBounds, null)
})

/**
 * Verifies hover-only snapshots keep selectedIds empty while hover is tracked.
 */
test('buildSelectionState tracks hover id without selected bounds', () => {
  const document = createCanonicalDocumentModelFixture()
  const snapshots: SceneShapeSnapshot[] = document.shapes.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    isHovered: shape.id === 'fixture-frame',
    isSelected: false,
  }))
  const state = buildSelectionState(document, snapshots)

  assert.deepEqual(state.selectedIds, [])
  assert.equal(state.hoverId, 'fixture-frame')
  assert.equal(state.selectedBounds, null)
})
