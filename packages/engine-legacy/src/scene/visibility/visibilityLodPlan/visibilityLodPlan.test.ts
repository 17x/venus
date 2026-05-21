import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineVisibilityLodPlan,
} from './visibilityLodPlan.ts'

/**
 * Verifies low-pressure LOD plan classifies full, reduced, proxy, and culled bands.
 */
test('resolveEngineVisibilityLodPlan classifies candidates by distance and area', () => {
  const plan = resolveEngineVisibilityLodPlan({
    candidates: [
      {nodeId: 'near', distanceToCamera: 5, projectedScreenArea: 100},
      {nodeId: 'mid', distanceToCamera: 40, projectedScreenArea: 100},
      {nodeId: 'far', distanceToCamera: 90, projectedScreenArea: 100},
      {nodeId: 'tiny', distanceToCamera: 5, projectedScreenArea: 2},
      {nodeId: 'culled', distanceToCamera: 5, projectedScreenArea: 0},
    ],
    thresholds: {
      fullDistance: 10,
      reducedDistance: 50,
      proxyArea: 10,
    },
    pressure: 'low',
  })

  assert.deepEqual(
    plan.entries.map((entry) => [entry.nodeId, entry.lodLevel]),
    [
      ['near', 'full'],
      ['mid', 'reduced'],
      ['far', 'proxy'],
      ['tiny', 'proxy'],
      ['culled', 'culled'],
    ],
  )
  assert.equal(plan.fullCount, 1)
  assert.equal(plan.reducedCount, 1)
  assert.equal(plan.proxyCount, 2)
  assert.equal(plan.culledCount, 1)
})

/**
 * Verifies higher pressure tightens distance thresholds for dynamic detail reduction.
 */
test('resolveEngineVisibilityLodPlan tightens thresholds under high pressure', () => {
  const plan = resolveEngineVisibilityLodPlan({
    candidates: [
      {nodeId: 'near', distanceToCamera: 8, projectedScreenArea: 100},
      {nodeId: 'mid', distanceToCamera: 30, projectedScreenArea: 100},
    ],
    thresholds: {
      fullDistance: 10,
      reducedDistance: 50,
      proxyArea: 10,
    },
    pressure: 'high',
  })

  assert.deepEqual(
    plan.entries.map((entry) => [entry.nodeId, entry.lodLevel, entry.thresholdScale]),
    [
      ['near', 'reduced', 0.5],
      ['mid', 'proxy', 0.5],
    ],
  )
})
