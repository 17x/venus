// Module responsibility: resolve profile-specific qos budget behavior overrides.
// Non-responsibility: frame-phase classification and renderer execution.

import type { EngineFrameBudget } from '../../renderer/types/index.ts'
import type { EngineFrameBudgetPressure } from '../createEngine/frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'
import type { EngineProfileName } from '../../settings/index.ts'

/**
 * Describes profile-specific policy pack output consumed by qos path.
 */
export interface EngineProfilePolicyPack {
  /** Effective runtime profile after hybrid policy adjustment. */
  profile: EngineProfileName
  /** Optional budget override after profile specialization. */
  budget: EngineFrameBudget
  /** Optional guard triggers produced by profile policy. */
  guardTriggers: string[]
}

/**
 * Intent: apply profile-specific budget shaping while preserving hard budget invariants.
 * @param profile Runtime profile requested by settings and policy.
 * @param phase Current strategy phase.
 * @param pressure Current pressure tier.
 * @param budget Baseline budget selected by qos controller.
 * @returns Profile-specialized budget and profile trace metadata.
 */
export function resolveEngineProfilePolicyPack(
  profile: EngineProfileName,
  phase: EngineRenderStrategyPhase,
  pressure: EngineFrameBudgetPressure,
  budget: EngineFrameBudget,
): EngineProfilePolicyPack {
  const guardTriggers: string[] = []

  if (profile === 'editor') {
    guardTriggers.push('editor-interaction-priority')
    return {
      profile,
      budget: {
        ...budget,
        overlayPassBudgetMs: Math.max(1, budget.overlayPassBudgetMs),
        textTextureUploadMaxCount: Math.max(2, budget.textTextureUploadMaxCount),
      },
      guardTriggers,
    }
  }

  if (profile === 'game') {
    guardTriggers.push('game-frame-stability-priority')
    return {
      profile,
      budget: {
        ...budget,
        drawSubmitBudgetMs: Math.max(10, budget.drawSubmitBudgetMs),
        tilePreloadBudgetMs: Math.max(1, budget.tilePreloadBudgetMs - 1),
      },
      guardTriggers,
    }
  }

  if (profile === 'animation') {
    guardTriggers.push('animation-timeline-consistency-priority')
    const keyframePhase = phase === 'settling' || phase === 'static'
    return {
      profile,
      budget: {
        ...budget,
        textureUploadTotalBudgetBytes: keyframePhase
          ? Math.max(budget.textureUploadTotalBudgetBytes, budget.textureUploadBudgetBytes)
          : budget.textureUploadTotalBudgetBytes,
      },
      guardTriggers,
    }
  }

  if (profile === 'medical') {
    guardTriggers.push('medical-critical-layer-priority')
    return {
      profile,
      budget: {
        ...budget,
        drawSubmitBudgetMs: Math.max(20, budget.drawSubmitBudgetMs),
        imageTextureUploadMaxCount: Math.max(2, budget.imageTextureUploadMaxCount),
      },
      guardTriggers,
    }
  }

  if (profile === 'massive-data') {
    guardTriggers.push('massive-data-progressive-visibility-priority')
    const extraTilePreload = pressure === 'high' ? 0 : 2
    return {
      profile,
      budget: {
        ...budget,
        tilePreloadMaxUploads: Math.max(1, budget.tilePreloadMaxUploads + extraTilePreload),
      },
      guardTriggers,
    }
  }

  return {
    profile,
    budget,
    guardTriggers,
  }
}
