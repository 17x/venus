import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveCreateEngineVisibilityLodDiagnostics,
} from './createEngineVisibilityLodDiagnostics.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'

/**
 * Verifies empty or unavailable frame plans produce zeroed visibility LOD diagnostics.
 */
test('resolveCreateEngineVisibilityLodDiagnostics returns zero counts without a frame plan', () => {
  const plan = resolveCreateEngineVisibilityLodDiagnostics(null, 'low')

  assert.equal(plan.entries.length, 0)
  assert.equal(plan.fullCount, 0)
  assert.equal(plan.reducedCount, 0)
  assert.equal(plan.proxyCount, 0)
  assert.equal(plan.culledCount, 0)
})

/**
 * Verifies pressure-aware LOD diagnostics are derived from frame-plan candidate order.
 */
test('resolveCreateEngineVisibilityLodDiagnostics classifies frame-plan candidates', () => {
  const framePlan: EngineFramePlan = {
    revision: 'r1',
    planVersion: 1,
    sceneNodeCount: 4,
    candidateNodeIds: ['a', 'b', 'c', 'd'],
    candidateCount: 4,
    viewportBounds: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    queryPadding: 0,
  }

  const plan = resolveCreateEngineVisibilityLodDiagnostics(framePlan, 'high')

  assert.equal(plan.entries.length, 4)
  assert.equal(plan.entries[0]?.thresholdScale, 0.5)
  assert.equal(plan.fullCount, 4)
  assert.equal(plan.reducedCount, 0)
  assert.equal(plan.proxyCount, 0)
  assert.equal(plan.culledCount, 0)
})
