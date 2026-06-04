import assert from 'node:assert/strict'
import test from 'node:test'

import {createEngineOverlayNodesFromInstructions} from '../../../runtime/overlay/selectorOverlayAdapter.ts'
import {resolveCompleteTextRuns} from '../../../runtime/presets/engineSceneAdapter/engineSceneAdapter.text/engineSceneAdapter.text.ts'
import {
  resolveEllipseArcAngleFromPoint,
  resolveShapeStyleControls,
} from '../../../product/runtime/shapeStyleHandles.ts'
import type {DocumentNode} from '../../../runtime/model/index.ts'
import {resolveSelectedDisplayOutlines} from '../../../product/useEditorRuntime/derivedState/derivedState.shared.ts'

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
