import assert from 'node:assert/strict'
import test from 'node:test'

import type { EngineMat4 } from '../../../math/dimension/types.ts'
import {
  resolveEngineMeshRayHits,
} from './meshRayIntersector.ts'

/**
 * Verifies a ray resolves the nearest mesh triangle with depth metadata.
 */
test('resolveEngineMeshRayHits returns nearest mesh triangle hit', () => {
  const summary = resolveEngineMeshRayHits({
    ray: {
      origin: {x: 0.25, y: 0.25, z: 2},
      direction: {x: 0, y: 0, z: -1},
    },
    candidates: [{
      nodeId: 'mesh-a',
      nodeType: 'shape',
      geometry: {
        vertices: [
          {x: 0, y: 0, z: 0},
          {x: 1, y: 0, z: 0},
          {x: 0, y: 1, z: 0},
        ],
        triangles: [[0, 1, 2]],
      },
    }],
  })

  assert.equal(summary.hits.length, 1)
  assert.equal(summary.hits[0]?.nodeId, 'mesh-a')
  assert.equal(summary.hits[0]?.hitTargetKind, 'mesh')
  assert.equal(summary.hits[0]?.rayDistance, 2)
  assert.deepEqual(summary.hits[0]?.hitPoint, {x: 0.25, y: 0.25})
  assert.equal(summary.exactCheckCount, 1)
  assert.equal(summary.exactBudgetExceeded, false)
})

/**
 * Verifies max-distance rejection preserves traversal accounting.
 */
test('resolveEngineMeshRayHits rejects hits beyond max distance', () => {
  const summary = resolveEngineMeshRayHits({
    ray: {
      origin: {x: 0.25, y: 0.25, z: 2},
      direction: {x: 0, y: 0, z: -1},
    },
    maxDistance: 1,
    candidates: [{
      nodeId: 'mesh-a',
      nodeType: 'shape',
      geometry: {
        vertices: [
          {x: 0, y: 0, z: 0},
          {x: 1, y: 0, z: 0},
          {x: 0, y: 1, z: 0},
        ],
        triangles: [[0, 1, 2]],
      },
    }],
  })

  assert.equal(summary.hits.length, 0)
  assert.equal(summary.exactCheckCount, 1)
  assert.equal(summary.exactBudgetExceeded, false)
})

/**
 * Verifies instance transforms produce instance metadata and transformed hit depth.
 */
test('resolveEngineMeshRayHits supports transformed mesh instances', () => {
  const translateZMinusOne: EngineMat4 = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, -1,
    0, 0, 0, 1,
  ]

  const summary = resolveEngineMeshRayHits({
    ray: {
      origin: {x: 0.25, y: 0.25, z: 2},
      direction: {x: 0, y: 0, z: -1},
    },
    candidates: [{
      nodeId: 'mesh-a',
      nodeType: 'shape',
      instanceId: 'instance-1',
      transform: translateZMinusOne,
      geometry: {
        vertices: [
          {x: 0, y: 0, z: 0},
          {x: 1, y: 0, z: 0},
          {x: 0, y: 1, z: 0},
        ],
        triangles: [[0, 1, 2]],
      },
    }],
  })

  assert.equal(summary.hits[0]?.hitTargetKind, 'instance')
  assert.equal(summary.hits[0]?.instanceId, 'instance-1')
  assert.equal(summary.hits[0]?.rayDistance, 3)
})

/**
 * Verifies traversal budgets stop exact triangle checks deterministically.
 */
test('resolveEngineMeshRayHits marks exact budget exhaustion', () => {
  const summary = resolveEngineMeshRayHits({
    ray: {
      origin: {x: 0.25, y: 0.25, z: 2},
      direction: {x: 0, y: 0, z: -1},
    },
    exactCheckBudget: 1,
    candidates: [{
      nodeId: 'mesh-a',
      nodeType: 'shape',
      geometry: {
        vertices: [
          {x: 0, y: 0, z: 0},
          {x: 1, y: 0, z: 0},
          {x: 0, y: 1, z: 0},
          {x: 0, y: 0, z: -1},
        ],
        triangles: [[0, 1, 2], [0, 1, 3]],
      },
    }],
  })

  assert.equal(summary.exactCheckCount, 1)
  assert.equal(summary.exactCheckBudget, 1)
  assert.equal(summary.exactBudgetExceeded, true)
})
