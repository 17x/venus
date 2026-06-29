import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeGeometryCacheKeySignature,
  GeometryCache,
  type GeometryCacheKey,
} from './geometryCache.ts'

test('computeGeometryCacheKeySignature produces stable output for identical keys', () => {
  const key: GeometryCacheKey = {
    sceneVersion: 'rev-42',
    nodesRef: [],
    viewportSignature: 'vp:1:0:0',
    framePlanSignature: 'fp:1:0',
  }

  const sig1 = computeGeometryCacheKeySignature(key)
  const sig2 = computeGeometryCacheKeySignature(key)

  assert.equal(sig1, sig2)
  assert.equal(sig1, 'rev-42|vp:1:0:0|fp:1:0')
})

test('computeGeometryCacheKeySignature differs across distinct scene versions', () => {
  const keyA: GeometryCacheKey = {
    sceneVersion: 'rev-1',
    nodesRef: [],
    viewportSignature: 'vp:1:0:0',
    framePlanSignature: 'fp:1:0',
  }
  const keyB: GeometryCacheKey = {
    sceneVersion: 'rev-2',
    nodesRef: [],
    viewportSignature: 'vp:1:0:0',
    framePlanSignature: 'fp:1:0',
  }

  assert.notEqual(computeGeometryCacheKeySignature(keyA), computeGeometryCacheKeySignature(keyB))
})

test('GeometryCache stores and retrieves payloads by key', () => {
  const cache = new GeometryCache<{bounds: {x: number; y: number; width: number; height: number}}>()

  cache.set({key: 'node-a', value: {bounds: {x: 0, y: 0, width: 100, height: 80}}})
  cache.set({key: 'node-b', value: {bounds: {x: 10, y: 20, width: 50, height: 60}}})

  assert.deepEqual(cache.get('node-a'), {bounds: {x: 0, y: 0, width: 100, height: 80}})
  assert.deepEqual(cache.get('node-b'), {bounds: {x: 10, y: 20, width: 50, height: 60}})
  assert.equal(cache.get('missing'), null)
})

test('GeometryCache delete removes one entry while leaving others intact', () => {
  const cache = new GeometryCache<number>()

  cache.set({key: 'keep', value: 1})
  cache.set({key: 'drop', value: 2})

  cache.delete('drop')

  assert.equal(cache.get('keep'), 1)
  assert.equal(cache.get('drop'), null)
})

test('GeometryCache clear empties all entries', () => {
  const cache = new GeometryCache<number>()

  cache.set({key: 'a', value: 1})
  cache.set({key: 'b', value: 2})
  cache.clear()

  assert.equal(cache.get('a'), null)
  assert.equal(cache.get('b'), null)
})
