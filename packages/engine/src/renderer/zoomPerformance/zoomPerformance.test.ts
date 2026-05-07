import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createZoomBuckets,
  DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG,
  getZoomRenderStrategy,
  resolveActiveZoomBuckets,
  resolveEngineZoomPerformanceConfig,
  resolveNearestZoomBucket,
} from './zoomPerformance.ts'

test('zoomPerformance resolves defaults and builds dynamic buckets', () => {
  // Keep invalid caller overrides from collapsing the dynamic bucket generator.
  const resolved = resolveEngineZoomPerformanceConfig({
    minZoom: -1,
    maxZoom: 0,
    bucketStep: 1,
    activeBucketRadius: -1,
  })

  assert.equal(resolved.minZoom, DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.minZoom)
  assert.equal(resolved.maxZoom, DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.maxZoom)
  assert.equal(resolved.bucketStep, DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.bucketStep)
  assert.equal(resolved.activeBucketRadius, DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.activeBucketRadius)

  const buckets = createZoomBuckets({
    minZoom: 0.01,
    maxZoom: 640,
    bucketStep: 2,
  })
  assert.ok(buckets.length > 0)
  assert.ok(buckets[0] <= 0.01)
  assert.ok(buckets[buckets.length - 1] >= 640)
})

test('zoomPerformance resolves nearest and active buckets in log space', () => {
  const buckets = createZoomBuckets({
    minZoom: 0.01,
    maxZoom: 640,
    bucketStep: 2,
  })

  const nearest = resolveNearestZoomBucket(0.3, buckets)
  assert.equal(nearest, 0.25)

  const active = resolveActiveZoomBuckets({
    zoom: 1,
    buckets,
    activeBucketRadius: 1,
  })
  assert.deepEqual(active, [0.5, 1, 2])
})

test('zoomPerformance picks strategy by zoom + interaction + density', () => {
  const strategy = DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.strategy

  // Interaction frames should stay in tile-friendly lanes.
  assert.equal(
    getZoomRenderStrategy({
      zoom: 0.02,
      visibleElementCount: 10,
      interactionState: 'zooming',
      strategy,
    }),
    'overview',
  )

  // Idle high-zoom sparse scenes should prefer local precise rendering.
  assert.equal(
    getZoomRenderStrategy({
      zoom: 120,
      visibleElementCount: 80,
      interactionState: 'idle',
      strategy,
    }),
    'local-precise',
  )

  // Idle high-zoom dense scenes should keep hybrid mode until localHybridMaxZoom.
  assert.equal(
    getZoomRenderStrategy({
      zoom: 16,
      visibleElementCount: 10000,
      interactionState: 'idle',
      strategy,
    }),
    'local-tile-vector-hybrid',
  )
})
