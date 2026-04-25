import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
  type EngineEditorHitTestNode,
} from './hitTest.ts'

test('group nodes are never directly selectable', () => {
  const group: EngineEditorHitTestNode = {
    id: 'group-1',
    type: 'group',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  }

  assert.equal(isPointInsideEngineShapeHitArea({x: 50, y: 40}, group), false)
})

test('frame selection can be disabled through hit-test options', () => {
  const frame: EngineEditorHitTestNode = {
    id: 'frame-1',
    type: 'frame',
    x: 10,
    y: 20,
    width: 180,
    height: 120,
    fill: {enabled: true},
  }

  assert.equal(isPointInsideEngineShapeHitArea({x: 60, y: 60}, frame), true)
  assert.equal(
    isPointInsideEngineShapeHitArea({x: 60, y: 60}, frame, {allowFrameSelection: false}),
    false,
  )
})

test('strict stroke hit testing rejects rectangle fill-only interior points', () => {
  const rectangle: EngineEditorHitTestNode = {
    id: 'rect-1',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    fill: {enabled: true},
    stroke: {enabled: true},
  }

  assert.equal(
    isPointInsideEngineShapeHitArea({x: 50, y: 40}, rectangle, {strictStrokeHitTest: true, tolerance: 4}),
    false,
  )
  assert.equal(
    isPointInsideEngineShapeHitArea({x: 2, y: 40}, rectangle, {strictStrokeHitTest: true, tolerance: 4}),
    true,
  )
})

test('rounded rectangle clip excludes trimmed outer corners', () => {
  const clipShape: EngineEditorHitTestNode = {
    id: 'clip-1',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    cornerRadius: 24,
  }

  assert.equal(isPointInsideEngineClipShape({x: 4, y: 4}, clipShape), false)
  assert.equal(isPointInsideEngineClipShape({x: 50, y: 50}, clipShape), true)
})

test('hit testing respects ancestor rotation via shapeById world transforms', () => {
  const parent: EngineEditorHitTestNode = {
    id: 'parent',
    type: 'group',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 90,
  }
  const child: EngineEditorHitTestNode = {
    id: 'child',
    parentId: 'parent',
    type: 'rectangle',
    x: 70,
    y: 40,
    width: 20,
    height: 20,
    fill: {enabled: true},
  }
  const shapeById = new Map<string, EngineEditorHitTestNode>([
    [parent.id, parent],
    [child.id, child],
  ])

  assert.equal(
    isPointInsideEngineShapeHitArea({x: 50, y: 80}, child, {shapeById}),
    true,
  )
  assert.equal(
    isPointInsideEngineShapeHitArea({x: 80, y: 50}, child, {shapeById}),
    false,
  )
})