import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterRuntimeSelectionCandidateIds,
  resolveRuntimeSelectionAllowIdSet,
} from '../selectionFilterPolicy.ts'
import type {EditorDocument} from '../../../runtime/model/index.ts'

test('selection filter keeps interaction-document ids in original order', () => {
  const interactionDocument: EditorDocument = {
    id: 'doc',
    name: 'doc',
    width: 100,
    height: 100,
    shapes: [
      {id: 'a', type: 'rectangle', name: 'A', x: 0, y: 0, width: 10, height: 10},
      {id: 'b', type: 'rectangle', name: 'B', x: 0, y: 0, width: 10, height: 10},
    ],
  }

  const filtered = filterRuntimeSelectionCandidateIds({
    candidateIds: ['x', 'b', 'a', 'x', 'a'],
    interactionDocument,
  })

  assert.deepEqual(filtered, ['b', 'a'])
})

test('selection filter excludes hidden and locked candidates when predicates are provided', () => {
  const interactionDocument: EditorDocument = {
    id: 'doc',
    name: 'doc',
    width: 100,
    height: 100,
    shapes: [
      {id: 'a', type: 'rectangle', name: 'A', x: 0, y: 0, width: 10, height: 10},
      {id: 'b', type: 'rectangle', name: 'B', x: 0, y: 0, width: 10, height: 10},
      {id: 'c', type: 'rectangle', name: 'C', x: 0, y: 0, width: 10, height: 10},
    ],
  }

  const filtered = filterRuntimeSelectionCandidateIds({
    candidateIds: ['a', 'b', 'c'],
    interactionDocument,
    isHidden: (shapeId) => shapeId === 'b',
    isLocked: (shapeId) => shapeId === 'c',
  })

  assert.deepEqual(filtered, ['a'])
})

test('allow-id resolver returns exactly interaction document shape ids', () => {
  const interactionDocument: EditorDocument = {
    id: 'doc',
    name: 'doc',
    width: 100,
    height: 100,
    shapes: [
      {id: 'a', type: 'rectangle', name: 'A', x: 0, y: 0, width: 10, height: 10},
      {id: 'c', type: 'rectangle', name: 'C', x: 0, y: 0, width: 10, height: 10},
    ],
  }

  const allowSet = resolveRuntimeSelectionAllowIdSet(interactionDocument)

  assert.equal(allowSet.has('a'), true)
  assert.equal(allowSet.has('c'), true)
  assert.equal(allowSet.has('b'), false)
})

test('selection filter preserves explicit nested candidates for direct/layer selection', () => {
  const interactionDocument: EditorDocument = {
    id: 'doc',
    name: 'doc',
    width: 100,
    height: 100,
    shapes: [
      {id: 'outer', type: 'group', name: 'Outer', x: 0, y: 0, width: 80, height: 80, childIds: ['inner']},
      {id: 'inner', type: 'group', name: 'Inner', x: 10, y: 10, width: 60, height: 60, parentId: 'outer', childIds: ['leaf']},
      {id: 'leaf', type: 'rectangle', name: 'Leaf', x: 20, y: 20, width: 10, height: 10, parentId: 'inner'},
    ],
  }

  const filtered = filterRuntimeSelectionCandidateIds({
    candidateIds: ['leaf', 'inner', 'outer'],
    interactionDocument,
  })

  assert.deepEqual(filtered, ['leaf', 'inner', 'outer'])
})

test('selection filter presents a clip source and clipped image as one outer host', () => {
  const interactionDocument: EditorDocument = {
    id: 'doc',
    name: 'doc',
    width: 100,
    height: 100,
    shapes: [
      {id: 'mask', type: 'ellipse', name: 'Mask', x: 10, y: 10, width: 60, height: 60},
      {
        id: 'image',
        type: 'image',
        name: 'Image',
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        clipPathId: 'mask',
      },
    ],
  }

  const filtered = filterRuntimeSelectionCandidateIds({
    candidateIds: ['mask', 'image'],
    interactionDocument,
  })

  assert.deepEqual(filtered, ['image'])
})
