// Module responsibility: phase-oriented budget template definitions.
// Non-responsibility: pressure detection or final qos combination.

import type { EngineFrameBudget } from '../../renderer/types/index.ts'

/**
 * Describes budget templates grouped by runtime phase names.
 */
export interface EnginePhaseBudgetProfiles {
  /** Interactive phase budget profile. */
  interactive: EngineFrameBudget
  /** Settling phase budget profile. */
  settling: EngineFrameBudget
  /** Static phase budget profile. */
  static: EngineFrameBudget
  /** Camera phase budget profile. */
  camera: EngineFrameBudget
}

/**
 * Defines canonical phase budget templates for qos controller.
 */
export const DEFAULT_ENGINE_PHASE_BUDGET_PROFILES: EnginePhaseBudgetProfiles = {
  interactive: {
    drawSubmitBudgetMs: 14,
    textureUploadBudgetBytes: 2_000_000,
    textureUploadTotalBudgetBytes: 4_000_000,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 2,
    tilePreloadBudgetMs: 4,
    tilePreloadMaxUploads: 4,
    overlayPassBudgetMs: 1,
  },
  settling: {
    drawSubmitBudgetMs: 24,
    textureUploadBudgetBytes: 16_000_000,
    textureUploadTotalBudgetBytes: 24_000_000,
    imageTextureUploadMaxCount: 4,
    textTextureUploadMaxCount: 6,
    tilePreloadBudgetMs: 4,
    tilePreloadMaxUploads: 2,
    overlayPassBudgetMs: 2,
  },
  static: {
    drawSubmitBudgetMs: 28,
    textureUploadBudgetBytes: 16_000_000,
    textureUploadTotalBudgetBytes: 24_000_000,
    imageTextureUploadMaxCount: 2,
    textTextureUploadMaxCount: 4,
    tilePreloadBudgetMs: 8,
    tilePreloadMaxUploads: 8,
    overlayPassBudgetMs: 2,
  },
  camera: {
    drawSubmitBudgetMs: 12,
    textureUploadBudgetBytes: 2_000_000,
    textureUploadTotalBudgetBytes: 4_000_000,
    imageTextureUploadMaxCount: 1,
    textTextureUploadMaxCount: 1,
    tilePreloadBudgetMs: 5,
    tilePreloadMaxUploads: 5,
    overlayPassBudgetMs: 1,
  },
}
