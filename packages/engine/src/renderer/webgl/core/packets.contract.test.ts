import assert from 'node:assert/strict'
import test from 'node:test'

import type {EngineRenderableNode} from '../../../scene/types/types.ts'
import type {EngineRenderInstanceView} from '../../instances/instances.ts'
import type {EngineRenderPlan} from '../../plan/index.ts'
import {compileEngineWebGLPacketPlan} from './packets.ts'

/**
 * Creates one prepared shape node for packet contract assertions.
 * @param node Renderable shape node to include in the plan.
 */
function createSingleNodePlan(node: EngineRenderableNode): EngineRenderPlan {
  return {
    preparedNodes: [
      {
        node,
        worldMatrix: [1, 0, 0, 0, 1, 0],
        worldBounds: {x: 0, y: 0, width: 100, height: 50},
        culled: false,
        bucketKey: 'shape',
      },
    ],
    drawList: [0],
    batches: [{key: 'shape', nodeType: node.type, indices: [0]}],
    stats: {
      visibleCount: 1,
      culledCount: 0,
      collapsedGroupCount: 0,
      collapsedDescendantCulledCount: 0,
      geometryCacheHitCount: 0,
      geometryCacheMissCount: 1,
      geometryCacheHitRate: 0,
    },
  }
}

/**
 * Creates an empty instance view because stroke packet tests only inspect metadata.
 * @param index Draw-list index included by the instance view.
 */
function createInstanceView(index: number): EngineRenderInstanceView {
  return {
    count: 1,
    indices: Uint32Array.from([index]),
    transforms: new Float32Array(6),
    bounds: new Float32Array(4),
    batches: [{key: 'shape', nodeType: 'shape', count: 1, indices: Uint32Array.from([index])}],
  }
}

test('compileEngineWebGLPacketPlan treats zero stroke width as no stroke', () => {
  const plan = createSingleNodePlan({
    id: 'zero-stroke',
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    stroke: '#2563eb',
    strokeWidth: 0,
  })

  const packetPlan = compileEngineWebGLPacketPlan(plan, createInstanceView(0))

  assert.equal(packetPlan.packets[0]?.shapeHasStroke, false)
  assert.equal(packetPlan.packets[0]?.shapeStrokeWidth, 0)
})

test('compileEngineWebGLPacketPlan keeps implicit stroke width only when stroke exists', () => {
  const plan = createSingleNodePlan({
    id: 'implicit-stroke',
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    stroke: '#2563eb',
  })

  const packetPlan = compileEngineWebGLPacketPlan(plan, createInstanceView(0))

  assert.equal(packetPlan.packets[0]?.shapeHasStroke, true)
  assert.equal(packetPlan.packets[0]?.shapeStrokeWidth, undefined)
})
