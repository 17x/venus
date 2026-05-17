import test from 'node:test'
import assert from 'node:assert/strict'

import type { EngineRenderStats } from '../../renderer/types/index.ts'
import type { EngineRuntimeDiagnostics } from '../../runtime/createEngine/createEngine.ts'
import { buildEngineBaselineReport } from './baselineReport.ts'

/**
 * Intent: build minimal deterministic render stats fixtures for baseline report tests.
 * @returns Fixed render stats list.
 */
function createRenderStatsFixtures(): EngineRenderStats[] {
  return [
    {
      drawCount: 10,
      visibleCount: 20,
      culledCount: 3,
      cacheHits: 0,
      cacheMisses: 0,
      frameReuseHits: 0,
      frameReuseMisses: 0,
      frameMs: 12,
      cacheFallbackReason: 'none',
      tileSchedulerPendingCount: 1,
    },
    {
      drawCount: 11,
      visibleCount: 25,
      culledCount: 2,
      cacheHits: 0,
      cacheMisses: 0,
      frameReuseHits: 0,
      frameReuseMisses: 0,
      frameMs: 20,
      cacheFallbackReason: 'preview-throttle',
      tileSchedulerPendingCount: 3,
    },
  ]
}

/**
 * Intent: build minimal deterministic diagnostics fixtures for baseline report tests.
 * @returns Fixed diagnostics list.
 */
function createDiagnosticsFixtures(): EngineRuntimeDiagnostics[] {
  return [
    {
      backend: 'webgl',
      renderStats: null,
      pixelRatio: 1,
      outputPixelRatio: 1,
      scene: {
        nodeCount: 0,
        rootCount: 0,
        revision: 0,
        spatialNodeCount: 0,
      },
      framePlan: null,
      hitPlan: null,
      shortlist: {
        active: false,
        candidateRatio: 1,
        appliedCandidateCount: 0,
        pendingState: null,
        pendingFrameCount: 0,
        toggleCount: 0,
        debounceBlockedToggleCount: 0,
        minSceneNodes: 0,
        ratioThreshold: 0,
        hysteresisRatio: 0,
        enterRatioThreshold: 0,
        leaveRatioThreshold: 0,
        stableFrameCount: 0,
      },
      viewport: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        viewportWidth: 100,
        viewportHeight: 100,
      },
      cameraAnimation: {
        active: false,
        cachePreviewOnly: false,
        previewHitCount: 0,
        previewMissCount: 0,
      },
      strategy: {
        phase: 'pan',
        interactionActive: true,
        quality: 'interactive',
        lastInteractionKind: 'pan',
        lastInteractionElapsedMs: 2,
      },
      predictor: {
        directionX: 1,
        directionY: 0,
        speedPxPerSec: 120,
        confidence: 0.8,
      },
      budget: {
        pressure: 'medium',
        drawSubmitBudgetMs: 1,
        textureUploadBudgetBytes: 1,
        textureUploadTotalBudgetBytes: 2,
        imageTextureUploadMaxCount: 1,
        textTextureUploadMaxCount: 1,
        tilePreloadBudgetMs: 1,
        tilePreloadMaxUploads: 1,
        overlayPassBudgetMs: 1,
      },
      strategySnapshot: {
        lane: 'pan',
        budgetPressure: 'medium',
        fallbackReason: null,
        predictorConfidence: 0.8,
        previewExecutionMode: 'affine-snapshot',
      },
      visibility3dPolicy: {
        executionMode: 'fallback-frustum-coarse',
        hasFrustumResolver: false,
        hasOcclusionResolver: false,
      },
      settleSharpness: {
        pending: true,
        remainingDeadlineMs: 100,
        forceSharpFrame: false,
        metCount: 0,
        missCount: 0,
        lastLatencyMs: 0,
        lastMissLatencyMs: 0,
        highZoomTextSlaCheckedCount: 0,
        highZoomTextSlaViolationCount: 0,
      },
      performanceGate: {
        fpsHealthy: true,
        frameTimeHealthy: true,
        fallbackHealthy: true,
        overBudgetHealthy: true,
        aggregateHealthy: true,
      },
      policy: {
        profile: 'editor',
        preset: 'balanced',
        renderScale: 1,
        pressureScore: 0,
        scalerDecisionReason: 'hold',
      },
      qos: {
        profile: 'editor',
        stablePhase: 'pan',
        pressure: 'medium',
        budget: {
          drawSubmitBudgetMs: 1,
          textureUploadBudgetBytes: 1,
          textureUploadTotalBudgetBytes: 2,
          imageTextureUploadMaxCount: 1,
          textTextureUploadMaxCount: 1,
          tilePreloadBudgetMs: 1,
          tilePreloadMaxUploads: 1,
          overlayPassBudgetMs: 1,
        },
        degradationLevel: 'none',
        fallbackReason: null,
        trace: 'trace-1',
        guardTriggers: [],
      },
    },
    {
      backend: 'webgl',
      renderStats: null,
      pixelRatio: 1,
      outputPixelRatio: 1,
      scene: {
        nodeCount: 0,
        rootCount: 0,
        revision: 0,
        spatialNodeCount: 0,
      },
      framePlan: null,
      hitPlan: null,
      shortlist: {
        active: false,
        candidateRatio: 1,
        appliedCandidateCount: 0,
        pendingState: null,
        pendingFrameCount: 0,
        toggleCount: 0,
        debounceBlockedToggleCount: 0,
        minSceneNodes: 0,
        ratioThreshold: 0,
        hysteresisRatio: 0,
        enterRatioThreshold: 0,
        leaveRatioThreshold: 0,
        stableFrameCount: 0,
      },
      viewport: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        viewportWidth: 100,
        viewportHeight: 100,
      },
      cameraAnimation: {
        active: true,
        cachePreviewOnly: false,
        previewHitCount: 1,
        previewMissCount: 0,
      },
      strategy: {
        phase: 'camera',
        interactionActive: false,
        quality: 'full',
        lastInteractionKind: 'none',
        lastInteractionElapsedMs: 10,
      },
      predictor: {
        directionX: 0,
        directionY: 0,
        speedPxPerSec: 0,
        confidence: 0.2,
      },
      budget: {
        pressure: 'low',
        drawSubmitBudgetMs: 1,
        textureUploadBudgetBytes: 1,
        textureUploadTotalBudgetBytes: 2,
        imageTextureUploadMaxCount: 1,
        textTextureUploadMaxCount: 1,
        tilePreloadBudgetMs: 1,
        tilePreloadMaxUploads: 1,
        overlayPassBudgetMs: 1,
      },
      strategySnapshot: {
        lane: 'camera',
        budgetPressure: 'low',
        fallbackReason: 'preview-throttle',
        predictorConfidence: 0.2,
        previewExecutionMode: 'temporal-reprojection-required',
      },
      visibility3dPolicy: {
        executionMode: 'frustum-plus-occlusion',
        hasFrustumResolver: true,
        hasOcclusionResolver: true,
      },
      settleSharpness: {
        pending: false,
        remainingDeadlineMs: 0,
        forceSharpFrame: false,
        metCount: 1,
        missCount: 0,
        lastLatencyMs: 10,
        lastMissLatencyMs: 0,
        highZoomTextSlaCheckedCount: 0,
        highZoomTextSlaViolationCount: 0,
      },
      performanceGate: {
        fpsHealthy: true,
        frameTimeHealthy: true,
        fallbackHealthy: true,
        overBudgetHealthy: true,
        aggregateHealthy: true,
      },
      policy: {
        profile: 'editor',
        preset: 'balanced',
        renderScale: 1,
        pressureScore: 0,
        scalerDecisionReason: 'hold',
      },
      qos: {
        profile: 'editor',
        stablePhase: 'camera',
        pressure: 'low',
        budget: {
          drawSubmitBudgetMs: 1,
          textureUploadBudgetBytes: 1,
          textureUploadTotalBudgetBytes: 2,
          imageTextureUploadMaxCount: 1,
          textTextureUploadMaxCount: 1,
          tilePreloadBudgetMs: 1,
          tilePreloadMaxUploads: 1,
          overlayPassBudgetMs: 1,
        },
        degradationLevel: 'none',
        fallbackReason: null,
        trace: 'trace-2',
        guardTriggers: [],
      },
    },
  ]
}

