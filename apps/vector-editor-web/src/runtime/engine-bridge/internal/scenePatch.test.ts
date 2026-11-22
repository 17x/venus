import assert from 'node:assert/strict'
import test from 'node:test'

import type {DocumentNode, EditorDocument} from '../../model/index.ts'
import {resolveExpandedChangedIds, resolveMergedNodeBounds} from './scenePatch.ts'

const SQUARE_ROTATED_AABB_MIN = 5.857864376269049
const SQUARE_ROTATED_AABB_SIZE = 28.284271247461902
const APPROX_EPSILON = 1e-9

const node = (input: Partial<DocumentNode> & Pick<DocumentNode, 'id' | 'type'>): DocumentNode => ({
  id: input.id,
  type: input.type,
  name: input.name ?? input.id,
  x: input.x ?? 0,
  y: input.y ?? 0,
  width: input.width ?? 1,
  height: input.height ?? 1,
  ...input,
})

const documentFor = (shapes: DocumentNode[]): EditorDocument => ({
  id: 'doc',
  name: 'Doc',
  width: 1000,
  height: 1000,
  shapes,
})

test('resolveMergedNodeBounds uses point geometry and rotation for dirty bounds', () => {
  const document = documentFor([
    node({
      id: 'rotated-poly',
      type: 'polygon',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 45,
      points: [
        {x: 10, y: 20},
        {x: 30, y: 20},
        {x: 30, y: 40},
        {x: 10, y: 40},
      ],
    }),
  ])

  const bounds = resolveMergedNodeBounds({
    nodes: [],
    currentDocument: document,
    changedIds: ['rotated-poly'],
  })

  assert.ok(bounds)
  assert.ok(Math.abs(bounds.x - SQUARE_ROTATED_AABB_MIN) <= APPROX_EPSILON)
  assert.ok(Math.abs(bounds.y - (SQUARE_ROTATED_AABB_MIN + 10)) <= APPROX_EPSILON)
  assert.ok(Math.abs(bounds.width - SQUARE_ROTATED_AABB_SIZE) <= APPROX_EPSILON)
  assert.ok(Math.abs(bounds.height - SQUARE_ROTATED_AABB_SIZE) <= APPROX_EPSILON)
})

test('resolveExpandedChangedIds closes clip dependencies over both ancestor chains', () => {
  const document = documentFor([
    node({
      id: 'clip-group',
      type: 'group',
      childIds: ['clip-source'],
    }),
    node({
      id: 'clip-source',
      type: 'polygon',
      parentId: 'clip-group',
      points: [
        {x: 0, y: 0},
        {x: 40, y: 0},
        {x: 40, y: 40},
      ],
    }),
    node({
      id: 'host-group',
      type: 'group',
      childIds: ['clipped-image'],
    }),
    node({
      id: 'clipped-image',
      type: 'image',
      parentId: 'host-group',
      assetId: 'image-1',
      clipPathId: 'clip-source',
    }),
  ])

  const expanded = new Set(resolveExpandedChangedIds(['clip-source'], document))

  assert.equal(expanded.has('clip-source'), true)
  assert.equal(expanded.has('clip-group'), true)
  assert.equal(expanded.has('clipped-image'), true)
  assert.equal(expanded.has('host-group'), true)
})
