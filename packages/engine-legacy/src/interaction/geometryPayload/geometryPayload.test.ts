import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveEngineGeometryPayload} from './geometryPayload.ts'
import type {EngineEditorHitTestNode} from '../hitTest/hitTest.ts'

/**
 * Verifies hover path payload emits anchor hint when pointer is near anchor.
 */
test('resolveEngineGeometryPayload emits anchor hover hint', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'path-1',
      type: 'path',
      x: 100,
      y: 120,
      width: 160,
      height: 120,
      bezierPoints: [
        {anchor: {x: 100, y: 120}, cp2: {x: 130, y: 100}},
        {anchor: {x: 200, y: 160}, cp1: {x: 170, y: 180}},
      ],
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'path-1',
    pointer: {x: 103, y: 121},
    tolerance: 6,
    outlineLevel: 'high',
  })

  assert.ok(payload.hovered)
  assert.equal(payload.hovered?.nodeId, 'path-1')
  assert.equal(payload.hovered?.hints[0]?.kind, 'hover-anchor')
  assert.equal(payload.hovered?.hints[0]?.label, 'hover on a anchor')
  assert.equal(payload.hovered?.hints[0]?.anchorIndex, 0)
})

/**
 * Verifies marquee query path resolves coarse candidate ids via engine spatial index.
 */
test('resolveEngineGeometryPayload returns marquee candidates', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'rect-in',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    {
      id: 'rect-out',
      type: 'rectangle',
      x: 500,
      y: 500,
      width: 100,
      height: 100,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    marqueeBounds: {
      minX: -10,
      minY: -10,
      maxX: 130,
      maxY: 130,
    },
  })

  assert.deepEqual(payload.marqueeCandidateNodeIds, ['rect-in'])
  assert.deepEqual(payload.marqueeResolvedNodeIds, ['rect-in'])
})

/**
 * Verifies marquee contain mode is resolved in engine, not vector call sites.
 */
test('resolveEngineGeometryPayload resolves marquee contain mode', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'rect-contained',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 40,
      height: 40,
    },
    {
      id: 'rect-partial',
      type: 'rectangle',
      x: 45,
      y: 45,
      width: 40,
      height: 40,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    marqueeBounds: {
      minX: 0,
      minY: 0,
      maxX: 70,
      maxY: 70,
    },
    marqueeMode: 'contain',
  })

  assert.deepEqual(payload.marqueeCandidateNodeIds, ['rect-contained', 'rect-partial'])
  assert.deepEqual(payload.marqueeResolvedNodeIds, ['rect-contained'])
})

/**
 * Verifies selected node order is preserved in output payload for deterministic strategy.
 */
test('resolveEngineGeometryPayload preserves selected node order', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'shape-a',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 30,
      height: 20,
    },
    {
      id: 'shape-b',
      type: 'lineSegment',
      x: 100,
      y: 80,
      width: 20,
      height: 10,
      points: [{x: 100, y: 80}, {x: 120, y: 90}],
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    selectedNodeIds: ['shape-b', 'shape-a'],
    outlineLevel: 'medium',
  })

  assert.deepEqual(payload.selected.map((item) => item.nodeId), ['shape-b', 'shape-a'])
  assert.equal(payload.selected[0]?.outline.kind, 'polyline')
  assert.equal(payload.selected[1]?.outline.kind, 'polyline')
})

/**
 * Verifies rotated rectangle outline is emitted as transformed polyline, not axis-aligned bounds.
 */
test('resolveEngineGeometryPayload emits transformed rectangle outline', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'rect-rotated',
      type: 'rectangle',
      x: 100,
      y: 80,
      width: 120,
      height: 60,
      rotation: 30,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'rect-rotated',
    outlineLevel: 'medium',
  })

  assert.equal(payload.hovered?.outline.kind, 'polyline')
  assert.equal(payload.hovered?.outline.closed, true)
  assert.equal(payload.hovered?.outline.points?.length, 4)
  assert.notDeepEqual(
    payload.hovered?.outline.points?.[0],
    {x: payload.hovered?.bounds.minX, y: payload.hovered?.bounds.minY},
  )
})

/**
 * Verifies rounded rectangle nodes emit sampled corner contours instead of sharp 4-corner boxes.
 */
test('resolveEngineGeometryPayload emits rounded rectangle contour', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'rect-rounded',
      type: 'rectangle',
      x: 20,
      y: 20,
      width: 140,
      height: 80,
      cornerRadius: 24,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'rect-rounded',
    outlineLevel: 'medium',
  })

  assert.equal(payload.hovered?.outline.kind, 'polyline')
  assert.equal(payload.hovered?.outline.closed, true)
  assert.ok((payload.hovered?.outline.points?.length ?? 0) > 8)
})

/**
 * Verifies ellipse outline is sampled as polyline for hover rendering.
 */
test('resolveEngineGeometryPayload emits ellipse contour polyline', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'ellipse-1',
      type: 'ellipse',
      x: 20,
      y: 40,
      width: 100,
      height: 60,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'ellipse-1',
    outlineLevel: 'medium',
  })

  assert.equal(payload.hovered?.outline.kind, 'polyline')
  assert.equal(payload.hovered?.outline.closed, true)
  assert.equal(payload.hovered?.outline.points?.length, 192)
})

/**
 * Verifies ellipse hover outline composes ancestor rotation transforms.
 */
