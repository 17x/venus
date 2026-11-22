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
  assert.deepEqual(payload.selectionOverlay?.selectedNodeIds, ['shape-b', 'shape-a'])
  assert.deepEqual(payload.selectionOverlay?.bounds, {
    minX: 10,
    minY: 10,
    maxX: 120,
    maxY: 90,
  })
  assert.equal(payload.selectionOverlay?.outline.kind, 'bounds')
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
  assert.equal(payload.hoverOverlay?.nodeId, 'rect-rotated')
  assert.equal(payload.hoverOverlay?.outline, payload.hovered?.outline)
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
 * Verifies point-authored geometry outlines use the same world matrix as bounds.
 */
test('resolveEngineGeometryPayload composes parent rotation for polygon star and path outlines', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'group-rotated',
      type: 'group',
      x: 0,
      y: 0,
      width: 120,
      height: 120,
      rotation: 90,
    },
    {
      id: 'polygon-child',
      type: 'polygon',
      parentId: 'group-rotated',
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      points: [{x: 10, y: 10}, {x: 50, y: 10}, {x: 30, y: 50}],
    },
    {
      id: 'star-child',
      type: 'star',
      parentId: 'group-rotated',
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      points: [{x: 40, y: 20}, {x: 48, y: 42}, {x: 70, y: 42}, {x: 52, y: 55}, {x: 58, y: 78}],
    },
    {
      id: 'path-child',
      type: 'path',
      parentId: 'group-rotated',
      x: 0,
      y: 80,
      width: 80,
      height: 40,
      points: [{x: 0, y: 80}, {x: 40, y: 120}, {x: 80, y: 80}],
      closed: false,
    },
  ]

  const polygonPayload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'polygon-child',
    outlineLevel: 'medium',
  })
  const starPayload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'star-child',
    outlineLevel: 'medium',
  })
  const pathPayload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'path-child',
    outlineLevel: 'medium',
  })

  assert.equal(polygonPayload.hovered?.outline.kind, 'polyline')
  assert.notDeepEqual(polygonPayload.hovered?.outline.points?.[0], {x: 10, y: 10})
  assert.equal(starPayload.hovered?.outline.kind, 'polyline')
  assert.notDeepEqual(starPayload.hovered?.outline.points?.[0], {x: 40, y: 20})
  assert.equal(pathPayload.hovered?.outline.kind, 'polyline')
  assert.notDeepEqual(pathPayload.hovered?.outline.points?.[0], {x: 0, y: 80})
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
  assertBoundsClose(payload.hovered?.bounds, {
    minX: 60,
    minY: 0,
    maxX: 120,
    maxY: 40,
  })
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

/**
 * Verifies rotated group child bounds stay identical across hover, selection, marquee, and hit-test.
 */
test('resolveEngineGeometryPayload aligns rotated group bounds across overlay marquee and hit-test', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'group-rotated',
      type: 'group',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      rotation: 90,
    },
    {
      id: 'rect-child',
      type: 'rectangle',
      parentId: 'group-rotated',
      x: 120,
      y: 80,
      width: 40,
      height: 20,
      fill: {enabled: true},
    },
  ]
  const expectedBounds = {
    minX: 100,
    minY: 120,
    maxX: 120,
    maxY: 160,
  }

  const payload = resolveEngineGeometryPayload({
    nodes,
    hoveredNodeId: 'rect-child',
    selectedNodeIds: ['group-rotated'],
    pointer: {x: 110, y: 140},
    tolerance: 4,
    preferGroupSelection: true,
    marqueeBounds: {
      minX: 99,
      minY: 119,
      maxX: 121,
      maxY: 161,
    },
    marqueeMode: 'contain',
    outlineLevel: 'medium',
  })

  assertBoundsClose(payload.hoverOverlay?.bounds, expectedBounds)
  assertBoundsClose(payload.selected[0]?.bounds, expectedBounds)
  assertBoundsClose(payload.selectionOverlay?.bounds, expectedBounds)
  assert.deepEqual(payload.pointHitNodeIds, ['group-rotated'])
  assert.deepEqual(payload.marqueeCandidateNodeIds, ['group-rotated', 'rect-child'])
  assert.deepEqual(payload.marqueeResolvedNodeIds, ['group-rotated', 'rect-child'])
  assert.equal(payload.selected[0]?.outline.kind, 'bounds')
})

/**
 * Verifies point-authored line hit-test follows rendered endpoints when legacy box fields are stale.
 */
test('resolveEngineGeometryPayload hits point-authored line when legacy box fields are stale', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'line-points',
      type: 'lineSegment',
      x: 1000,
      y: 1000,
      width: 1,
      height: 1,
      points: [{x: 0, y: 0}, {x: 100, y: 0}],
      stroke: {enabled: true},
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    pointer: {x: 50, y: 0},
    tolerance: 3,
    resolveHoveredFromPointer: true,
    outlineLevel: 'medium',
  })

  assert.deepEqual(payload.pointHitNodeIds, ['line-points'])
  assert.equal(payload.hovered?.nodeId, 'line-points')
  assertBoundsClose(payload.hovered?.bounds, {
    minX: 0,
    minY: 0,
    maxX: 100,
    maxY: 0,
  })
})

/**
 * Verifies path marquee and exact hit use authored point bounds when legacy box fields are stale.
 */
test('resolveEngineGeometryPayload resolves point-authored path bounds when legacy box fields are stale', () => {
  const nodes: EngineEditorHitTestNode[] = [
    {
      id: 'path-points',
      type: 'path',
      x: 1000,
      y: 1000,
      width: 1,
      height: 1,
      points: [{x: 0, y: 0}, {x: 80, y: 0}, {x: 40, y: 60}],
      closed: true,
      fill: {enabled: true},
    },
  ]

  const payload = resolveEngineGeometryPayload({
    nodes,
    pointer: {x: 40, y: 20},
    tolerance: 2,
    marqueeBounds: {
      minX: 0,
      minY: 0,
      maxX: 80,
      maxY: 60,
    },
    marqueeMode: 'contain',
    resolveHoveredFromPointer: true,
    outlineLevel: 'medium',
  })

  assert.deepEqual(payload.pointHitNodeIds, ['path-points'])
  assert.deepEqual(payload.marqueeCandidateNodeIds, ['path-points'])
  assert.deepEqual(payload.marqueeResolvedNodeIds, ['path-points'])
  assertBoundsClose(payload.hovered?.bounds, {
    minX: 0,
    minY: 0,
    maxX: 80,
    maxY: 60,
  })
})

function assertBoundsClose(
  actual: {minX: number; minY: number; maxX: number; maxY: number} | null | undefined,
  expected: {minX: number; minY: number; maxX: number; maxY: number},
) {
  assert.ok(actual)
  assert.ok(Math.abs(actual.minX - expected.minX) <= 1e-6)
  assert.ok(Math.abs(actual.minY - expected.minY) <= 1e-6)
  assert.ok(Math.abs(actual.maxX - expected.maxX) <= 1e-6)
  assert.ok(Math.abs(actual.maxY - expected.maxY) <= 1e-6)
}
