// Canvas2D shape object-model tests verify render command emission only; full
// backend orchestration, product document semantics, and UI overlay are out of scope.
import assert from 'node:assert/strict'
import test from 'node:test'

import type {EngineShapeNode} from '../../scene/types/types.ts'
import {
  appendShapePath,
  drawShapeArrowheads,
  type Canvas2DPathCounters,
} from './shapes.ts'

class RecordingCanvasContext {
  readonly calls: string[] = []
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1

  /**
   * Records one canvas command name for deterministic assertions.
   */
  private record(name: string) {
    this.calls.push(name)
  }

  /**
   * Records save calls.
   */
  save() {
    this.record('save')
  }

  /**
   * Records restore calls.
   */
  restore() {
    this.record('restore')
  }

  /**
   * Records beginPath calls.
   */
  beginPath() {
    this.record('beginPath')
  }

  /**
   * Records moveTo calls.
   */
  moveTo() {
    this.record('moveTo')
  }

  /**
   * Records lineTo calls.
   */
  lineTo() {
    this.record('lineTo')
  }

  /**
   * Records bezierCurveTo calls.
   */
  bezierCurveTo() {
    this.record('bezierCurveTo')
  }

  /**
   * Records quadraticCurveTo calls.
   */
  quadraticCurveTo() {
    this.record('quadraticCurveTo')
  }

  /**
   * Records rect calls.
   */
  rect() {
    this.record('rect')
  }

  /**
   * Records ellipse calls.
   */
  ellipse() {
    this.record('ellipse')
  }

  /**
   * Records arc calls.
   */
  arc() {
    this.record('arc')
  }

  /**
   * Records closePath calls.
   */
  closePath() {
    this.record('closePath')
  }

  /**
   * Records fill calls.
   */
  fill() {
    this.record('fill')
  }

  /**
   * Records stroke calls.
   */
  stroke() {
    this.record('stroke')
  }
}

/**
 * Creates an isolated path counter object for one shape render assertion.
 */
function createPathCounters(): Canvas2DPathCounters {
  return {
    trivialPathFastPathCount: 0,
    contourParseCount: 0,
  }
}

/**
 * Casts the recording context to the narrow Canvas2D surface expected by shape helpers.
 */
function asCanvasContext(context: RecordingCanvasContext) {
  return context as unknown as CanvasRenderingContext2D
}

test('appendShapePath emits render commands for every engine shape kind', () => {
  const shapes: Array<{node: EngineShapeNode; expectedCalls: readonly string[]}> = [
    {
      node: {
        id: 'rect-rounded',
        type: 'shape',
        shape: 'rect',
        x: 0,
        y: 0,
        width: 20,
        height: 12,
        cornerRadii: {
          topLeft: 4,
          topRight: 2,
          bottomRight: 6,
          bottomLeft: 1,
        },
      },
      expectedCalls: ['moveTo', 'quadraticCurveTo', 'closePath'],
    },
    {
      node: {
        id: 'ellipse-arc',
        type: 'shape',
        shape: 'ellipse',
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        ellipseStartAngle: 15,
        ellipseEndAngle: 300,
        ellipseDrawWedgeLine: true,
      },
      expectedCalls: ['moveTo', 'ellipse', 'closePath'],
    },
    {
      node: {
        id: 'ellipse-arc-no-wedge',
        type: 'shape',
        shape: 'ellipse',
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        ellipseStartAngle: 15,
        ellipseEndAngle: 300,
      },
      expectedCalls: ['ellipse', 'closePath'],
    },
    {
      node: {
        id: 'line-arrow',
        type: 'shape',
        shape: 'line',
        x: 0,
        y: 0,
        width: 32,
        height: 0,
        points: [
          {x: 0, y: 0},
          {x: 32, y: 0},
        ],
      },
      expectedCalls: ['moveTo', 'lineTo'],
    },
    {
      node: {
        id: 'polygon',
        type: 'shape',
        shape: 'polygon',
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        points: [
          {x: 0, y: 0},
          {x: 20, y: 0},
          {x: 10, y: 20},
        ],
      },
      expectedCalls: ['moveTo', 'lineTo', 'closePath'],
    },
    {
      node: {
        id: 'path',
        type: 'shape',
        shape: 'path',
        x: 0,
        y: 0,
        width: 30,
        height: 20,
        bezierPoints: [
          {anchor: {x: 0, y: 20}},
          {
            anchor: {x: 30, y: 0},
            cp1: {x: 12, y: 2},
          },
        ],
      },
      expectedCalls: ['moveTo', 'bezierCurveTo'],
    },
  ]

  for (const shape of shapes) {
    const context = new RecordingCanvasContext()
    const rendered = appendShapePath(
      asCanvasContext(context),
      shape.node,
      {
        x: shape.node.x,
        y: shape.node.y,
        width: shape.node.width,
        height: shape.node.height,
      },
      0,
      1,
      createPathCounters(),
    )

    assert.equal(rendered, true, `${shape.node.shape} should render`)
    for (const expectedCall of shape.expectedCalls) {
      assert.equal(
        context.calls.includes(expectedCall),
        true,
        `${shape.node.shape} should emit ${expectedCall}`,
      )
    }
  }
})

test('drawShapeArrowheads emits endpoint commands for open line shapes', () => {
  const context = new RecordingCanvasContext()
  const lineNode: EngineShapeNode = {
    id: 'line-arrowheads',
    type: 'shape',
    shape: 'line',
    x: 0,
    y: 0,
    width: 40,
    height: 0,
    strokeStartArrowhead: 'circle',
    strokeEndArrowhead: 'triangle',
    points: [
      {x: 0, y: 0},
      {x: 40, y: 0},
    ],
  }

  drawShapeArrowheads(
    asCanvasContext(context),
    lineNode,
    '#111827',
    3,
    {
      x: 0,
      y: 0,
      width: 40,
      height: 0,
    },
  )

  assert.equal(context.calls.includes('arc'), true)
  assert.equal(context.calls.includes('fill'), true)
  assert.equal(context.calls.filter((call) => call === 'save').length, 2)
  assert.equal(context.calls.filter((call) => call === 'restore').length, 2)
})
