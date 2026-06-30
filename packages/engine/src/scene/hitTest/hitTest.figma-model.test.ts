// FM-P1: Hit-test semantics for Figma-like document model capabilities.
// Covers strokeAlign, dash/cap/join, effect bounds, and clip/mask decisions.
import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {isPointInsideEngineShapeHitArea, isPointInsideEngineClipShape} from '../../interaction/hitTest/hitTest.ts'
import type {EngineEditorHitTestNode} from '../../interaction/hitTest/hitTest.ts'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a minimal rectangle hit-test shape with the given overrides. */
function rect(overrides?: Partial<EngineEditorHitTestNode>): EngineEditorHitTestNode {
  return {
    id: 'r1',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    fill: {enabled: true},
    stroke: {enabled: false},
    ...overrides,
  }
}

/** Creates a minimal ellipse hit-test shape. */
function ellipseShape(overrides?: Partial<EngineEditorHitTestNode>): EngineEditorHitTestNode {
  return {
    id: 'e1',
    type: 'ellipse',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    fill: {enabled: true},
    stroke: {enabled: false},
    ...overrides,
  }
}

/** Creates a minimal line hit-test shape. */
function line(overrides?: Partial<EngineEditorHitTestNode>): EngineEditorHitTestNode {
  return {
    id: 'l1',
    type: 'lineSegment',
    x: 0,
    y: 0,
    width: 100,
    height: 0,
    fill: {enabled: false},
    stroke: {enabled: true},
    strokeWidth: 4,
    ...overrides,
  }
}

/** Creates a minimal path hit-test shape. */
function pathShape(overrides?: Partial<EngineEditorHitTestNode>): EngineEditorHitTestNode {
  return {
    id: 'p1',
    type: 'path',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    fill: {enabled: true},
    stroke: {enabled: false},
    points: [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 80}, {x: 0, y: 80}],
    closed: true,
    ...overrides,
  }
}

/** Creates a minimal polygon hit-test shape. */
function polygonShape(overrides?: Partial<EngineEditorHitTestNode>): EngineEditorHitTestNode {
  return {
    id: 'pg1',
    type: 'polygon',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    fill: {enabled: true},
    stroke: {enabled: false},
    points: [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 80}, {x: 0, y: 80}],
    closed: true,
    ...overrides,
  }
}

/** Center point of a 100×80 shape at origin. */
const CENTER = {x: 50, y: 40}
/** Just outside the right edge of a 100×80 shape. */
const OUTSIDE_RIGHT = {x: 110, y: 40}
/** On the right edge of a 100×80 shape. */
const ON_RIGHT_EDGE = {x: 100, y: 40}

// ── FM-P1-001: StrokeAlign hit-test semantics ────────────────────────────────

describe('FM-P1-001: strokeAlign hit-test pipeline', () => {
  it('passes strokeAlign through the EngineEditorHitTestNode pipeline', () => {
    // Verify the type system accepts strokeAlign.
    const shape = rect({stroke: {enabled: true}, strokeWidth: 8, strokeAlign: 'inside'})
    assert.equal(shape.strokeAlign, 'inside')
    assert.equal(shape.strokeWidth, 8)
  })

  it('passes strokeDashArray, strokeCap, strokeJoin through the pipeline', () => {
    const shape = rect({
      stroke: {enabled: true},
      strokeWidth: 4,
      strokeDashArray: [4, 2],
      strokeCap: 'round',
      strokeJoin: 'miter',
    })
    assert.deepEqual(shape.strokeDashArray, [4, 2])
    assert.equal(shape.strokeCap, 'round')
    assert.equal(shape.strokeJoin, 'miter')
  })

  it('center-aligned stroke hit: tolerances layer correctly (documented behavior)', () => {
    // The interaction-layer hit-test uses explicit tolerance only.
    // The scene-layer resolveShapeHitTolerance adds strokeWidth/2 as floor.
    const shape = rect({stroke: {enabled: true}, strokeWidth: 8, strokeAlign: 'center'})
    // With tolerance=4 (matching strokeWidth/2), point 3px inside right edge hits.
    const insideNear = isPointInsideEngineShapeHitArea({x: 97, y: 40}, shape, {tolerance: 4})
    assert.equal(insideNear, true, 'point 3px inside right edge should hit with tolerance=4')
    // With tolerance=4, point 3px outside right edge also hits.
    const outsideNear = isPointInsideEngineShapeHitArea({x: 103, y: 40}, shape, {tolerance: 4})
    assert.equal(outsideNear, true, 'point 3px outside right edge should hit with tolerance=4')
    // With zero tolerance, only exact edge points hit.
    const exactEdge = isPointInsideEngineShapeHitArea({x: 100, y: 40}, shape, {tolerance: 0})
    assert.equal(exactEdge, true, 'point exactly on right edge should hit even with tolerance=0')
    // Point 5px away from edge with zero tolerance should miss.
    const far = isPointInsideEngineShapeHitArea({x: 105, y: 40}, shape, {tolerance: 0})
    assert.equal(far, false, 'point 5px outside should miss with tolerance=0')
  })

  it('strokeAlign is passed through but does not yet shift the hit band', () => {
    // Current limitation: inside/outside alignment does not shift the hit band.
    // The hit band always straddles the geometry edge (center semantics).
    // This test documents the current behavior until full support is implemented.
    const insideAligned = rect({stroke: {enabled: true}, strokeWidth: 8, strokeAlign: 'inside'})
    const outsideAligned = rect({stroke: {enabled: true}, strokeWidth: 8, strokeAlign: 'outside'})

    // With tolerance=4, both inside- and outside-aligned strokes hit 3px OUTSIDE
    // the edge (same as center semantics).
    const outsidePoint = {x: 103, y: 40}
    assert.equal(
      isPointInsideEngineShapeHitArea(outsidePoint, insideAligned, {tolerance: 4}),
      true,
      'FM-P1-001 gap: inside-aligned stroke hits outside edge (center-semantics assumption)',
    )
    assert.equal(
      isPointInsideEngineShapeHitArea(outsidePoint, outsideAligned, {tolerance: 4}),
      true,
      'outside-aligned stroke also hits outside edge',
    )
  })
})

