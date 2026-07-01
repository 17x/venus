import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LayeredTileCache,
  toLayeredTileCacheSignature,
  type LayeredTileCacheKey,
} from './tileCache.ts'

test('toLayeredTileCacheSignature produces stable format', () => {
  const key: LayeredTileCacheKey = {zoomBucket: 2, x: 3, y: 4}

  assert.equal(toLayeredTileCacheSignature(key), '2:3:4')
})

test('LayeredTileCache stores and retrieves by tile coordinates', () => {
  const cache = new LayeredTileCache<string>()

  cache.set({zoomBucket: 1, x: 0, y: 0}, 'tile-a')
  cache.set({zoomBucket: 1, x: 1, y: 0}, 'tile-b')
  cache.set({zoomBucket: 2, x: 0, y: 0}, 'tile-c')

  assert.equal(cache.get({zoomBucket: 1, x: 0, y: 0}), 'tile-a')
  assert.equal(cache.get({zoomBucket: 1, x: 1, y: 0}), 'tile-b')
  assert.equal(cache.get({zoomBucket: 2, x: 0, y: 0}), 'tile-c')
  assert.equal(cache.get({zoomBucket: 1, x: 2, y: 0}), null)
})

test('LayeredTileCache isolates entries across zoom buckets', () => {
  const cache = new LayeredTileCache<string>()

  cache.set({zoomBucket: 0, x: 5, y: 5}, 'low-zoom')
  cache.set({zoomBucket: 3, x: 5, y: 5}, 'high-zoom')

  assert.equal(cache.get({zoomBucket: 0, x: 5, y: 5}), 'low-zoom')
  assert.equal(cache.get({zoomBucket: 3, x: 5, y: 5}), 'high-zoom')
})

test('LayeredTileCache delete removes one tile and leaves others', () => {
  const cache = new LayeredTileCache<string>()

  cache.set({zoomBucket: 1, x: 0, y: 0}, 'keep')
  cache.set({zoomBucket: 1, x: 1, y: 1}, 'drop')

  cache.delete({zoomBucket: 1, x: 1, y: 1})

  assert.equal(cache.get({zoomBucket: 1, x: 0, y: 0}), 'keep')
  assert.equal(cache.get({zoomBucket: 1, x: 1, y: 1}), null)
})

test('LayeredTileCache clear empties all tiles', () => {
  const cache = new LayeredTileCache<string>()

  cache.set({zoomBucket: 0, x: 0, y: 0}, 'a')
  cache.set({zoomBucket: 1, x: 0, y: 0}, 'b')
  cache.clear()

  assert.equal(cache.get({zoomBucket: 0, x: 0, y: 0}), null)
  assert.equal(cache.get({zoomBucket: 1, x: 0, y: 0}), null)
})
