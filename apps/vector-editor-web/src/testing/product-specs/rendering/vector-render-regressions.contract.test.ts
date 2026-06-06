import assert from 'node:assert/strict'
import test from 'node:test'

import {createEngineOverlayNodesFromInstructions} from '../../../runtime/overlay/selectorOverlayAdapter.ts'
import {
  adaptOverlayModelToInstructions,
  buildVectorOverlayModel,
} from '../../../runtime/primitive/index.ts'
import {resolveCompleteTextRuns} from '../../../runtime/presets/engineSceneAdapter/engineSceneAdapter.text/engineSceneAdapter.text.ts'
import {
  resolveConstrainedShapeStyleDragPoint,
  resolveEllipseArcAngleFromPoint,
  resolveRectCornerRadiusFromPoint,
  resolveShapeStyleControls,
} from '../../../product/runtime/shapeStyleHandles.ts'
import type {DocumentNode} from '../../../runtime/model/index.ts'
import {resolveSelectedDisplayOutlines} from '../../../product/useEditorRuntime/derivedState/derivedState.shared.ts'
import {collectProjectionDiagnostics} from '../../../product/useEditorRuntime/derivedState/derivedState.projectionDiagnostics.ts'

test('sparse rich-text runs preserve uncovered line breaks and trailing text', () => {
  const text = 'First line\nSecond line'
  const runs = resolveCompleteTextRuns(text, [{
    start: 0,
    end: 5,
    style: {fontSize: 18},
  }])

  assert.equal(runs.map((run) => text.slice(run.start, run.end)).join(''), text)
  assert.equal(runs.some((run) => text.slice(run.start, run.end).includes('\n')), true)
})

test('ellipse arc angles use one screen-space convention across handlers', () => {
  const ellipse: DocumentNode = {
    id: 'ellipse',
    type: 'ellipse',
    name: 'Ellipse',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    ellipseStartAngle: 90,
    ellipseEndAngle: 180,
  }

  assert.equal(resolveEllipseArcAngleFromPoint({shape: ellipse, point: {x: 50, y: 100}}), 90)
  const controls = resolveShapeStyleControls({
    selectedShapeIds: [ellipse.id],
    previewShapeById: new Map([[ellipse.id, ellipse]]),
    handleToleranceWorld: 10,
    minRectHandleInsetWorld: 10,
    activeDrag: null,
  })
  const startControl = controls.find((control) => control.kind === 'arc-angle-start')
  assert.equal(startControl?.hitArea.kind, 'point')
  if (startControl?.hitArea.kind === 'point') {
    assert.equal(startControl.hitArea.center.y > 50, true)
  }
})

test('special style handles project live points through generic Engine constraints', () => {
  const rectangle: DocumentNode = {
    id: 'rectangle',
    type: 'rectangle',
    name: 'Rectangle',
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    cornerRadius: 12,
  }
  const controls = resolveShapeStyleControls({
    selectedShapeIds: [rectangle.id],
    previewShapeById: new Map([[rectangle.id, rectangle]]),
    handleToleranceWorld: 4,
    minRectHandleInsetWorld: 4,
    activeDrag: null,
  })
  const topLeft = controls.find((control) => control.metadata?.corner === 'topLeft')
  assert.equal(topLeft?.hitArea.kind, 'point')
  if (topLeft?.hitArea.kind !== 'point') {
    return
  }

  assert.deepEqual(topLeft.hitArea.center, {x: 22, y: 32})
  assert.equal(resolveRectCornerRadiusFromPoint({
    shape: rectangle,
    corner: 'topLeft',
    point: topLeft.hitArea.center,
  }), 12)

  const constrainedRectPoint = resolveConstrainedShapeStyleDragPoint({
    shape: rectangle,
    drag: {
      kind: 'rect-radius',
      payload: {shapeId: rectangle.id, corner: 'topLeft', point: {x: 500, y: 500}},
    },
  })
  assert.deepEqual(constrainedRectPoint, {x: 40, y: 50})

  const ellipse: DocumentNode = {
    id: 'ellipse-projection',
    type: 'ellipse',
    name: 'Ellipse',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
  }
  assert.deepEqual(resolveConstrainedShapeStyleDragPoint({
    shape: ellipse,
    drag: {
      kind: 'ellipse-arc',
      payload: {shapeId: ellipse.id, boundary: 'start', point: {x: 100, y: 500}},
    },
  }), {x: 100, y: 75})
})

