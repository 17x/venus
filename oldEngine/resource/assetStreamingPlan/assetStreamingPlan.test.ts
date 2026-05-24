import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineStreamingPlan,
  type EngineStreamingAssetRequest,
  type EngineStreamingCacheEntry,
} from './assetStreamingPlan.ts'

/**
 * Verifies visible high-priority assets win load slots before distant hidden assets.
 */
test('resolveEngineStreamingPlan prioritizes visible mesh and texture loads', () => {
  const requests: EngineStreamingAssetRequest[] = [
    {
      assetId: 'hidden-texture',
      kind: 'texture',
      priority: 100,
      estimatedBytes: 10,
      visible: false,
      distanceToCamera: 1,
      requestedAtMs: 0,
    },
    {
      assetId: 'visible-mesh',
      kind: 'mesh',
      priority: 10,
      estimatedBytes: 20,
      visible: true,
      distanceToCamera: 20,
      requestedAtMs: 0,
    },
    {
      assetId: 'visible-texture',
      kind: 'texture',
      priority: 20,
      estimatedBytes: 15,
      visible: true,
      distanceToCamera: 30,
      requestedAtMs: 0,
    },
  ]

  const plan = resolveEngineStreamingPlan({
    requests,
    inFlightAssetIds: [],
    cache: [],
    budget: {
      maxBytes: 100,
      targetBytes: 80,
      maxConcurrentLoads: 2,
    },
  })

  assert.deepEqual(plan.loadRequests.map((request) => request.assetId), ['visible-texture', 'visible-mesh'])
})

/**
 * Verifies in-flight assets without current demand are cancelled deterministically.
 */
test('resolveEngineStreamingPlan cancels in-flight assets that lost demand', () => {
  const plan = resolveEngineStreamingPlan({
    requests: [{
      assetId: 'needed-mesh',
      kind: 'mesh',
      priority: 1,
      estimatedBytes: 10,
      visible: true,
      distanceToCamera: 0,
      requestedAtMs: 0,
    }],
    inFlightAssetIds: ['stale-texture', 'needed-mesh', 'old-mesh'],
    cache: [],
    budget: {
      maxBytes: 100,
      targetBytes: 80,
      maxConcurrentLoads: 4,
    },
  })

  assert.deepEqual(plan.cancelAssetIds, ['old-mesh', 'stale-texture'])
})

/**
 * Verifies cache eviction respects locks and current-frame demand while recovering soft headroom.
 */
test('resolveEngineStreamingPlan evicts unlocked least-recently-used cache entries', () => {
  const cache: EngineStreamingCacheEntry[] = [
    {
      assetId: 'locked-mesh',
      kind: 'mesh',
      byteSize: 50,
      lastUsedAtMs: 0,
      locked: true,
    },
    {
      assetId: 'requested-texture',
      kind: 'texture',
      byteSize: 40,
      lastUsedAtMs: 10,
    },
    {
      assetId: 'old-texture',
      kind: 'texture',
      byteSize: 30,
      lastUsedAtMs: 1,
    },
    {
      assetId: 'older-mesh',
      kind: 'mesh',
      byteSize: 30,
      lastUsedAtMs: 2,
    },
  ]

  const plan = resolveEngineStreamingPlan({
    requests: [{
      assetId: 'requested-texture',
      kind: 'texture',
      priority: 1,
      estimatedBytes: 40,
      visible: true,
      distanceToCamera: 0,
      requestedAtMs: 0,
    }],
    inFlightAssetIds: [],
    cache,
    budget: {
      maxBytes: 120,
      targetBytes: 90,
      maxConcurrentLoads: 2,
    },
  })

  assert.deepEqual(plan.evictAssetIds, ['old-texture', 'older-mesh'])
  assert.equal(plan.evictedBytes, 60)
  assert.equal(plan.retainedBytes, 90)
})
