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

test('line segment hit includes stroke band with pointer tolerance', () => {
  const line: EngineEditorHitTestNode = {
    id: 'line-1',
    type: 'lineSegment',
    x: 0,
    y: 0,
    width: 200,
    height: 0,
    stroke: {enabled: true},
  }

  // Point directly on the line at midpoint.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 0}, line, {tolerance: 4}), true)
  // Point just above line within tolerance.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 3}, line, {tolerance: 4}), true)
  // Point far above line outside tolerance.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 20}, line, {tolerance: 4}), false)
  // Point past the line endpoint.
  assert.equal(isPointInsideEngineShapeHitArea({x: 220, y: 0}, line, {tolerance: 4}), false)
})

test('diagonal line hit respects stroke band proximity', () => {
  const line: EngineEditorHitTestNode = {
    id: 'diag-line',
    type: 'lineSegment',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    stroke: {enabled: true},
  }

  // Point near the midpoint of the diagonal.
  assert.equal(isPointInsideEngineShapeHitArea({x: 50, y: 48}, line, {tolerance: 6}), true)
  // Point far from diagonal.
  assert.equal(isPointInsideEngineShapeHitArea({x: 90, y: 10}, line, {tolerance: 6}), false)
})

test('text bounds hit uses axis-aligned bounding box', () => {
  const text: EngineEditorHitTestNode = {
    id: 'text-1',
    type: 'text',
    x: 10,
    y: 20,
    width: 200,
    height: 50,
    text: 'Venus Engine',
  }

  // Point inside text bounds.
  assert.equal(isPointInsideEngineShapeHitArea({x: 60, y: 40}, text), true)
  // Point outside text bounds.
  assert.equal(isPointInsideEngineShapeHitArea({x: 5, y: 40}, text), false)
  assert.equal(isPointInsideEngineShapeHitArea({x: 60, y: 80}, text), false)
})

test('text bounds hit with multiline content uses full bounding box', () => {
  const text: EngineEditorHitTestNode = {
    id: 'text-multi',
    type: 'text',
    x: 10,
    y: 20,
    width: 200,
    height: 80,
    text: 'Line 1\nLine 2\nLine 3',
  }

  // Point inside multiline bounds.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 30}, text), true)
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 80}, text), true)
  // Point below text bounds.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 110}, text), false)
})

test('polygon fill hit uses point-in-polygon winding', () => {
  const polygon: EngineEditorHitTestNode = {
    id: 'poly-1',
    type: 'polygon',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    points: [
      {x: 50, y: 0},
      {x: 100, y: 50},
      {x: 50, y: 100},
      {x: 0, y: 50},
    ],
    fill: {enabled: true},
  }

  // Center of diamond.
  assert.equal(isPointInsideEngineShapeHitArea({x: 50, y: 50}, polygon), true)
  // Outside diamond, near corner of bounding box.
  assert.equal(isPointInsideEngineShapeHitArea({x: 5, y: 5}, polygon), false)
})

test('polygon stroke hit rejects fill-only interior in strict mode', () => {
  const polygon: EngineEditorHitTestNode = {
    id: 'poly-stroke',
    type: 'polygon',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    points: [
      {x: 50, y: 0},
      {x: 100, y: 100},
      {x: 0, y: 100},
    ],
    fill: {enabled: true},
    stroke: {enabled: true},
  }

  // Deep inside fill area → rejected by strict stroke.
  assert.equal(isPointInsideEngineShapeHitArea({x: 50, y: 70}, polygon, {strictStrokeHitTest: true, tolerance: 4}), false)
  // Near an edge within tolerance.
  assert.equal(isPointInsideEngineShapeHitArea({x: 50, y: 3}, polygon, {strictStrokeHitTest: true, tolerance: 4}), true)
})

test('image hit uses axis-aligned bounding box with no stroke semantics', () => {
  const image: EngineEditorHitTestNode = {
    id: 'img-1',
    type: 'image',
    x: 20,
    y: 30,
    width: 160,
    height: 120,
    assetId: 'demo',
  }

  // Inside image bounds.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 80}, image), true)
  // Outside image bounds.
  assert.equal(isPointInsideEngineShapeHitArea({x: 10, y: 80}, image), false)
  assert.equal(isPointInsideEngineShapeHitArea({x: 200, y: 80}, image), false)
})

test('mask node hit defers to children for targetable geometry', () => {
  const mask: EngineEditorHitTestNode = {
    id: 'mask-1',
    type: 'group',
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  }
  const maskedRect: EngineEditorHitTestNode = {
    id: 'masked-rect',
    parentId: 'mask-1',
    type: 'rectangle',
    x: 50,
    y: 50,
    width: 100,
    height: 80,
    fill: {enabled: true},
  }
  const shapeById = new Map<string, EngineEditorHitTestNode>([
    [mask.id, mask],
    [maskedRect.id, maskedRect],
  ])

  // Group/mask itself is not targetable.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 90}, mask, {shapeById}), false)
  // Child rectangle is targetable within its bounds.
  assert.equal(isPointInsideEngineShapeHitArea({x: 100, y: 90}, maskedRect, {shapeById}), true)
})