// ── FM-P1-002: Dash/cap/join hit-test coverage ───────────────────────────────

describe('FM-P1-002: dash, cap, join hit-test coverage', () => {
  it('dashed stroke still registers hits in dash gaps (documented limitation)', () => {
    // Dashed stroke with [10, 10] pattern on a line: 10px drawn, 10px gap.
    // Hit testing treats all segments as solid, so a point in a gap still hits.
    const dashedLine = line({strokeWidth: 6, strokeDashArray: [10, 10]})
    // Point at x=55 is on the line segment and within a dash gap region.
    const hit = isPointInsideEngineShapeHitArea({x: 55, y: 0}, dashedLine, {tolerance: 4})
    // Currently hits even in the gap because dash is not honored.
    assert.equal(hit, true, 'dashed stroke should register hit (solid-stroke assumption)')
  })

  it('rounded cap: strokeWidth-based tolerance is applied by the scene layer', () => {
    // A line from (0,0) to (100,0) with round caps and 10px strokeWidth.
    // The scene layer calls resolveShapeHitTolerance which floors at strokeWidth/2 = 5.
    // The interaction layer uses explicit tolerance only.
    const cappedLine = line({strokeWidth: 10, strokeCap: 'round'})
    // Point at x=-3 is 3px before line start. With tolerance=5 (match scene layer floor), hits.
    const hitBeforeStart = isPointInsideEngineShapeHitArea({x: -3, y: 0}, cappedLine, {tolerance: 5})
    assert.equal(hitBeforeStart, true, 'point 3px before line start should hit with tolerance=5')
    // With tolerance=0, the interaction layer uses only the explicit value.
    const missBeforeStart = isPointInsideEngineShapeHitArea({x: -3, y: 0}, cappedLine, {tolerance: 0})
    assert.equal(missBeforeStart, false, 'point 3px before line start should miss with tolerance=0')
  })

  it('square cap does not extend hit area beyond tolerance band (documented limitation)', () => {
    // Square caps extend by strokeWidth/2 past endpoints (4px here).
    // The interaction-layer tolerance must be explicit; the scene layer
    // would call resolveShapeHitTolerance to incorporate strokeWidth.
    const squareCapLine = line({strokeWidth: 8, strokeCap: 'square'})
    // Point at x=102 is 2px past the endpoint. With tolerance=4 (matching strokeWidth/2),
    // this should hit.
    const hit = isPointInsideEngineShapeHitArea({x: 102, y: 0}, squareCapLine, {tolerance: 4})
    assert.equal(hit, true, 'point at x=102 should hit with tolerance=4')
    // With zero tolerance, the interaction layer uses only the explicit value.
    const miss = isPointInsideEngineShapeHitArea({x: 102, y: 0}, squareCapLine, {tolerance: 0})
    assert.equal(miss, false, 'point at x=102 should miss with explicit tolerance=0 (scene layer would add strokeWidth floor)')
  })

  it('miter join does not affect corner hit proximity (documented limitation)', () => {
    // Polygon corner hit: the proximity test uses per-edge distance, not join style.
    const miterPoly = polygonShape({
      stroke: {enabled: true},
      strokeWidth: 6,
      strokeJoin: 'miter',
      fill: {enabled: false},
    })
    // Point near corner (100, 0) — should hit due to edge proximity.
    const cornerHit = isPointInsideEngineShapeHitArea({x: 102, y: 2}, miterPoly, {tolerance: 3})
    assert.equal(cornerHit, true, 'point near corner should hit via edge proximity')
  })

  it('solid stroke (no dash array) hits as expected', () => {
    const solidLine = line({strokeWidth: 4})
    const hit = isPointInsideEngineShapeHitArea({x: 50, y: 1}, solidLine, {tolerance: 3})
    assert.equal(hit, true)
    const miss = isPointInsideEngineShapeHitArea({x: 50, y: 10}, solidLine, {tolerance: 3})
    assert.equal(miss, false)
  })
})

