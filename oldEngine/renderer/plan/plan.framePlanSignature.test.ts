import assert from 'node:assert/strict'
import test from 'node:test'

import { prepareEngineRenderPlan } from '../plan/index.ts'
import type { EngineRenderFrame } from '../types/index.ts'

/**
 * Creates one minimal render frame with optional candidate shortlist override.
  * @param candidateIds candidateIds parameter.
*/
function createRenderFrame(candidateIds?: readonly string[]): EngineRenderFrame {
  return {
    scene: {
      revision: 'plan-signature-1',
      width: 1000,
      height: 1000,
      nodes: [
        {
          id: 'shape-a',
          type: 'shape',
          shape: 'rect',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fill: '#111111',
        },
        {
          id: 'shape-b',
          type: 'shape',
          shape: 'rect',
          x: 200,
          y: 0,
          width: 100,
          height: 100,
          fill: '#222222',
        },
      ],
    },
    viewport: {
      viewportWidth: 800,
      viewportHeight: 600,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
      framePlanVersion: 1,
      framePlanCandidateIds: candidateIds,
    },
  }
}

test('prepareEngineRenderPlan does not reuse cache across same-length candidate-id changes', () => {
  const frameA = createRenderFrame(['shape-a'])
  const frameB = createRenderFrame(['shape-b'])

  const planA = prepareEngineRenderPlan(frameA)
  const planB = prepareEngineRenderPlan(frameB)

  // Signature must differentiate shortlist content so planner cache does not return stale draw list.
  assert.notDeepEqual(planB.drawList, planA.drawList)
})

test('prepareEngineRenderPlan uses layered candidates when shortlist ids are absent', () => {
  const frame = createRenderFrame(undefined)
  frame.context.layeredRender = {
    base: [
      {
        id: 'base:shape-b',
        nodeId: 'shape-b',
        layer: 'base',
        nodeType: 'shape',
        bounds: {x: 200, y: 0, width: 100, height: 100},
      },
    ],
    active: [],
    overlay: [],
    composed: [],
  }

  const plan = prepareEngineRenderPlan(frame)
  const visibleNodeIds = plan.drawList.map((index) => plan.preparedNodes[index]?.node.id)

  // Migration fallback should keep planner shortlist aligned with layered base+active candidate ids.
  assert.deepEqual(visibleNodeIds, ['shape-b'])
})
