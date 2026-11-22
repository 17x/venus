import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineClipGeometry,
  resolveEngineShapeGeometry,
} from './canonicalGeometry.ts'
import type {EngineShapeNode} from '../types/types.ts'

test('canonical geometry separates authored shape data from derived render payloads', () => {
  const shapes: EngineShapeNode[] = [
    {
      id: 'rect',
      type: 'shape',
      shape: 'rect',
      x: 10,
      y: 20,
      width: 40,
      height: 30,
      strokeWidth: 4,
    },
    {
      id: 'ellipse-arc',
      type: 'shape',
      shape: 'ellipse',
      ellipseGeometry: {cx: 100, cy: 80, rx: 30, ry: 20},
      ellipseStartAngle: 15,
      ellipseEndAngle: 270,
      ellipseDrawWedgeLine: true,
    },
    {
      id: 'segline',
      type: 'shape',
      shape: 'line',
      points: [{x: 0, y: 0}, {x: 100, y: 0}],
      strokeWidth: 8,
    },
    {
      id: 'polygon',
      type: 'shape',
      shape: 'polygon',
      points: [{x: 0, y: 0}, {x: 60, y: 0}, {x: 20, y: 40}],
      closed: true,
    },
    {
      id: 'star',
      type: 'shape',
      shape: 'star',
      points: [{x: 50, y: 0}, {x: 62, y: 35}, {x: 100, y: 35}, {x: 69, y: 58}, {x: 80, y: 95}],
      closed: true,
    },
    {
      id: 'bezier-path',
      type: 'shape',
      shape: 'path',
      bezierPoints: [
        {anchor: {x: 0, y: 40}, cp2: {x: 20, y: 0}},
        {anchor: {x: 80, y: 40}, cp1: {x: 60, y: 80}},
      ],
      strokeWidth: 2,
    },
  ]

  const payloads = shapes.map((shape) => resolveEngineShapeGeometry(shape))

  assert.deepEqual(payloads.map((payload) => payload.authoredKind), [
    'rect',
    'ellipse',
    'line',
    'polygon',
    'star',
    'path',
  ])
  assert.deepEqual(payloads.map((payload) => payload.hitTestKind), [
    'rectangle',
    'ellipse',
    'lineSegment',
    'polygon',
    'star',
    'path',
  ])
  assert.deepEqual(payloads[0]?.geometryBounds, {x: 10, y: 20, width: 40, height: 30})
  assert.deepEqual(payloads[0]?.strokeBounds, {x: 8, y: 18, width: 44, height: 34})
  assert.equal(payloads[1]?.geometryBounds.x, 70)
  assert.equal(payloads[1]?.geometryBounds.y, 60)
  assert.ok((payloads[1]?.geometryBounds.width ?? 0) < 60)
  assert.equal(payloads[1]?.geometryBounds.height, 40)
  assert.deepEqual(payloads[1]?.outline.bounds, {x: 70, y: 60, width: 60, height: 40})
  assert.deepEqual(payloads[1]?.outline.arc, {startAngle: 15, endAngle: 270, drawWedgeLine: true})
  assert.equal(payloads[2]?.outline.kind, 'line')
  assert.equal(payloads[2]?.closed, false)
  assert.equal(payloads[4]?.outline.kind, 'polygon')
  assert.equal(payloads[4]?.pointCount, 5)
  assert.equal(payloads[5]?.outline.kind, 'path')
  assert.equal(payloads[5]?.bezierPointCount, 2)
  assert.ok((payloads[5]?.handleBounds.height ?? 0) > (payloads[5]?.strokeBounds.height ?? 0))
})

test('canonical clip geometry exposes derived bounds and hit-test kind', () => {
  const rectClip = resolveEngineClipGeometry('image-1', {
    kind: 'rect',
    rect: {x: 10, y: 20, width: 40, height: 30},
    radius: 6,
  })
  const pathClip = resolveEngineClipGeometry('group-1', {
    kind: 'path',
    points: [{x: 0, y: 0}, {x: 80, y: 0}, {x: 30, y: 60}],
    closed: true,
  })

  assert.equal(rectClip.source, 'clip')
  assert.equal(rectClip.hitTestKind, 'rectangle')
  assert.deepEqual(rectClip.geometryBounds, {x: 10, y: 20, width: 40, height: 30})
  assert.equal(pathClip.hitTestKind, 'path')
  assert.deepEqual(pathClip.geometryBounds, {x: 0, y: 0, width: 80, height: 60})
  assert.equal(pathClip.closed, true)
})