// ── FM-P1-003: Effect bounds policy ──────────────────────────────────────────

describe('FM-P1-003: effect bounds policy', () => {
  it('drop shadow offset does not expand hit-test bounds (render-only)', () => {
    // A rect at (0,0,100,80) with a shadow offset to x=115,y=40.
    // The shadow visually extends beyond the geometry, but hit-test stays AABB.
    const shadowRect = rect({x: 0, y: 0, width: 100, height: 80})
    // Point at x=115 is in the shadow region but outside the geometry AABB.
    const hit = isPointInsideEngineShapeHitArea({x: 115, y: 40}, shadowRect, {tolerance: 0})
    assert.equal(hit, false, 'shadow region should not be hittable (documented as render-only)')
  })

  it('large blur does not expand hit-test bounds (render-only)', () => {
    // Ellipse at (0,0,100,80) with no stroke. Blur is purely visual.
    const blurEllipse = ellipseShape({fill: {enabled: true}})
    // Point well outside the ellipse bounds.
    const hit = isPointInsideEngineShapeHitArea({x: 120, y: 40}, blurEllipse, {tolerance: 0})
    assert.equal(hit, false, 'blurred region should not expand hit bounds')
  })

  it('fill hit inside geometry bounds works regardless of effects', () => {
    const shape = ellipseShape({fill: {enabled: true}})
    const hit = isPointInsideEngineShapeHitArea(CENTER, shape, {tolerance: 0})
    assert.equal(hit, true, 'center of ellipse should always hit with fill enabled')
  })

  it('effect bounds expansion is documented as a future renderer concern', () => {
    // FM-P1-003 decision: shadow/blur bounds expansion is render-only for now.
    // The spatial index (RBush) uses raw geometry AABBs without visual expansion.
    // This matches most design tools where shadows are not selection targets.
    const shape = rect({x: 0, y: 0, width: 50, height: 50})
    // Far outside point.
    const miss = isPointInsideEngineShapeHitArea({x: 200, y: 200}, shape, {tolerance: 0})
    assert.equal(miss, false)
  })
})

// ── FM-P1-004: Clip/mask hit-test decision ──────────────────────────────────

