import test from 'node:test'
import assert from 'node:assert/strict'
import { TileScheduler } from './tileScheduler.ts'
import type { TileRenderRequest } from '../tileManager/index.ts'

/**
 * Handles createRequest.
 * @param input Input payload for this operation.
 */
function createRequest(input: {
  key: string
  x: number
  y: number
  zoomBucket?: number
  priority: TileRenderRequest['priority']
  reason?: TileRenderRequest['reason']
}): TileRenderRequest {
  // Keep test request construction compact so each scenario focuses on queue behavior.
  return {
    key: input.key,
    coord: {
      x: input.x,
      y: input.y,
      zoomBucket: input.zoomBucket ?? 3,
    },
    worldBounds: {
      x: input.x * 512,
      y: input.y * 512,
      width: 512,
      height: 512,
    },
    priority: input.priority,
    reason: input.reason ?? 'missing',
  }
}

test('TileScheduler upgrades duplicate request priority and dedupes by key', () => {
  const scheduler = new TileScheduler()
  const processed: string[] = []

  scheduler.requestTile(
    createRequest({
      key: 'tile:0',
      x: 0,
      y: 0,
      priority: 'nearby',
      reason: 'preload',
    }),
  )
  scheduler.requestTile(
    createRequest({
      key: 'tile:0',
      x: 0,
      y: 0,
      priority: 'urgent',
      reason: 'dirty',
    }),
  )

  // Duplicate key should keep only one request and preserve the higher priority.
  assert.equal(scheduler.getPendingCount(), 1)
  scheduler.tick({
    frameBudgetMs: Number.POSITIVE_INFINITY,
    process: (request) => {
      processed.push(`${request.key}:${request.priority}`)
    },
    nowMs: (() => {
      let cursor = 0
      return () => {
        cursor += 1
        return cursor
      }
    })(),
  })

  assert.deepEqual(processed, ['tile:0:urgent'])
  assert.equal(scheduler.getPendingCount(), 0)
})

test('TileScheduler processes higher-priority work before nearby/background items', () => {
  const scheduler = new TileScheduler()
  const processed: string[] = []

  scheduler.requestMany([
    createRequest({ key: 'tile:near', x: 1, y: 1, priority: 'nearby', reason: 'preload' }),
    createRequest({ key: 'tile:bg', x: 2, y: 2, priority: 'background', reason: 'preload' }),
    createRequest({ key: 'tile:urg', x: 3, y: 3, priority: 'urgent', reason: 'dirty' }),
    createRequest({ key: 'tile:vis', x: 4, y: 4, priority: 'visible', reason: 'missing' }),
  ])

  scheduler.tick({
    frameBudgetMs: Number.POSITIVE_INFINITY,
    process: (request) => {
      processed.push(request.key)
    },
    nowMs: (() => {
      let cursor = 0
      return () => {
        cursor += 1
        return cursor
      }
    })(),
  })

  // Priority order should be urgent -> visible -> nearby -> background.
  assert.deepEqual(processed, ['tile:urg', 'tile:vis', 'tile:near', 'tile:bg'])
})

test('TileScheduler promotes starved background work to avoid indefinite queue starvation', () => {
  const scheduler = new TileScheduler()
  const processed: string[] = []

  scheduler.requestMany([
    createRequest({ key: 'tile:bg-old', x: 0, y: 0, priority: 'background', reason: 'preload' }),
    createRequest({ key: 'tile:urg-new', x: 1, y: 1, priority: 'urgent', reason: 'dirty' }),
  ])

  scheduler.tick({
    frameBudgetMs: Number.POSITIVE_INFINITY,
    maxRequests: 2,
    process: (request) => {
      processed.push(request.key)
    },
    // Use a large synthetic clock jump so the first enqueued background tile
    // is promoted before draining work for this tick.
    nowMs: () => 10_000,
  })

  // The old background request should not starve and must flush in the same tick.
  assert.equal(processed.length, 2)
  assert.ok(processed.includes('tile:bg-old'))
  assert.ok(processed.includes('tile:urg-new'))
})

test('TileScheduler cancelOutdatedRequests keeps only visible/nearby viewport region', () => {
  const scheduler = new TileScheduler()

  scheduler.requestMany([
    // Keep request zoom bucket aligned with scale=1 camera to match cancellation window.
    createRequest({ key: 'tile:center', x: 0, y: 0, zoomBucket: 1, priority: 'visible' }),
    createRequest({ key: 'tile:ring', x: 1, y: 0, zoomBucket: 1, priority: 'nearby', reason: 'preload' }),
    createRequest({ key: 'tile:far', x: 12, y: 12, zoomBucket: 1, priority: 'background', reason: 'preload' }),
  ])

  const removed = scheduler.cancelOutdatedRequests({
    camera: {
      viewportWidth: 512,
      viewportHeight: 512,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    },
    tileSizeCssPx: 512,
    overscanCssPx: 0,
    nearbyRing: 1,
  })

  // Far-away requests should be pruned while center/nearby requests remain.
  assert.equal(removed, 1)
  assert.equal(scheduler.getPendingCount(), 2)
})

test('TileScheduler cancelOutdatedRequests keeps requests in active neighboring buckets', () => {
  const scheduler = new TileScheduler()

  scheduler.requestMany([
    createRequest({ key: 'tile:curr', x: 0, y: 0, zoomBucket: 1, priority: 'visible' }),
    createRequest({ key: 'tile:next', x: 0, y: 0, zoomBucket: 2, priority: 'nearby', reason: 'preload' }),
    createRequest({ key: 'tile:far-bucket', x: 0, y: 0, zoomBucket: 8, priority: 'background', reason: 'preload' }),
  ])

  const removed = scheduler.cancelOutdatedRequests({
    camera: {
      viewportWidth: 512,
      viewportHeight: 512,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    },
    zoomBuckets: [0.5, 1, 2, 4, 8],
    activeBucketRadius: 1,
    tileSizeCssPx: 512,
    overscanCssPx: 0,
    nearbyRing: 0,
  })

  // Neighbor bucket (2x) stays, but far bucket request is pruned.
  assert.equal(removed, 1)
  assert.equal(scheduler.getPendingCount(), 2)
})
