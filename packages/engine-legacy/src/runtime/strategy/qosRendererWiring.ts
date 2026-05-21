// Module responsibility: apply qos decisions into renderer frame-budget context.
// Non-responsibility: choosing qos decisions.

import type { EngineFrameBudget } from '../../renderer/types/index.ts'
import type { EngineQosControllerDecision } from './qosController.ts'

/**
 * Intent: merge existing frame budget with qos decision budget envelope.
 * @param currentBudget Existing frame budget.
 * @param qosDecision Qos decision payload.
 * @returns Budget after qos wiring merge.
 */
export function applyEngineQosBudgetToRendererContext(
  currentBudget: EngineFrameBudget,
  qosDecision: EngineQosControllerDecision,
): EngineFrameBudget {
  return {
    ...currentBudget,
    drawSubmitBudgetMs: Math.min(currentBudget.drawSubmitBudgetMs, qosDecision.budget.drawSubmitBudgetMs),
    textureUploadBudgetBytes: Math.min(currentBudget.textureUploadBudgetBytes, qosDecision.budget.textureUploadBudgetBytes),
    textureUploadTotalBudgetBytes: Math.min(
      currentBudget.textureUploadTotalBudgetBytes,
      qosDecision.budget.textureUploadTotalBudgetBytes,
    ),
    imageTextureUploadMaxCount: Math.min(currentBudget.imageTextureUploadMaxCount, qosDecision.budget.imageTextureUploadMaxCount),
    textTextureUploadMaxCount: Math.min(currentBudget.textTextureUploadMaxCount, qosDecision.budget.textTextureUploadMaxCount),
    tilePreloadBudgetMs: Math.min(currentBudget.tilePreloadBudgetMs, qosDecision.budget.tilePreloadBudgetMs),
    tilePreloadMaxUploads: Math.min(currentBudget.tilePreloadMaxUploads, qosDecision.budget.tilePreloadMaxUploads),
    overlayPassBudgetMs: Math.min(currentBudget.overlayPassBudgetMs, qosDecision.budget.overlayPassBudgetMs),
  }
}