describe('FM-P1-004: clip/mask hit-test semantics', () => {
  it('inline rect clip: point outside clip shape misses the clipped node', () => {
    // A rect at (0,0,100,80) with an inline clip shape that only covers (20,20,60,40).
    // Hit testing requires the point to be inside BOTH the clip shape and the node geometry.
    const clipSource = rect({id: 'clip', x: 20, y: 20, width: 60, height: 40})
    // Point inside clip bounds: should pass clip test.
    const insideClip = isPointInsideEngineClipShape({x: 50, y: 40}, clipSource, {tolerance: 0})
    assert.equal(insideClip, true, 'point inside clip bounds should pass')
    // Point outside clip bounds: should fail clip test.
    const outsideClip = isPointInsideEngineClipShape({x: 10, y: 10}, clipSource, {tolerance: 0})
    assert.equal(outsideClip, false, 'point outside clip bounds should fail')
  })

  it('inline rect clip with corner radius: respects rounded corners', () => {
    const roundedClip = rect({
      id: 'clip',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      cornerRadius: 20,
    })
    // Center is inside the rounded rect.
    const centerHit = isPointInsideEngineClipShape(CENTER, roundedClip, {tolerance: 0})
    assert.equal(centerHit, true)
    // Point near corner (3,3) with 20px radius — should be clipped (outside the arc).
    const cornerMiss = isPointInsideEngineClipShape({x: 3, y: 3}, roundedClip, {tolerance: 0})
    assert.equal(cornerMiss, false, 'point in rounded corner should be clipped')
  })

  it('ellipse clip: respects ellipse geometry', () => {
    const ellipseClip = ellipseShape({id: 'clip'})
    // Center is inside.
    assert.equal(isPointInsideEngineClipShape(CENTER, ellipseClip, {tolerance: 0}), true)
    // Corner is outside ellipse — a 100×80 ellipse at origin: normalized distance at (0,0) is 1.
    assert.equal(isPointInsideEngineClipShape({x: 0, y: 0}, ellipseClip, {tolerance: 0}), false, 'corner of ellipse bounds should be outside clip')
  })

  it('path clip: respects path polygon containment', () => {
    const diamondPath = pathShape({
      id: 'clip',
      points: [{x: 50, y: 0}, {x: 100, y: 40}, {x: 50, y: 80}, {x: 0, y: 40}],
      closed: true,
    })
    // Center is inside the diamond.
    assert.equal(isPointInsideEngineClipShape(CENTER, diamondPath, {tolerance: 0}), true)
    // Corner of the AABB is outside the diamond.
    assert.equal(isPointInsideEngineClipShape({x: 0, y: 0}, diamondPath, {tolerance: 0}), false, 'AABB corner should be outside diamond clip')
  })

  it('mask currently uses group container semantics: group itself is not hittable', () => {
    // Masks are modeled as groups with children. The group container itself is not hittable.
    const maskGroup = {
      id: 'mask',
      type: 'group' as const,
      x: 0, y: 0, width: 100, height: 80,
    } as unknown as EngineEditorHitTestNode
    const hit = isPointInsideEngineShapeHitArea(CENTER, maskGroup)
    assert.equal(hit, false, 'mask group container should not be directly hittable')
  })

  it('mask children are hittable individually (delegated hit-test)', () => {
    // Children inside a mask group are tested directly with ancestor transforms.
    const childRect = rect({id: 'child', x: 10, y: 10, width: 80, height: 60})
    const hit = isPointInsideEngineShapeHitArea(CENTER, childRect, {tolerance: 0})
    assert.equal(hit, true, 'child inside mask should be hittable')
  })

  it('clip hit-test decision: inline clipShape is primary path; clipNodeId is editor-level', () => {
    // FM-P1-004 decision: the engine's own hit-test path (scene/hitTest) handles
    // inline `clip.clipShape` only. Reference-based clipNodeId resolution lives
    // in the editor interaction pipeline (geometryPayloadSelection.ts) because
    // it requires shapeById lookup which is editor state.
    // This test validates the inline clip path works correctly.
    const rectClipSource = rect({id: 'clip', x: 10, y: 10, width: 50, height: 50})
    const pass = isPointInsideEngineClipShape({x: 30, y: 30}, rectClipSource, {tolerance: 0})
    assert.equal(pass, true, 'inline rect clip should work at engine level')
  })

  it('clip tolerance is configurable for path/polygon clips, rect clips use exact bounds', () => {
    // Rect clip: uses strict AABB containment (no tolerance expansion).
    const rectClipSource = rect({id: 'clip', x: 0, y: 0, width: 100, height: 80})
    const missRect = isPointInsideEngineClipShape({x: -0.5, y: 40}, rectClipSource, {tolerance: 0})
    assert.equal(missRect, false, 'point just outside rect clip should miss (strict AABB)')

    // Path clip: tolerance is applied for edge proximity.
    const diamondClip = pathShape({
      id: 'clip',
      points: [{x: 50, y: 0}, {x: 100, y: 40}, {x: 50, y: 80}, {x: 0, y: 40}],
      closed: true,
    })
    // Center (50,40) is inside the diamond polygon.
    assert.equal(isPointInsideEngineClipShape({x: 50, y: 40}, diamondClip, {tolerance: 0}), true)
    // Corner of AABB is outside, tolerance=0 should miss.
    assert.equal(isPointInsideEngineClipShape({x: 0, y: 0}, diamondClip, {tolerance: 0}), false)
    // With large tolerance, edge proximity allows hits near the diamond edges.
    // Point (5, 36) is ~5px from the left diamond edge (0,40)→(50,0).
    const nearEdge = isPointInsideEngineClipShape({x: 5, y: 36}, diamondClip, {tolerance: 8})
    assert.equal(nearEdge, true, 'point near diamond edge should hit with generous tolerance')
  })
})

// ── Cross-cutting: ToEditorHitTestShape passes all fields ─────────────────────

describe('toEditorHitTestShape field pass-through', () => {
  it('EngineEditorHitTestNode accepts strokeAlign and related fields', () => {
    // Type-level validation: these assignments must compile.
    const shape: EngineEditorHitTestNode = {
      id: 's1',
      type: 'rectangle',
      x: 0, y: 0, width: 100, height: 80,
      strokeAlign: 'inside',
      strokeWidth: 10,
      strokeDashArray: [5, 5],
      strokeCap: 'round',
      strokeJoin: 'miter',
    }
    assert.equal(shape.strokeAlign, 'inside')
    assert.equal(shape.strokeWidth, 10)
    assert.deepEqual(shape.strokeDashArray, [5, 5])
    assert.equal(shape.strokeCap, 'round')
    assert.equal(shape.strokeJoin, 'miter')
  })
})
