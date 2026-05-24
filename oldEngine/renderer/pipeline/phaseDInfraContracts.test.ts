import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineBackendFallbackMatrix } from './backendFallbackMatrix.ts'
import { resolveEnginePipelineFrameTrace } from './pipelineTrace.ts'
import { resolveEngineRenderRegressionResult } from './renderRegressionHarness.ts'
import { resolveEnginePartialRedrawDecision } from './partialRedrawPolicy.ts'
import { resolveEngineProgressivePass } from './progressiveRenderingContract.ts'
import { resolveEngineRoiSharpenWeights } from './roiSharpenPolicy.ts'
import { buildEnginePhaseAwarePackets } from './phaseAwarePacketBuilder.ts'
import {
  applyEngineIncrementalVisibilityUpdates,
  queryEngineIncrementalVisibility,
} from '../plan/incrementalVisibilityIndex.ts'
import { canReuseEngineCacheEntry } from '../cache/cacheConsistencyGuard.ts'

test('backend matrix and pipeline trace contracts are stable', () => {
  assert.equal(
    resolveEngineBackendFallbackMatrix('webgpu', { webgpu: false, webgl: true }),
    'webgl',
  )

  const trace = resolveEnginePipelineFrameTrace([
    { stageId: 'build', elapsedMs: 10 },
    { stageId: 'draw', elapsedMs: 8 },
  ])
  assert.equal(trace.totalMs, 18)
  assert.equal(trace.slowFrame, true)
})

test('regression and redraw/progressive contracts produce expected decisions', () => {
  const regression = resolveEngineRenderRegressionResult({
    baselineValue: 10,
    candidateValue: 12,
    tolerance: 3,
  })
  assert.equal(regression.pass, true)

  const redraw = resolveEnginePartialRedrawDecision([
    { x: 0, y: 0, width: 10, height: 10 },
  ], 'pan')
  assert.equal(redraw.fallbackToFullRedraw, false)

  assert.equal(resolveEngineProgressivePass({
    phase: 'camera',
    interactionActive: false,
    settleSharpnessPending: false,
  }), 'preview')
})

test('roi, packet clipping, visibility index, and consistency guard contracts hold', () => {
  const weights = resolveEngineRoiSharpenWeights([
    { id: 'center', distanceToCenterPx: 0 },
    { id: 'edge', distanceToCenterPx: 100 },
  ], 100)
  assert.ok((weights[0]?.sharpenWeight ?? 0) > (weights[1]?.sharpenWeight ?? 0))

  const packetResult = buildEnginePhaseAwarePackets([
    { id: 'critical', cost: 3, critical: true },
    { id: 'normal', cost: 5, critical: false },
  ], 'pan', {
    drawSubmitBudgetMs: 4,
    textureUploadBudgetBytes: 1,
    textureUploadTotalBudgetBytes: 1,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 1,
    tilePreloadBudgetMs: 1,
    tilePreloadMaxUploads: 1,
    overlayPassBudgetMs: 1,
  })
  assert.equal(packetResult.packets[0]?.id, 'critical')

  const index = applyEngineIncrementalVisibilityUpdates({ entries: {} }, [
    {
      nodeId: 'n1',
      bounds: { x: 0, y: 0, width: 10, height: 10 },
      revision: 1,
    },
  ])
  assert.deepEqual(
    queryEngineIncrementalVisibility(index, { x: 0, y: 0, width: 5, height: 5 }),
    ['n1'],
  )

  assert.equal(
    canReuseEngineCacheEntry(
      { phase: 'pan', dprClass: 'mid', scaleClass: 'normal' },
      { phase: 'pan', dprClass: 'mid', scaleClass: 'normal' },
    ),
    true,
  )
})
