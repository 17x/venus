import assert from 'node:assert/strict'
import test from 'node:test'
import type {DocumentNode} from '../../../runtime/model/index.ts'
import {buildSelectedPropsForSelection} from '../../editorRuntimeHelpers/selectedPropsPolicy.ts'

/**
 * Creates one rectangle-like document node fixture for mixed-style policy tests.
 * @param id Stable shape id.
 * @param overrides Optional shape field overrides used by tests.
 */
function createRectangleNode(id: string, overrides: Partial<DocumentNode> = {}): DocumentNode {
  return {
    id,
    type: 'rectangle',
    name: `Node ${id}`,
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    fill: {
      enabled: true,
      color: '#ff0000',
    },
    stroke: {
      enabled: true,
      color: '#111111',
      weight: 1,
    },
    shadow: {
      enabled: false,
      color: '#000000',
      offsetX: 0,
      offsetY: 0,
      blur: 8,
    },
    cornerRadius: 0,
    ...overrides,
  }
}

test('mixed-style policy reports fill and stroke mixed flags for multi-selection', () => {
  const shapes: DocumentNode[] = [
    createRectangleNode('a', {
      fill: {enabled: true, color: '#ff0000'},
      stroke: {enabled: true, color: '#111111', weight: 1},
    }),
    createRectangleNode('b', {
      fill: {enabled: false, color: '#00ff00'},
      stroke: {enabled: true, color: '#222222', weight: 2},
    }),
  ]

  const selected = buildSelectedPropsForSelection(shapes, ['a', 'b'], shapes[0])

  assert.ok(selected)
  assert.equal(selected.mixedFields?.fillEnabled, true)
  assert.equal(selected.mixedFields?.fillColor, true)
  assert.equal(selected.mixedFields?.strokeColor, true)
  assert.equal(selected.mixedFields?.strokeWeight, true)
})

test('mixed-style policy reports corner and shadow mixed flags for multi-selection', () => {
  const shapes: DocumentNode[] = [
    createRectangleNode('a', {
      cornerRadius: 4,
      shadow: {enabled: false, color: '#000000', offsetX: 0, offsetY: 0, blur: 8},
    }),
    createRectangleNode('b', {
      cornerRadius: 16,
      shadow: {enabled: true, color: '#111111', offsetX: 3, offsetY: 5, blur: 20},
    }),
  ]

  const selected = buildSelectedPropsForSelection(shapes, ['a', 'b'], shapes[0])

  assert.ok(selected)
  assert.equal(selected.mixedFields?.cornerRadius, true)
  assert.equal(selected.mixedFields?.shadowEnabled, true)
  assert.equal(selected.mixedFields?.shadowColor, true)
  assert.equal(selected.mixedFields?.shadowOffsetX, true)
  assert.equal(selected.mixedFields?.shadowOffsetY, true)
  assert.equal(selected.mixedFields?.shadowBlur, true)
})

test('mixed-style policy keeps single-selection payload without mixed flags', () => {
  const shapes: DocumentNode[] = [
    createRectangleNode('a', {
      fill: {enabled: true, color: '#abcdef'},
    }),
  ]

  const selected = buildSelectedPropsForSelection(shapes, ['a'], shapes[0])

  assert.ok(selected)
  assert.equal(selected.id, 'a')
  assert.equal(selected.mixedFields, undefined)
  assert.equal(selected.fill?.color, '#abcdef')
})
