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

test('ellipse arc fill hit ignores missing wedge while keeping in-sweep points', () => {
  const arc: EngineEditorHitTestNode = {
    id: 'ellipse-arc-fill',
    type: 'ellipse',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fill: {enabled: true},
    stroke: {enabled: true},
    ellipseStartAngle: 0,
    ellipseEndAngle: 180,
  }

  // Keep lower-half points excluded because they fall inside the arc gap.
  assert.equal(isPointInsideEngineShapeHitArea({x: 50, y: 80}, arc), false)
  assert.equal(isPointInsideEngineShapeHitArea({x: 50, y: 20}, arc), true)
})

test('ellipse arc stroke hit includes radial boundaries in strict stroke mode', () => {
  const arc: EngineEditorHitTestNode = {
    id: 'ellipse-arc-stroke',
    type: 'ellipse',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fill: {enabled: true},
    stroke: {enabled: true},
    ellipseStartAngle: 45,
    ellipseEndAngle: 135,
  }

  // Keep strict stroke hit true near one radial side but false far from arc perimeter.
  assert.equal(
    isPointInsideEngineShapeHitArea({x: 72, y: 28}, arc, {strictStrokeHitTest: true, tolerance: 4}),
    true,
  )
  assert.equal(
    isPointInsideEngineShapeHitArea({x: 50, y: 75}, arc, {strictStrokeHitTest: true, tolerance: 4}),
    false,
  )
})

test('dense path stroke hit remains accurate with segment-grid candidate pruning', () => {
  const points = Array.from({length: 220}, (_unused, index) => ({
    x: index * 2,
    y: 120 + Math.sin(index / 7) * 18,
  }))
  const probePoint = points[100]

  const pathShape: EngineEditorHitTestNode = {
    id: 'dense-path',
    type: 'path',
    x: 0,
    y: 0,
    width: 440,
    height: 240,
    points,
    stroke: {enabled: true},
    fill: {enabled: false},
  }

  assert.equal(
    isPointInsideEngineShapeHitArea(
      {x: probePoint.x, y: probePoint.y + 2},
      pathShape,
      {strictStrokeHitTest: true, tolerance: 5},
    ),
    true,
  )
  assert.equal(
    isPointInsideEngineShapeHitArea(
      {x: probePoint.x, y: probePoint.y + 60},
      pathShape,
      {strictStrokeHitTest: true, tolerance: 5},
    ),
    false,
  )
})

test('dense path stroke hit stays stable across repeated cached queries', () => {
  const points = Array.from({length: 260}, (_unused, index) => ({
    x: index * 1.8,
    y: 90 + Math.cos(index / 9) * 22,
  }))
  const probePoint = points[120]

  const pathShape: EngineEditorHitTestNode = {
    id: 'dense-path-cache',
    type: 'path',
    x: 0,
    y: 0,
    width: 520,
    height: 220,
    points,
    stroke: {enabled: true},
    fill: {enabled: false},
  }

  const options = {strictStrokeHitTest: true, tolerance: 5} as const
  const nearPointer = {x: probePoint.x, y: probePoint.y + 1}
  const farPointer = {x: probePoint.x, y: probePoint.y + 70}

  assert.equal(isPointInsideEngineShapeHitArea(nearPointer, pathShape, options), true)
  assert.equal(isPointInsideEngineShapeHitArea(nearPointer, pathShape, options), true)
  assert.equal(isPointInsideEngineShapeHitArea(farPointer, pathShape, options), false)
  assert.equal(isPointInsideEngineShapeHitArea(farPointer, pathShape, options), false)
})