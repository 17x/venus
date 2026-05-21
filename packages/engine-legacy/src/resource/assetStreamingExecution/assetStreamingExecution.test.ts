import assert from 'node:assert/strict'
import test from 'node:test'

import type { EngineStreamingPlan } from '../assetStreamingPlan/assetStreamingPlan.ts'
import {
  executeEngineStreamingPlan,
} from './assetStreamingExecution.ts'

/**
 * Verifies streaming execution applies cancel, eviction, then load callbacks deterministically.
 */
test('executeEngineStreamingPlan executes cancel evict and load phases in order', async () => {
  const calls: string[] = []
  const summary = await executeEngineStreamingPlan(createPlan(), {
    cancelAsset: (assetId) => {
      calls.push(`cancel:${assetId}`)
    },
    evictAsset: (assetId) => {
      calls.push(`evict:${assetId}`)
    },
    loadAsset: (request) => {
      calls.push(`load:${request.assetId}`)
    },
  })

  assert.deepEqual(calls, ['cancel:stale', 'evict:old', 'load:mesh-a'])
  assert.deepEqual(summary.cancelledAssetIds, ['stale'])
  assert.equal(summary.cancelledCount, 1)
  assert.deepEqual(summary.evictedAssetIds, ['old'])
  assert.equal(summary.evictedCount, 1)
  assert.equal(summary.evictedBytes, 32)
  assert.equal(summary.retainedBytes, 64)
  assert.deepEqual(summary.loadedAssetIds, ['mesh-a'])
  assert.equal(summary.loadedCount, 1)
  assert.equal(summary.loadedBytes, 64)
})

/**
 * Verifies async loader callbacks are awaited before summary emission.
 */
test('executeEngineStreamingPlan awaits async load callbacks', async () => {
  const calls: string[] = []
  const summary = await executeEngineStreamingPlan(createPlan(), {
    async cancelAsset(assetId) {
      calls.push(`cancel:${assetId}`)
    },
    async evictAsset(assetId) {
      calls.push(`evict:${assetId}`)
    },
    async loadAsset(request) {
      await Promise.resolve()
      calls.push(`load:${request.assetId}`)
    },
  })

  assert.deepEqual(calls, ['cancel:stale', 'evict:old', 'load:mesh-a'])
  assert.deepEqual(summary.loadedAssetIds, ['mesh-a'])
})

/**
 * Verifies loader/cache failures propagate instead of producing a success-shaped summary.
 */
test('executeEngineStreamingPlan propagates execution errors', async () => {
  await assert.rejects(
    () => executeEngineStreamingPlan(createPlan(), {
      cancelAsset: () => {},
      evictAsset: () => {
        throw new Error('evict failed')
      },
      loadAsset: () => {},
    }),
    /evict failed/,
  )
})

/**
 * Intent: create one representative streaming plan fixture.
 * @returns Streaming plan fixture.
 */
function createPlan(): EngineStreamingPlan {
  return {
    cancelAssetIds: ['stale'],
    evictAssetIds: ['old'],
    loadRequests: [{
      assetId: 'mesh-a',
      kind: 'mesh',
      priority: 10,
      estimatedBytes: 64,
      visible: true,
      distanceToCamera: 1,
      requestedAtMs: 1,
    }],
    retainedBytes: 64,
    evictedBytes: 32,
  }
}
