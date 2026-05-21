import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineVisibilityOcclusionPlan,
} from './visibilityOcclusionPlan.ts'

/**
 * Verifies nearer screen-space occluders hide sufficiently covered deeper candidates.
 */
test('resolveEngineVisibilityOcclusionPlan culls candidates behind covering occluders', () => {
  const plan = resolveEngineVisibilityOcclusionPlan({
    thresholds: {
      coverageRatio: 0.9,
      minOccluderArea: 10,
      depthEpsilon: 0.01,
    },
    candidates: [
      {
        nodeId: 'front',
        screenBounds: {x: 0, y: 0, width: 100, height: 100},
        depth: 1,
        occluder: true,
      },
      {
        nodeId: 'back',
        screenBounds: {x: 10, y: 10, width: 50, height: 50},
        depth: 2,
        occluder: false,
      },
    ],
  })

  assert.equal(plan.visibleCount, 1)
  assert.equal(plan.occludedCount, 1)
  assert.equal(plan.entries[1]?.occluded, true)
  assert.equal(plan.entries[1]?.occludedBy, 'front')
  assert.equal(plan.entries[1]?.reason, 'behind-occluder')
})

/**
 * Verifies depth ordering prevents farther candidates from hiding nearer candidates.
 */
test('resolveEngineVisibilityOcclusionPlan requires occluders to be nearer than candidates', () => {
  const plan = resolveEngineVisibilityOcclusionPlan({
    thresholds: {
      coverageRatio: 0.5,
      minOccluderArea: 10,
      depthEpsilon: 0.01,
    },
    candidates: [
      {
        nodeId: 'front',
        screenBounds: {x: 0, y: 0, width: 20, height: 20},
        depth: 1,
        occluder: false,
      },
      {
        nodeId: 'back-occluder',
        screenBounds: {x: 0, y: 0, width: 100, height: 100},
        depth: 2,
        occluder: true,
      },
    ],
  })

  assert.equal(plan.visibleCount, 2)
  assert.equal(plan.occludedCount, 0)
})

/**
 * Verifies parent occlusion propagates to descendants even when descendant bounds are small.
 */
test('resolveEngineVisibilityOcclusionPlan propagates parent occlusion to children', () => {
  const plan = resolveEngineVisibilityOcclusionPlan({
    thresholds: {
      coverageRatio: 0.9,
      minOccluderArea: 10,
      depthEpsilon: 0,
    },
    candidates: [
      {
        nodeId: 'occluder',
        screenBounds: {x: 0, y: 0, width: 100, height: 100},
        depth: 1,
        occluder: true,
      },
      {
        nodeId: 'parent',
        screenBounds: {x: 10, y: 10, width: 50, height: 50},
        depth: 2,
        occluder: false,
      },
      {
        nodeId: 'child',
        parentId: 'parent',
        screenBounds: {x: 200, y: 200, width: 10, height: 10},
        depth: 3,
        occluder: false,
      },
    ],
  })

  assert.equal(plan.entries[1]?.reason, 'behind-occluder')
  assert.equal(plan.entries[2]?.occluded, true)
  assert.equal(plan.entries[2]?.occludedBy, 'occluder')
  assert.equal(plan.entries[2]?.reason, 'parent-occluded')
})

/**
 * Verifies occluder area thresholds keep tiny candidates from hiding larger scene nodes.
 */
test('resolveEngineVisibilityOcclusionPlan ignores occluders below minimum area', () => {
  const plan = resolveEngineVisibilityOcclusionPlan({
    thresholds: {
      coverageRatio: 0.5,
      minOccluderArea: 100,
      depthEpsilon: 0,
    },
    candidates: [
      {
        nodeId: 'tiny-front',
        screenBounds: {x: 0, y: 0, width: 5, height: 5},
        depth: 1,
        occluder: true,
      },
      {
        nodeId: 'back',
        screenBounds: {x: 0, y: 0, width: 5, height: 5},
        depth: 2,
        occluder: false,
      },
    ],
  })

  assert.equal(plan.visibleCount, 2)
  assert.equal(plan.occludedCount, 0)
})
