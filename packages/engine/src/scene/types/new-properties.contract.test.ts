/**
 * New property contract tests.
 *
 * Verifies that strokeConfig, fillConfig, ellipseGeometry, and anchorPoints
 * are correctly accepted by the engine type system and round-trip through
 * scene snapshot creation.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type {
  EngineShapeNode,
  EngineFillConfig,
  EngineStrokeConfig,
  EngineAnchorPoint,
  EngineEllipseGeometry,
  EngineSceneSnapshot,
} from '../../types/types.ts'

describe('new property contracts', () => {
  it('EngineFillConfig is accepted on shape nodes', () => {
    const fillConfig: EngineFillConfig = {
      color: '#ff0000',
      paints: [{ type: 'solid', color: '#00ff00' }],
    }
    const node: EngineShapeNode = {
      id: 'test',
      type: 'shape',
      shape: 'rect',
      fillConfig,
      width: 100,
      height: 80,
    }
    assert.equal(node.fillConfig?.color, '#ff0000')
    assert.equal(node.fillConfig?.paints?.[0]?.color, '#00ff00')
  })

  it('EngineStrokeConfig is accepted on shape nodes', () => {
    const strokeConfig: EngineStrokeConfig = {
      color: '#333333',
      width: 2,
      align: 'center',
      dashArray: [4, 2],
      cap: 'round',
      join: 'miter',
      startArrowhead: 'triangle',
      endArrowhead: 'none',
      paints: [{ type: 'solid', color: '#555555' }],
    }
    const node: EngineShapeNode = {
      id: 'test',
      type: 'shape',
      shape: 'line',
      strokeConfig,
      width: 100,
      height: 0,
    }
    assert.equal(node.strokeConfig?.width, 2)
    assert.equal(node.strokeConfig?.dashArray?.[0], 4)
    assert.equal(node.strokeConfig?.startArrowhead, 'triangle')
  })

  it('EngineEllipseGeometry is accepted on ellipse shape nodes', () => {
    const ellipseGeometry: EngineEllipseGeometry = {
      cx: 150,
      cy: 100,
      rx: 80,
      ry: 50,
    }
    const node: EngineShapeNode = {
      id: 'test',
      type: 'shape',
      shape: 'ellipse',
      ellipseGeometry,
      width: 160,
      height: 100,
    }
    assert.equal(node.ellipseGeometry?.cx, 150)
    assert.equal(node.ellipseGeometry?.ry, 50)
  })

  it('EngineAnchorPoint array is accepted on path shape nodes', () => {
    const anchorPoints: readonly EngineAnchorPoint[] = [
      { x: 0, y: 100 },
      { x: 50, y: 0, cp1: { x: 10, y: 70 }, cp2: { x: 40, y: 10 } },
      { x: 100, y: 100 },
    ]
    const node: EngineShapeNode = {
      id: 'test',
      type: 'shape',
      shape: 'path',
      anchorPoints,
      width: 100,
      height: 100,
    }
    assert.equal(node.anchorPoints?.[1]?.cp1?.x, 10)
    assert.equal(node.anchorPoints?.[1]?.cp2?.y, 10)
  })

  it('shape nodes are valid without x/y/width/height (optional for points-primary shapes)', () => {
    // Path with points but no explicit bounds — bounds are derivable.
    const node: EngineShapeNode = {
      id: 'test',
      type: 'shape',
      shape: 'path',
      bezierPoints: [
        { anchor: { x: 0, y: 0 } },
        { anchor: { x: 100, y: 50 }, cp1: { x: 30, y: 0 }, cp2: { x: 70, y: 50 } },
      ],
    }
    assert.equal(node.x, undefined)
    assert.equal(node.width, undefined)
  })

  it('scene snapshot accepts all new property shapes', () => {
    const snapshot: EngineSceneSnapshot = {
      revision: 'test',
      width: 400,
      height: 300,
      nodes: [
        {
          id: 'e1',
          type: 'shape',
          shape: 'ellipse',
          ellipseGeometry: { cx: 200, cy: 150, rx: 80, ry: 50 },
          fillConfig: { color: '#ff0000' },
          strokeConfig: { color: '#333', width: 2 },
        },
        {
          id: 'p1',
          type: 'shape',
          shape: 'path',
          anchorPoints: [
            { x: 0, y: 100 },
            { x: 100, y: 0, cp1: { x: 30, y: 70 } },
          ],
          strokeConfig: { color: '#7c3aed', width: 3, dashArray: [4, 2] },
        },
      ],
    }
    assert.equal(snapshot.nodes.length, 2)
    const ellipse = snapshot.nodes[0] as EngineShapeNode
    assert.equal(ellipse.ellipseGeometry?.cx, 200)
    const pathNode = snapshot.nodes[1] as EngineShapeNode
    assert.equal(pathNode.anchorPoints?.[0]?.x, 0)
  })
})
