import assert from 'node:assert/strict'
import test from 'node:test'

import { EngineDirtyRegionTracker } from './dirtyRegionTracker.ts'

test('EngineDirtyRegionTracker ignores hover-only updates for tile invalidation', () => {
  const tracker = new EngineDirtyRegionTracker(512)

  tracker.trackUpdate({
    mode: 'hover',
    bounds: {x: 0, y: 0, width: 32, height: 32},
    zoomLevel: 5,
    elementIds: ['hovered'],
  })
  tracker.trackUpdate({
    mode: 'selection',
    bounds: {x: 10, y: 10, width: 32, height: 32},
    zoomLevel: 5,
    elementIds: ['selected'],
  })

  // Overlay-only updates should still record affected ids but must not dirty tiles.
  assert.deepEqual(tracker.computeDirtyTiles(), [])
  assert.deepEqual(Array.from(tracker.getAffectedElementIds()).sort(), ['hovered', 'selected'])
})

test('EngineDirtyRegionTracker unions previous and next bounds for transforms', () => {
  const tracker = new EngineDirtyRegionTracker(512)

  tracker.trackUpdate({
    mode: 'transform',
    bounds: {x: 520, y: 0, width: 40, height: 40},
    previousBounds: {x: 0, y: 0, width: 40, height: 40},
    zoomLevel: 5,
    elementIds: ['shape-1'],
  })

  // Transform invalidation should cover both the old tile and the new tile.
  assert.deepEqual(tracker.computeDirtyTiles(), [
    {zoomLevel: 5, gridX: 0, gridY: 0},
    {zoomLevel: 5, gridX: 1, gridY: 0},
  ])
  assert.deepEqual(tracker.getStats(), {
    totalUpdates: 1,
    shapeUpdates: 1,
    hoverUpdates: 0,
    selectionUpdates: 0,
    uniqueElementIds: 1,
  })

  tracker.flush()
  assert.equal(tracker.getPendingUpdates().length, 0)
})