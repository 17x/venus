import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveEngineWebGPU3DPassPlan,
} from './webgpu3dPassPlan.ts'

/**
 * Verifies material, lighting, and geometry keys group candidates into stable 3D pass batches.
 */
test('resolveEngineWebGPU3DPassPlan groups candidates by material lighting and geometry', () => {
  const plan = resolveEngineWebGPU3DPassPlan({
    materialRegistry: {
      materialsById: {
        litA: {
          id: 'litA',
          shadingModel: 'lit',
          surface: {baseColor: '#fff', opacity: 0.75},
        },
      },
    },
    lightingRig: {
      lights: [{
        id: 'sun',
        type: 'directional',
        directionX: 0,
        directionY: -1,
        directionZ: 0,
      }],
    },
    candidates: [
      {
        nodeId: 'a',
        nodeType: 'shape',
        materialId: 'litA',
        geometryKey: 'cube',
        instanceId: 'i1',
      },
      {
        nodeId: 'b',
        nodeType: 'shape',
        materialId: 'litA',
        geometryKey: 'cube',
        instanceId: 'i2',
      },
    ],
  })

  assert.equal(plan.batches.length, 1)
  assert.deepEqual(plan.batches[0]?.nodeIds, ['a', 'b'])
  assert.deepEqual(plan.batches[0]?.instanceIds, ['i1', 'i2'])
  assert.equal(plan.batches[0]?.material.shadingModel, 'lit')
  assert.deepEqual(plan.batches[0]?.lighting.activeLightIds, ['sun'])
  assert.equal(plan.coverage.instancedBatchCount, 1)
  assert.equal(plan.coverage.litBatchCount, 1)
})

/**
 * Verifies unsupported nodes are excluded from native pass batches and coverage reflects gaps.
 */
test('resolveEngineWebGPU3DPassPlan reports unsupported candidate coverage', () => {
  const plan = resolveEngineWebGPU3DPassPlan({
    candidates: [
      {nodeId: 'shape', nodeType: 'shape'},
      {nodeId: 'text', nodeType: 'text'},
      {nodeId: 'group', nodeType: 'group'},
    ],
  })

  assert.deepEqual(plan.unsupportedNodeIds, ['text', 'group'])
  assert.equal(plan.coverage.supportedCount, 1)
  assert.equal(plan.coverage.unsupportedCount, 2)
  assert.equal(plan.coverage.nativeCoverageRatio, 1 / 3)
})

/**
 * Verifies node lighting overrides can force an unlit batch from a lit material.
 */
test('resolveEngineWebGPU3DPassPlan applies node lighting overrides', () => {
  const plan = resolveEngineWebGPU3DPassPlan({
    materialRegistry: {
      materialsById: {
        litA: {id: 'litA', shadingModel: 'lit'},
      },
    },
    candidates: [{
      nodeId: 'a',
      nodeType: 'shape',
      materialId: 'litA',
      lightingMode: 'unlit',
    }],
  })

  assert.equal(plan.batches[0]?.material.shadingModel, 'lit')
  assert.equal(plan.batches[0]?.lighting.mode, 'none')
  assert.equal(plan.coverage.unlitBatchCount, 1)
})

/**
 * Verifies empty plans are considered fully covered with no required native draws.
 */
test('resolveEngineWebGPU3DPassPlan treats empty input as complete coverage', () => {
  const plan = resolveEngineWebGPU3DPassPlan({candidates: []})

  assert.equal(plan.coverage.nativeCoverageRatio, 1)
  assert.equal(plan.batches.length, 0)
  assert.equal(plan.unsupportedNodeIds.length, 0)
})
