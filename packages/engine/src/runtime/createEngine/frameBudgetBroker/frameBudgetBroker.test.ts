import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineFrameBudget } from './frameBudgetBroker.ts'

/**
 * Resolve one reusable baseline broker input for deterministic tests.
 */
function createBaseInput() {
  return {
    phase: 'static' as const,
    interactionActive: false,
    sceneNodeCount: 1_000,
    tileQueuePendingCount: 0,
    dirtyRegionCount: 0,
    settleSharpnessPending: false,
    forceSharpFrame: false,
  }
}

test('resolveEngineFrameBudget keeps baseline static budget in low pressure', () => {
  const decision = resolveEngineFrameBudget(createBaseInput())

  // Low-pressure static frames should preserve full default budget slices.
  assert.equal(decision.pressure, 'low')
  assert.equal(decision.budget.drawSubmitBudgetMs, 28)
  assert.equal(decision.budget.textureUploadBudgetBytes, 16 * 1024 * 1024)
  assert.equal(decision.budget.textureUploadTotalBudgetBytes, 24 * 1024 * 1024)
  assert.equal(decision.budget.imageTextureUploadMaxCount, 2)
  assert.equal(decision.budget.textTextureUploadMaxCount, 4)
  assert.equal(decision.budget.tilePreloadBudgetMs, 10)
  assert.equal(decision.budget.tilePreloadMaxUploads, 8)
})

test('resolveEngineFrameBudget contracts pan interaction budget', () => {
  const decision = resolveEngineFrameBudget({
    ...createBaseInput(),
    phase: 'pan',
    interactionActive: true,
  })

  // Pan lane should suppress image uploads and keep lightweight preload slices.
  assert.equal(decision.pressure, 'medium')
  assert.equal(decision.budget.textureUploadBudgetBytes, 0)
  assert.equal(decision.budget.textureUploadTotalBudgetBytes, 0)
  assert.equal(decision.budget.imageTextureUploadMaxCount, 0)
  assert.equal(decision.budget.textTextureUploadMaxCount, 0)
  assert.equal(decision.budget.tilePreloadBudgetMs, 1)
})

test('resolveEngineFrameBudget escalates to high pressure with queue saturation', () => {
  const decision = resolveEngineFrameBudget({
    ...createBaseInput(),
    sceneNodeCount: 20_000,
    tileQueuePendingCount: 400,
    dirtyRegionCount: 24,
  })

  // High-pressure static frames should contract every budget lane.
  assert.equal(decision.pressure, 'high')
  assert.equal(decision.budget.drawSubmitBudgetMs, 24)
  assert.equal(decision.budget.textureUploadBudgetBytes, 8 * 1024 * 1024)
  assert.equal(decision.budget.textureUploadTotalBudgetBytes, 12 * 1024 * 1024)
  assert.equal(decision.budget.imageTextureUploadMaxCount, 1)
  assert.equal(decision.budget.textTextureUploadMaxCount, 2)
  assert.equal(decision.budget.tilePreloadBudgetMs, 6)
  assert.equal(decision.budget.tilePreloadMaxUploads, 4)
})

test('resolveEngineFrameBudget prioritizes settle sharpness recovery when pending', () => {
  const decision = resolveEngineFrameBudget({
    ...createBaseInput(),
    phase: 'settling',
    settleSharpnessPending: true,
  })

  // Settling recovery should temporarily expand draw/upload budgets to help
  // meet stop-to-sharp contract before fallback pressure contraction.
  assert.equal(decision.pressure, 'low')
  assert.equal(decision.budget.drawSubmitBudgetMs, 32)
  assert.equal(decision.budget.textureUploadBudgetBytes, 24 * 1024 * 1024)
  assert.equal(decision.budget.textureUploadTotalBudgetBytes, 32 * 1024 * 1024)
  assert.equal(decision.budget.imageTextureUploadMaxCount, 4)
  assert.equal(decision.budget.textTextureUploadMaxCount, 6)
})

test('resolveEngineFrameBudget forceSharpFrame overrides pressure heuristics', () => {
  const decision = resolveEngineFrameBudget({
    ...createBaseInput(),
    phase: 'pan',
    interactionActive: true,
    sceneNodeCount: 30_000,
    tileQueuePendingCount: 500,
    forceSharpFrame: true,
  })

  // Force-sharp mode should bypass interaction/high-pressure contractions.
  assert.equal(decision.pressure, 'low')
  assert.equal(decision.budget.drawSubmitBudgetMs, 32)
  assert.equal(decision.budget.textureUploadBudgetBytes, 24 * 1024 * 1024)
  assert.equal(decision.budget.textureUploadTotalBudgetBytes, 32 * 1024 * 1024)
  assert.equal(decision.budget.tilePreloadMaxUploads, 2)
})
