import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveCreateEnginePerformanceProfileDiagnostics,
} from './createEnginePerformanceProfileDiagnostics.ts'
import type {
  EngineFrameBudget,
  EngineRenderStats,
} from '../../renderer/types/index.ts'
import type { EngineFramePlan } from '../../scene/framePlan.ts'

/**
 * Verifies missing telemetry produces a zeroed performance profile.
 */
test('resolveCreateEnginePerformanceProfileDiagnostics returns zero profile without stats', () => {
  const profile = resolveCreateEnginePerformanceProfileDiagnostics(null, null, undefined)

  assert.equal(profile.frameMs, 0)
  assert.equal(profile.sceneNodeCount, 0)
  assert.equal(profile.passCosts.knownPassTotalMs, 0)
  assert.equal(profile.budgetUtilization.drawSubmit, 0)
})

/**
 * Verifies performance profile aggregates pass timings and normalized budget pressure.
 */
test('resolveCreateEnginePerformanceProfileDiagnostics aggregates scene and pass costs', () => {
  const stats: EngineRenderStats = {
    drawCount: 4,
    visibleCount: 8,
    culledCount: 2,
    cacheHits: 3,
    cacheMisses: 1,
    frameReuseHits: 0,
    frameReuseMisses: 1,
    frameMs: 16,
    webglPlanBuildMs: 2,
    webglTextureUploadMs: 3,
    webglDrawSubmitMs: 4,
    webglSnapshotCaptureMs: 5,
    webglModelRenderMs: 6,
    webglImageTextureUploadBytes: 40,
    webglTextTextureUploadBytes: 10,
  }
  const framePlan: EngineFramePlan = {
    revision: 'r1',
    planVersion: 1,
    sceneNodeCount: 10,
    candidateNodeIds: ['a'],
    candidateCount: 1,
    viewportBounds: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    queryPadding: 0,
  }
  const frameBudget: EngineFrameBudget = {
    drawSubmitBudgetMs: 8,
    textureUploadBudgetBytes: 25,
    textureUploadTotalBudgetBytes: 100,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 1,
    tilePreloadBudgetMs: 1,
    tilePreloadMaxUploads: 1,
    overlayPassBudgetMs: 16,
  }

  const profile = resolveCreateEnginePerformanceProfileDiagnostics(stats, framePlan, frameBudget)

  assert.equal(profile.sceneNodeCount, 10)
  assert.equal(profile.cullingRatio, 0.2)
  assert.equal(profile.drawDensity, 0.5)
  assert.equal(profile.cacheHitRate, 0.75)
  assert.equal(profile.passCosts.knownPassTotalMs, 20)
  assert.equal(profile.budgetUtilization.drawSubmit, 0.5)
  assert.equal(profile.budgetUtilization.textureUploadBytes, 0.5)
  assert.equal(profile.budgetUtilization.overlayPass, 0.25)
})
