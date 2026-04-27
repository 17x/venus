import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EngineTileCache,
  createTileKey,
  getActiveZoomBuckets,
  getTileBounds,
  getTilesIntersectingBounds,
  getViewportWorldBounds,
  getVisibleTilesForCamera,
  getWorldTileSize,
  getZoomBucket,
  getZoomLevelForScale,
  resolveTileTextureWithFallback,
  unionEngineRectBounds,
} from './tileManager.ts'

function withFakePerformanceNow(run: (advance: (value: number) => void) => void) {
  let now = 0
  const originalPerformance = globalThis.performance
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: {
      now: () => now,
    },
  })

  try {
    run((value) => {
      now = value
    })
  } finally {
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      value: originalPerformance,
    })
  }
}

test('tileManager helpers resolve stable keys, zoom buckets, and world bounds', () => {
  // Helper contracts should keep tile addressing deterministic across render variants.
  assert.equal(createTileKey({tileX: 1, tileY: 2, zoomBucket: 4, dpr: 2, themeVersion: 0, renderVersion: 9}), '4:1:2:2:0:9')
  assert.equal(getZoomBucket(0.3), 0.25)
  assert.deepEqual(getActiveZoomBuckets(1), [0.5, 1, 2])
  assert.equal(getWorldTileSize(512, 0.25), 2048)
  assert.deepEqual(
    getViewportWorldBounds({viewportWidth: 400, viewportHeight: 200, offsetX: 40, offsetY: 20, scale: 2}, 20),
    {x: -30, y: -20, width: 220, height: 120},
  )
})

test('tileManager helper geometry resolves visible tiles and unions invalidation bounds', () => {
  const visible = getVisibleTilesForCamera({
    camera: {
      viewportWidth: 512,
      viewportHeight: 512,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    },
    zoomBucket: 1,
    tileSizeCssPx: 512,
  })

  // A one-tile viewport should cover the origin tile plus its far edge tile.
  assert.equal(visible.length, 4)
  // Visible tile coordinates can preserve negative zero from viewport math.
  assert.equal(Math.abs(visible[0]?.coord.x ?? 0), 0)
  assert.equal(Math.abs(visible[0]?.coord.y ?? 0), 0)
  assert.equal(visible[0]?.coord.zoomBucket, 1)
  assert.deepEqual(getTileBounds(2, 3, 128), {x: 256, y: 384, width: 128, height: 128})
  assert.deepEqual(getTilesIntersectingBounds({x: 10, y: 10, width: 260, height: 260}, 128), [
    {gridX: 0, gridY: 0},
    {gridX: 0, gridY: 1},
    {gridX: 0, gridY: 2},
    {gridX: 1, gridY: 0},
    {gridX: 1, gridY: 1},
    {gridX: 1, gridY: 2},
    {gridX: 2, gridY: 0},
    {gridX: 2, gridY: 1},
    {gridX: 2, gridY: 2},
  ])
  assert.deepEqual(
    unionEngineRectBounds({x: 10, y: 15, width: 20, height: 30}, {x: -5, y: 20, width: 50, height: 10}),
    {x: -5, y: 15, width: 50, height: 30},
  )
})

test('getZoomLevelForScale keeps the previous bucket inside hysteresis bounds', () => {
  // Minor oscillation around a bucket edge should not thrash the selected tile level.
  assert.equal(getZoomLevelForScale(0.24, 1), 1)
  assert.equal(getZoomLevelForScale(0.23, 2), 2)
  // Keep extreme overview/deep-zoom scales mapped away from the 100% cache bucket.
  assert.equal(getZoomLevelForScale(0.02, 5), 0)
  assert.equal(getZoomLevelForScale(2.4, 4), 5)
  assert.equal(getZoomLevelForScale(32, 0), 5)
})

test('resolveTileTextureWithFallback prefers exact then nearest then overview', () => {
  const exact = {dirty: false, key: 'exact'}
  const nearest = {dirty: false, key: 'nearest'}
  const overview = {dirty: false, key: 'overview'}

  assert.equal(
    resolveTileTextureWithFallback({
      resolver: {
        getExact: () => exact as never,
      },
      coord: {x: 0, y: 0, zoomBucket: 1},
      cameraZoom: 1,
    }).level,
    'exact',
  )
  assert.equal(
    resolveTileTextureWithFallback({
      resolver: {
        getExact: () => ({dirty: true}) as never,
        getNearest: () => nearest as never,
      },
      coord: {x: 0, y: 0, zoomBucket: 1},
      cameraZoom: 1,
    }).level,
    'nearest',
  )
  assert.equal(
    resolveTileTextureWithFallback({
      resolver: {
        getExact: () => null,
        getNearest: () => ({dirty: true}) as never,
        getOverview: () => overview as never,
      },
      coord: {x: 0, y: 0, zoomBucket: 1},
      cameraZoom: 1,
    }).level,
    'overview',
  )
})

test('EngineTileCache invalidates, reports dirty tiles, and evicts least useful entries first', () => {
  withFakePerformanceNow((advance) => {
    const cache = new EngineTileCache({
      enabled: true,
      tileSizePx: 512,
      maxCacheSize: 2,
      softLimitBytes: 1024,
      hardLimitBytes: 2048,
    })

    advance(1)
    cache.upsertEntry({zoomLevel: 5, gridX: 0, gridY: 0, textureId: 1, textureBytes: 400})
    advance(2)
    cache.upsertEntry({zoomLevel: 4, gridX: 1, gridY: 0, textureId: 2, textureBytes: 400})
    cache.invalidateTile(5, 0, 0)
    assert.deepEqual(cache.getDirtyTiles(), [{zoomLevel: 5, gridX: 0, gridY: 0}])

    advance(3)
    cache.upsertEntry({zoomLevel: 5, gridX: 2, gridY: 0, textureId: 3, textureBytes: 400})

    // The non-current zoom tile should be evicted before the current-zoom entries.
    assert.equal(cache.getEntry(4, 1, 0), null)
    assert.ok(cache.getEntry(5, 0, 0))
    assert.ok(cache.getEntry(5, 2, 0))

    cache.invalidateTilesForBoundsDelta(
      {x: 0, y: 0, width: 32, height: 32},
      {x: 1040, y: 0, width: 32, height: 32},
      5,
    )
    assert.equal(cache.getDirtyTiles().length, 2)
    cache.clearDirtyFlags()
    assert.equal(cache.getDirtyTiles().length, 0)
  })
})