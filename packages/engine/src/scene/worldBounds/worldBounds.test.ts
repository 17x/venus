import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveLeafNodeWorldBounds,
  resolveRenderableNodeWorldBounds,
  resolveRenderableNodesWorldBounds,
  toWorldAxisAlignedBounds,
} from './worldBounds.ts'
import type { EngineGroupNode, EngineImageNode, EngineShapeNode, EngineTextNode } from '../types/types.ts'

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

test('worldBounds resolves star geometry from points through canonical bounds', () => {
  const starNode: EngineShapeNode = {
    id: 'star-1',
    type: 'shape',
    shape: 'star',
    strokeWidth: 6,
    points: [
      {x: 10, y: 0},
      {x: 14, y: 7},
      {x: 22, y: 7},
      {x: 16, y: 13},
      {x: 18, y: 22},
    ],
  }

  assert.deepEqual(resolveLeafNodeWorldBounds(starNode, [1, 0, 0, 0, 1, 0]), {
    x: 7,
    y: -3,
    width: 18,
    height: 28,
  })
})

test('worldBounds resolves ellipse arc visible bounds without shrinking render geometry', () => {
  const arcNode: EngineShapeNode = {
    id: 'arc-1',
    type: 'shape',
    shape: 'ellipse',
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    ellipseStartAngle: 0,
    ellipseEndAngle: 90,
  }

  const bounds = resolveLeafNodeWorldBounds(arcNode, [1, 0, 0, 0, 1, 0])
  assert.ok(bounds)
  assert.ok(Math.abs(bounds.x - 60) <= 1e-6)
  assert.equal(bounds.y, 0)
  assert.ok(Math.abs(bounds.width - 60) <= 1e-6)
  assert.equal(bounds.height, 40)
})

test('worldBounds resolves nested group bounds from transformed descendants', () => {
  const groupNode: EngineGroupNode = {
    id: 'group-1',
    type: 'group',
    transform: {
      matrix: [0, -1, 0, 1, 0, 0],
    },
    children: [
      {
        id: 'shape-1',
        type: 'shape',
        shape: 'rect',
        x: 0,
        y: 0,
        width: 10,
        height: 20,
        fill: '#111111',
      },
    ],
  }

  assert.deepEqual(resolveRenderableNodeWorldBounds(groupNode, groupNode.transform?.matrix ?? [1, 0, 0, 0, 1, 0]), {
    x: -20,
    y: 0,
    width: 20,
    height: 10,
  })
  assert.deepEqual(resolveRenderableNodesWorldBounds([groupNode]), {
    x: -20,
    y: 0,
    width: 20,
    height: 10,
  })
})

test('worldBounds composes multi-level group transforms', () => {
  const groupNode: EngineGroupNode = {
    id: 'outer',
    type: 'group',
    transform: {
      matrix: [1, 0, 50, 0, 1, 20],
    },
    children: [
      {
        id: 'inner',
        type: 'group',
        transform: {
          matrix: [0, -1, 0, 1, 0, 0],
        },
        children: [
          {
            id: 'rect',
            type: 'shape',
            shape: 'rect',
            x: 0,
            y: 0,
            width: 10,
            height: 20,
          },
        ],
      },
    ],
  }

  assert.deepEqual(resolveRenderableNodesWorldBounds([groupNode]), {
    x: 30,
    y: 20,
    width: 20,
    height: 10,
  })
})
