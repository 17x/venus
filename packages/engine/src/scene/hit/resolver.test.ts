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
  assert.equal(result.resolutionPath, 'point-2d')
  assert.equal(result.selectionPolicy, 'paint-order-2d')
  assert.equal(result.rayMissClass, 'none')
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
  assert.equal(result.resolutionPath, 'ray-fallback-plane-projection')
  assert.equal(result.selectionPolicy, 'depth-first-ray')
  assert.equal(result.rayMissClass, 'none')
  assert.equal(result.exactCheckCount, 1)
  assert.equal(result.exactCheckBudget, 5)
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
  assert.equal(result.resolutionPath, 'ray-fallback-plane-projection')
  assert.equal(result.rayMissClass, 'none')
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
  assert.equal(parallelResult.resolutionPath, 'ray-fallback-plane-miss')
  assert.equal(parallelResult.selectionPolicy, 'depth-first-ray')
  assert.equal(parallelResult.rayMissClass, 'ray-parallel-scene-plane')

  const awayResult = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 0, y: 0, z: 10},
      direction: {x: 0, y: 0, z: 1},
    },
  })
  assert.equal(awayResult.hits.length, 0)
  assert.equal(awayResult.resolutionPath, 'ray-fallback-plane-miss')
  assert.equal(awayResult.rayMissClass, 'ray-away-from-scene-plane')
})

test('createEngineHitResolver marks native 3d ray resolution path when callback is provided', () => {
  const resolver = createEngineHitResolver({
    resolvePointHits: () => ({
      hits: [],
      exactCheckCount: 0,
      exactCheckBudget: 0,
      exactBudgetExceeded: false,
    }),
    resolveRayHits: () => [{
      index: 0,
      nodeId: 'native-ray-hit',
      nodeType: 'shape',
      hitType: 'shape-body',
      score: 1,
      zOrder: 0,
      hitPoint: {x: 1, y: 2},
    }],
  })

  const result = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 0, y: 0, z: 1},
      direction: {x: 0, y: 0, z: -1},
    },
  })

  assert.equal(result.resolutionPath, 'ray-native-3d')
  assert.equal(result.selectionPolicy, 'depth-first-ray')
  assert.equal(result.rayMissClass, 'none')
  assert.equal(result.primaryHit?.nodeId, 'native-ray-hit')
})

test('createEngineHitResolver applies depth-first ordering for native ray hits before selecting primary hit', () => {
  const resolver = createEngineHitResolver({
    resolvePointHits: () => ({
      hits: [],
      exactCheckCount: 0,
      exactCheckBudget: 0,
      exactBudgetExceeded: false,
    }),
    resolveRayHits: () => [{
      index: 10,
      nodeId: 'far-hit',
      nodeType: 'shape',
      hitType: 'shape-body',
      score: 1,
      zOrder: 2,
      hitPoint: {x: 0, y: 0},
    }, {
      index: 5,
      nodeId: 'near-hit',
      nodeType: 'shape',
      hitType: 'shape-body',
      score: 5,
      zOrder: 9,
      hitPoint: {x: 0, y: 0},
    }],
  })

  const result = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 0, y: 0, z: 10},
      direction: {x: 0, y: 0, z: -1},
    },
  })

  assert.equal(result.selectionPolicy, 'depth-first-ray')
  assert.equal(result.primaryHit?.nodeId, 'near-hit')
  assert.equal(result.hits[0]?.nodeId, 'near-hit')
  assert.equal(result.hits[1]?.nodeId, 'far-hit')
})

test('createEngineHitResolver supports native 3d ray summary payload with explicit budget metrics', () => {
  const resolver = createEngineHitResolver({
    resolvePointHits: () => ({
      hits: [],
      exactCheckCount: 0,
      exactCheckBudget: 0,
      exactBudgetExceeded: false,
    }),
    resolveRayHits: () => ({
      hits: [],
      exactCheckCount: 9,
      exactCheckBudget: 6,
      exactBudgetExceeded: true,
    }),
  })

  const result = resolver.resolve({
    mode: 'ray-3d',
    ray: {
      origin: {x: 0, y: 0, z: 1},
      direction: {x: 0, y: 0, z: -1},
    },
  })

  assert.equal(result.resolutionPath, 'ray-native-3d')
  assert.equal(result.rayMissClass, 'ray-native-no-hit')
  assert.equal(result.exactCheckCount, 9)
  assert.equal(result.exactCheckBudget, 6)
  assert.equal(result.exactBudgetExceeded, true)
})
