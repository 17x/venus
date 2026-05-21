import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveCreateEngineResourceDiagnostics,
} from './createEngineResourceDiagnostics.ts'
import type {
  EngineFrameBudget,
  EngineRenderStats,
} from '../../renderer/types/index.ts'

/**
 * Verifies missing render stats produce a zeroed resource diagnostics snapshot.
 */
test('resolveCreateEngineResourceDiagnostics returns zero snapshot without stats', () => {
  const diagnostics = resolveCreateEngineResourceDiagnostics(null, undefined)

  assert.equal(diagnostics.gpuTextureBytes, 0)
  assert.equal(diagnostics.imageTextureBytes, 0)
  assert.equal(diagnostics.textureUploadBytes, 0)
  assert.equal(diagnostics.textureUploadBudgetUtilization, 0)
  assert.equal(diagnostics.streamingLoad, 0)
})

/**
 * Verifies resource diagnostics aggregate upload bytes and normalized pressure.
 */
test('resolveCreateEngineResourceDiagnostics aggregates upload and streaming pressure', () => {
  const stats: EngineRenderStats = {
    drawCount: 1,
    visibleCount: 1,
    culledCount: 0,
    cacheHits: 0,
    cacheMisses: 1,
    frameReuseHits: 0,
    frameReuseMisses: 1,
    frameMs: 1,
    gpuTextureBytes: 300,
    imageTextureBytes: 200,
    webglImageTextureUploadBytes: 70,
    webglTextTextureUploadBytes: 30,
    webglTextureUploadBudgetExceeded: true,
    tileSchedulerPendingCount: 64,
  }
  const frameBudget: EngineFrameBudget = {
    drawSubmitBudgetMs: 1,
    textureUploadBudgetBytes: 50,
    textureUploadTotalBudgetBytes: 200,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 1,
    tilePreloadBudgetMs: 1,
    tilePreloadMaxUploads: 1,
    overlayPassBudgetMs: 1,
  }

  const diagnostics = resolveCreateEngineResourceDiagnostics(stats, frameBudget)

  assert.equal(diagnostics.gpuTextureBytes, 300)
  assert.equal(diagnostics.imageTextureBytes, 200)
  assert.equal(diagnostics.textureUploadBytes, 100)
  assert.equal(diagnostics.textureUploadBudgetBytes, 200)
  assert.equal(diagnostics.textureUploadBudgetUtilization, 0.5)
  assert.equal(diagnostics.textureUploadBudgetExceeded, true)
  assert.equal(diagnostics.tileSchedulerPendingCount, 64)
  assert.equal(diagnostics.streamingLoad, 0.5)
})
