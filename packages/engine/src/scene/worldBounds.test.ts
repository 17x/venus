import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveLeafNodeWorldBounds, toWorldAxisAlignedBounds } from './worldBounds.ts'
import type { EngineImageNode, EngineShapeNode, EngineTextNode } from './types.ts'

test('worldBounds transforms image and text nodes through the world matrix', () => {
  const imageNode: EngineImageNode = {
    id: 'image-1',
    type: 'image',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    assetId: 'asset-1',
  }
  const textNode: EngineTextNode = {
    id: 'text-1',
    type: 'text',
    x: 5,
    y: 8,
    text: 'abcd',
    style: {
      fontFamily: 'Geist',
      fontSize: 10,
    },
  }
  const matrix = [2, 0, 100, 0, 3, 50] as const

  // Image/text bounds should pick up scale and translation directly from the world matrix.
  assert.deepEqual(resolveLeafNodeWorldBounds(imageNode, matrix), {x: 120, y: 110, width: 60, height: 120})
  assert.deepEqual(resolveLeafNodeWorldBounds(textNode, matrix), {x: 110, y: 74, width: 48, height: 36})
})

test('worldBounds expands stroke geometry and handles rotated axis-aligned bounds', () => {
  const shapeNode: EngineShapeNode = {
    id: 'shape-1',
    type: 'shape',
    shape: 'polygon',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    strokeWidth: 4,
    points: [
      {x: 0, y: 0},
      {x: 10, y: 0},
      {x: 10, y: 10},
    ],
  }

  // Stroke expansion should inflate the local geometry before world projection.
  assert.deepEqual(resolveLeafNodeWorldBounds(shapeNode, [1, 0, 0, 0, 1, 0]), {
    x: -2,
    y: -2,
    width: 14,
    height: 14,
  })

  assert.deepEqual(
    toWorldAxisAlignedBounds({x: 0, y: 0, width: 10, height: 20}, [0, -1, 0, 1, 0, 0]),
    {x: -20, y: 0, width: 20, height: 10},
  )
})