import assert from 'node:assert/strict'
import test from 'node:test'

import { isEnginePipelineBackendCapabilityV2 } from '../pipeline/contractV2.ts'
import { buildEnginePhaseAwarePackets } from '../pipeline/phaseAwarePacketBuilder.ts'
import { resolveEngineProgressivePass } from '../pipeline/progressiveRenderingContract.ts'
import { resolveEnginePartialRedrawDecision } from '../pipeline/partialRedrawPolicy.ts'
import { resolveEngineRoiSharpenWeights } from '../pipeline/roiSharpenPolicy.ts'
import { resolveEngineGeometryCacheKey } from './geometryCachePolicy.ts'
import {
  resolveEngineTextureEvictionCandidates,
  sortEngineTextureUploadQueue,
} from './textureCachePolicy.ts'
import { resolveEngineTileSchedulerOrder } from './tileSchedulerPolicy.ts'

test('pipeline contract v2 validates capability payload', () => {
  assert.equal(isEnginePipelineBackendCapabilityV2({
    backend: 'webgl',
    packetDraw: true,
    progressivePass: true,
    partialRedraw: true,
  }), true)
})

test('phase-aware packet builder preserves critical packets', () => {
  const result = buildEnginePhaseAwarePackets([
    { id: 'critical', cost: 100, critical: true },
    { id: 'normal', cost: 100, critical: false },
  ], 'pan', {
    drawSubmitBudgetMs: 1,
    textureUploadBudgetBytes: 1,
    textureUploadTotalBudgetBytes: 1,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 1,
    tilePreloadBudgetMs: 1,
    tilePreloadMaxUploads: 1,
    overlayPassBudgetMs: 1,
  })

  assert.equal(result.packets[0]?.id, 'critical')
  assert.equal(result.clippedCount, 1)
})

test('progressive and partial-redraw contracts return deterministic decisions', () => {
  assert.equal(resolveEngineProgressivePass({
    phase: 'settling',
    interactionActive: false,
    settleSharpnessPending: true,
  }), 'preview')

  const redraw = resolveEnginePartialRedrawDecision([
    { x: 0, y: 0, width: 10, height: 10 },
  ], 'static')
  assert.equal(redraw.fallbackToFullRedraw, false)
  assert.equal(redraw.dirtyRegions.length, 1)
})

test('cache and scheduler contracts enforce priority order', () => {
  const cacheKey = resolveEngineGeometryCacheKey({
    nodeId: 'n1',
    revision: 2,
    phaseHint: 'static',
  })
  assert.equal(cacheKey, 'n1|2|static')

  const sortedTextures = sortEngineTextureUploadQueue([
    { id: 'normal', tier: 'normal', byteSize: 1, lastUsedFrame: 2 },
    { id: 'critical', tier: 'critical', byteSize: 1, lastUsedFrame: 1 },
  ])
  assert.equal(sortedTextures[0]?.id, 'critical')

  const evictions = resolveEngineTextureEvictionCandidates([
    { id: 'critical', tier: 'critical', byteSize: 10, lastUsedFrame: 1 },
    { id: 'bg', tier: 'background', byteSize: 10, lastUsedFrame: 0 },
  ], 5)
  assert.deepEqual(evictions, ['bg'])

  const tileOrder = resolveEngineTileSchedulerOrder([
    { id: 'predicted', viewportVisible: false, predicted: true, waitingFrames: 1 },
    { id: 'visible', viewportVisible: true, predicted: false, waitingFrames: 0 },
  ])
  assert.equal(tileOrder[0]?.id, 'visible')
})

test('roi sharpen contract prioritizes center targets', () => {
  const targets = resolveEngineRoiSharpenWeights([
    { id: 'center', distanceToCenterPx: 0 },
    { id: 'edge', distanceToCenterPx: 100 },
  ], 100)
  assert.ok((targets[0]?.sharpenWeight ?? 0) > (targets[1]?.sharpenWeight ?? 0))
})