test('resolveEngineGeometryPayload composes parent rotation for ellipse outline', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'group-rotated',
      type: 'group',
      x: 0,
      y: 0,
      width: 260,
      height: 260,
      rotation: 45,
    },
    {
      id: 'ellipse-child',
      type: 'ellipse',
      parentId: 'group-rotated',
      x: 80,
      y: 100,
      width: 120,
      height: 60,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'ellipse-child',
    outlineLevel: 'medium',
  })

  const points = payload.hovered?.outline.points ?? []
  assert.equal(payload.hovered?.outline.kind, 'polyline')
  assert.ok(points.length >= 32)
  // Parent rotation should tilt the ellipse so the first two samples are not axis-aligned.
  assert.notEqual(points[0]?.y, points[1]?.y)
})

/**
 * Verifies ellipse arc settings shape the outline with radial boundaries.
 */
test('resolveEngineGeometryPayload emits ellipse arc contour with start/end angles', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'ellipse-arc',
      type: 'ellipse',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      ellipseStartAngle: 0,
      ellipseEndAngle: 90,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'ellipse-arc',
    outlineLevel: 'medium',
  })

  assert.equal(payload.hovered?.outline.kind, 'polyline')
  assert.equal(payload.hovered?.outline.closed, true)
  const points = payload.hovered?.outline.points ?? []
  assert.ok(points.length > 5)
  assert.deepEqual(points[0], points[points.length - 1])
  // Keep arc geometry semantics stable: 0deg at right, +90deg upward.
  assert.ok(Math.abs((points[1]?.x ?? 0) - 120) <= 1e-6)
  assert.ok(Math.abs((points[1]?.y ?? 0) - 40) <= 1e-6)
  assert.ok(Math.abs((points[points.length - 2]?.x ?? 0) - 60) <= 1e-6)
  assert.ok(Math.abs((points[points.length - 2]?.y ?? 0) - 0) <= 1e-6)
})

/**
 * Verifies text nodes provide line-edge detail outlines for vector-side rendering strategies.
 */
test('resolveEngineGeometryPayload emits text detail outlines', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'text-1',
      type: 'text',
      x: 10,
      y: 10,
      width: 220,
      height: 90,
      text: 'alpha\nbeta',
      textRuns: [{
        start: 0,
        end: 10,
        style: {
          fontSize: 16,
          lineHeight: 20,
          textAlign: 'left',
          verticalAlign: 'top',
        },
      }],
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'text-1',
    outlineLevel: 'medium',
  })

  assert.equal(payload.hovered?.outline.kind, 'polyline')
  assert.equal(payload.hovered?.detailOutlines.length, 2)
  assert.equal(payload.hovered?.detailOutlines[0]?.kind, 'polyline')
  assert.equal(payload.hovered?.detailOutlines[0]?.closed, false)
  assert.equal(payload.hovered?.detailOutlines[0]?.points?.length, 2)
})

/**
 * Verifies pointer-based hover auto-resolution picks top-most hit candidate.
 */
test('resolveEngineGeometryPayload resolves hovered from pointer hits', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'shape-bottom',
      type: 'rectangle',
      x: 10,
      y: 10,
      width: 120,
      height: 80,
      fill: {enabled: true},
    },
    {
      id: 'shape-top',
      type: 'rectangle',
      x: 20,
      y: 20,
      width: 100,
      height: 60,
      fill: {enabled: true},
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    pointer: {x: 40, y: 40},
    tolerance: 6,
    resolveHoveredFromPointer: true,
  })

  assert.equal(payload.hovered?.nodeId, 'shape-top')
  assert.deepEqual(payload.pointHitNodeIds, ['shape-top', 'shape-bottom'])
})

/**
 * Verifies default rectangle nodes still participate in point-hit list without explicit fill/stroke.
 */
test('resolveEngineGeometryPayload point hits include default rectangle shapes', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'rect-default',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    pointer: {x: 20, y: 20},
    tolerance: 6,
    preferPointBoundsFallback: true,
    resolveHoveredFromPointer: true,
  })

  assert.equal(payload.hovered?.nodeId, 'rect-default')
  assert.deepEqual(payload.pointHitNodeIds, ['rect-default'])
})

/**
 * Verifies point-hit exact candidate budget bounds deep checks under overlap stacks.
 */
test('resolveEngineGeometryPayload respects maxExactCandidateCount for point hits', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'clip-away',
      type: 'rectangle',
      x: 140,
      y: 140,
      width: 40,
      height: 40,
    },
    {
      id: 'hit-mid',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fill: {enabled: true},
    },
    {
      id: 'masked-top',
      type: 'image',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      clipPathId: 'clip-away',
    },
  ]

  const boundedPayload = resolveEngineGeometryPayload({
    nodes,
    pointer: {x: 50, y: 50},
    tolerance: 6,
    clipTolerance: 2,
    excludeClipBoundImage: false,
    maxExactCandidateCount: 1,
    resolveHoveredFromPointer: true,
  })

  assert.equal(boundedPayload.pointHitNodeIds.length, 0)
  assert.equal(boundedPayload.hovered, null)

  const expandedPayload = resolveEngineGeometryPayload({
    nodes,
    pointer: {x: 50, y: 50},
    tolerance: 6,
    clipTolerance: 2,
    excludeClipBoundImage: false,
    maxExactCandidateCount: 2,
    resolveHoveredFromPointer: true,
  })

  assert.deepEqual(expandedPayload.pointHitNodeIds, ['hit-mid'])
  assert.equal(expandedPayload.hovered?.nodeId, 'hit-mid')
})