test('runtime overlay bridge preserves visible special-handler style', () => {
  const nodes = createEngineOverlayNodesFromInstructions([{
    id: 'corner-radius-handler',
    layerId: 'overlay.handles',
    primitive: 'handle',
    coordinate: 'world',
    points: [{x: 12, y: 18}],
    style: {
      strokeColor: '#2563eb',
      fillColor: '#ffffff',
      pointRadius: 6,
      nonScalingStroke: true,
    },
  }])

  assert.equal(nodes.length, 1)
  assert.equal((nodes[0].style as {pointRadius?: number}).pointRadius, 6)
})

test('masked selection renders one primary outline instead of linked detail outlines', () => {
  const maskHost: DocumentNode = {
    id: 'mask-host',
    type: 'image',
    name: 'Mask Host',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    clipPathId: 'mask-source',
  }
  const outlines = resolveSelectedDisplayOutlines({
    id: 'document',
    name: 'Document',
    width: 100,
    height: 100,
    shapes: [maskHost],
  }, {
    nodeId: maskHost.id,
    outline: {kind: 'bounds'},
    detailOutlines: [{kind: 'bounds'}, {kind: 'bounds'}],
  })

  assert.equal(outlines.length, 1)
})

test('rotated single selection marquee stays bounded to transformed element geometry', () => {
  const selectedBounds = {
    minX: 220,
    minY: 240,
    maxX: 400,
    maxY: 344,
  }
  const model = buildVectorOverlayModel({
    selectedBounds,
    selectionRotationDegrees: 30,
    selectedShapeIds: ['card-analytics'],
    marqueeBounds: null,
    hoveredShapeBounds: null,
    hoveredShapePolygon: null,
    hoveredShapeId: null,
    edgeToleranceWorld: 6,
    cornerToleranceWorld: 10,
    rotateSectorInnerRadiusWorld: 12,
    rotateSectorOuterRadiusWorld: 22,
    rotateCornerOffsetWorld: 10,
    version: 1,
  })
  const selectionBoundsInstruction = adaptOverlayModelToInstructions(model)
    .find((instruction) => instruction.id === 'selection-bounds')

  assert.ok(selectionBoundsInstruction)
  const points = selectionBoundsInstruction.points ?? []
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)

  assert.equal(points.length, 5)
  assert.ok(width > 200 && width < 210, `expected rotated marquee width near 208, received ${width}`)
  assert.ok(height > 178 && height < 182, `expected rotated marquee height near 180, received ${height}`)
})

test('projection diagnostics stay empty when runtime and engine selection bounds agree', () => {
  const diagnostics = collectProjectionDiagnostics({
    selectedBounds: {minX: 10, minY: 20, maxX: 110, maxY: 80},
    selectedGeometryPayloads: [{
      nodeId: 'card',
      bounds: {minX: 10.1, minY: 20.1, maxX: 109.9, maxY: 79.9},
    }],
    tolerance: 0.5,
  })

  assert.deepEqual(diagnostics, [])
})

test('projection diagnostics report overlay geometry mismatch before visible drift ships', () => {
  const diagnostics = collectProjectionDiagnostics({
    selectedBounds: {minX: 10, minY: 20, maxX: 110, maxY: 80},
    selectedGeometryPayloads: [{
      nodeId: 'card',
      bounds: {minX: 30, minY: 20, maxX: 130, maxY: 80},
    }],
    tolerance: 0.5,
  })

  assert.equal(diagnostics.length, 1)
  assert.deepEqual(diagnostics[0], {
    code: 'v2d.projection.overlay-geometry.mismatch',
    nodeId: 'card',
    source: 'overlay',
    expectedBounds: {minX: 10, minY: 20, maxX: 110, maxY: 80},
    actualBounds: {minX: 30, minY: 20, maxX: 130, maxY: 80},
    tolerance: 0.5,
  })
})

test('projection diagnostics report stale spatial bounds when engine selection geometry is missing', () => {
  const diagnostics = collectProjectionDiagnostics({
    selectedBounds: {minX: 10, minY: 20, maxX: 110, maxY: 80},
    selectedGeometryPayloads: [],
    tolerance: 0.5,
  })

  assert.equal(diagnostics.length, 1)
  assert.deepEqual(diagnostics[0], {
    code: 'v2d.projection.spatial-bounds.stale',
    nodeId: 'selection',
    source: 'engine.hit-geometry',
    expectedBounds: {minX: 10, minY: 20, maxX: 110, maxY: 80},
    actualBounds: {minX: 10, minY: 20, maxX: 110, maxY: 80},
    tolerance: 0.5,
  })
})
