import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngineHitResolver, createEnginePointHitQuery } from './resolver.ts'

test('createEngineHitResolver resolves point-2d hits through point callback', () => {
  const resolver = createEngineHitResolver({
    resolvePointHits: (query) => {
      assert.equal(query.mode, 'point-2d')
      return {
        hits: [{
          index: 0,
          nodeId: 'shape-1',
          nodeType: 'shape',
          hitType: 'shape-body',
          score: 1,
          zOrder: 0,
          hitPoint: query.point,
        }],
        exactCheckCount: 2,
        exactCheckBudget: 10,
        exactBudgetExceeded: false,
      }
    },
  })

  const result = resolver.resolve(createEnginePointHitQuery({x: 10, y: 20}, 4))
  assert.equal(result.mode, 'point-2d')
  assert.equal(result.primaryHit?.nodeId, 'shape-1')
  assert.equal(result.exactCheckCount, 2)
  assert.equal(result.exactCheckBudget, 10)
  assert.equal(result.exactBudgetExceeded, false)
})

test('createEngineHitResolver ray fallback projects origin-aligned rays onto scene plane when no native 3D callback exists', () => {
  const resolver = createEngineHitResolver({
    resolvePointHits: (query) => {
      return {
        hits: [{
          index: 1,
          nodeId: 'shape-from-ray-origin',
          nodeType: 'shape',
          hitType: 'shape-body',
          score: 2,
          zOrder: 1,
          hitPoint: query.point,
        }],
        exactCheckCount: 1,
        exactCheckBudget: 5,
        exactBudgetExceeded: false,
      }
    },
  })

  const result = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 42, y: 7, z: 99},
      direction: {x: 0, y: 0, z: -1},
    },
    maxDistance: 1000,
  })

  assert.equal(result.mode, 'ray-3d')
  assert.equal(result.primaryHit?.nodeId, 'shape-from-ray-origin')
  assert.equal(result.hits[0]?.hitPoint.x, 42)
  assert.equal(result.hits[0]?.hitPoint.y, 7)
})

test('createEngineHitResolver ray fallback projects ray intersection point on z=0 plane', () => {
  const resolver = createEngineHitResolver({
    resolvePointHits: (query) => {
      return {
        hits: [{
          index: 0,
          nodeId: 'projected-hit',
          nodeType: 'shape',
          hitType: 'shape-body',
          score: 1,
          zOrder: 0,
          hitPoint: query.point,
        }],
        exactCheckCount: 1,
        exactCheckBudget: 1,
        exactBudgetExceeded: false,
      }
    },
  })

  const result = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 10, y: 20, z: 5},
      direction: {x: 2, y: -1, z: -5},
    },
  })

  assert.equal(result.primaryHit?.nodeId, 'projected-hit')
  assert.equal(result.hits[0]?.hitPoint.x, 12)
  assert.equal(result.hits[0]?.hitPoint.y, 19)
})

test('createEngineHitResolver ray fallback returns empty hits when ray cannot reach z=0 plane', () => {
  const resolver = createEngineHitResolver({
    resolvePointHits: () => {
      throw new Error('point resolver should not run for non-intersecting rays')
    },
  })

  const parallelResult = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 0, y: 0, z: 10},
      direction: {x: 1, y: 0, z: 0},
    },
  })
  assert.equal(parallelResult.hits.length, 0)

  const awayResult = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 0, y: 0, z: 10},
      direction: {x: 0, y: 0, z: 1},
    },
  })
  assert.equal(awayResult.hits.length, 0)
})