test('buildEngineBaselineReport returns expected aggregates and snapshots', () => {
  const report = buildEngineBaselineReport(
    {
      scenario: 'fixture',
      timestampIso: '2026-05-16T00:00:00.000Z',
      gitCommit: 'abc123',
      backend: 'webgl',
    },
    createRenderStatsFixtures(),
    createDiagnosticsFixtures(),
  )

  assert.equal(report.summary.frameCount, 2)
  assert.equal(report.summary.interactiveFrameCount, 1)
  assert.equal(report.summary.cameraFrameCount, 1)
  assert.equal(report.summary.staticFrameCount, 0)
  assert.equal(report.summary.fallbackReasonCounts.none, 1)
  assert.equal(report.summary.fallbackReasonCounts['preview-throttle'], 1)
  assert.equal(report.summary.previewExecutionModeCounts['affine-snapshot'], 1)
  assert.equal(report.summary.previewExecutionModeCounts['temporal-reprojection-required'], 1)
  assert.equal(report.summary.visibility3dExecutionModeCounts['fallback-frustum-coarse'], 1)
  assert.equal(report.summary.visibility3dExecutionModeCounts['frustum-plus-occlusion'], 1)
  assert.equal(report.snapshots.length, 2)
  assert.equal(report.snapshots[0]?.phase, 'interactive')
  assert.equal(report.snapshots[1]?.phase, 'camera')
  assert.equal(report.snapshots[0]?.previewExecutionMode, 'affine-snapshot')
  assert.equal(report.snapshots[1]?.previewExecutionMode, 'temporal-reprojection-required')
})
