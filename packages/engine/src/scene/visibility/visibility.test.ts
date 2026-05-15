import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createEngineVisibilityResolver,
  resolveEngineBounds2DVisibilityQuery,
} from './visibility.ts'
import type { EngineSceneSnapshot } from '../types/types.ts'

const SCENE: EngineSceneSnapshot = {
  revision: 'r1',
  width: 1000,
  height: 1000,
  nodes: [
    {
      id: 'a',
      type: 'shape',
      shape: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    {
      id: 'group-1',
      type: 'group',
      children: [
        {
          id: 'b',
          type: 'shape',
          shape: 'rect',
          x: 10,
          y: 10,
          width: 20,
          height: 20,
        },
      ],
    },
    {
      id: 'c',
      type: 'shape',
      shape: 'rect',
      x: 420,
      y: 420,
      width: 60,
      height: 60,
    },
  ],
}

test('resolveEngineBounds2DVisibilityQuery maps viewport to world bounds', () => {
  const query = resolveEngineBounds2DVisibilityQuery({
    viewportWidth: 200,
    viewportHeight: 100,
    offsetX: 40,
    offsetY: 20,
    scale: 2,
  }, 10)

  assert.equal(query.mode, 'bounds-2d')
  assert.deepEqual(query.bounds, {
    x: -30,
    y: -20,
    width: 120,
    height: 70,
  })
})

test('visibility resolver supports 2D query callback and reports counts', () => {
  const resolver = createEngineVisibilityResolver({
    queryBounds2D: () => ['a'],
  })

  const visibleSet = resolver.resolveVisibleSet(SCENE, {
    mode: 'bounds-2d',
    bounds: {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    },
  })

  assert.equal(visibleSet.mode, 'bounds-2d')
  assert.deepEqual(visibleSet.nodeIds, ['a'])
  assert.equal(visibleSet.visibleCount, 1)
  assert.equal(visibleSet.sceneNodeCount, 4)
  assert.equal(visibleSet.culledCount, 3)
})

test('visibility resolver frustum fallback performs coarse culling when 3D callback is absent', () => {
  const resolver = createEngineVisibilityResolver({
    queryBounds2D: () => [],
  })

  const visibleSet = resolver.resolveVisibleSet(SCENE, {
    mode: 'frustum-3d',
    frustum: {
      left: {x: 1, y: 0, z: 0, w: 0},
      right: {x: -1, y: 0, z: 0, w: 200},
      top: {x: 0, y: 1, z: 0, w: 0},
      bottom: {x: 0, y: -1, z: 0, w: 200},
      near: {x: 0, y: 0, z: 1, w: 1},
      far: {x: 0, y: 0, z: -1, w: 1},
    },
  })

  assert.equal(visibleSet.mode, 'frustum-3d')
  assert.deepEqual(visibleSet.nodeIds, ['a', 'group-1', 'b'])
  assert.equal(visibleSet.visibleCount, 3)
  assert.equal(visibleSet.culledCount, 1)
})
