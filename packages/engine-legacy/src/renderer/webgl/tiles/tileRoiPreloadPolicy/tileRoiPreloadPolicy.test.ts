import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveRoiPrioritizedPreloadTiles } from './tileRoiPreloadPolicy.ts'

test('resolveRoiPrioritizedPreloadTiles keeps center-near tile first', () => {
  const ordered = resolveRoiPrioritizedPreloadTiles(
    [
      {
        zoomLevel: 4,
        gridX: 10,
        gridY: 10,
        bounds: {x: 1000, y: 1000, width: 100, height: 100},
      },
      {
        zoomLevel: 4,
        gridX: 0,
        gridY: 0,
        bounds: {x: 0, y: 0, width: 100, height: 100},
      },
    ],
    {
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      viewportWidth: 100,
      viewportHeight: 100,
    },
  )

  assert.equal(ordered[0]?.gridX, 0)
  assert.equal(ordered[0]?.gridY, 0)
})

test('resolveRoiPrioritizedPreloadTiles handles invalid scale by falling back to 1', () => {
  const ordered = resolveRoiPrioritizedPreloadTiles(
    [
      {
        zoomLevel: 3,
        gridX: 2,
        gridY: 0,
        bounds: {x: 200, y: 0, width: 100, height: 100},
      },
      {
        zoomLevel: 3,
        gridX: 0,
        gridY: 0,
        bounds: {x: 0, y: 0, width: 100, height: 100},
      },
    ],
    {
      offsetX: 0,
      offsetY: 0,
      scale: 0,
      viewportWidth: 100,
      viewportHeight: 100,
    },
  )

  assert.equal(ordered[0]?.gridX, 0)
  assert.equal(ordered[0]?.gridY, 0)
})
