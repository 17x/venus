import type { EngineRenderStats } from '../../renderer/types/index.ts'
import type { EngineFrameBudgetPressure } from './frameBudgetBroker/frameBudgetBroker.ts'
import type { EnginePressureSignals } from '../budget/pressureMonitor.ts'

/**
 * Resolves normalized pressure signals from scene and render stats snapshots.
 * @param sceneNodeCount Current scene node count.
 * @param stats Latest render stats snapshot.
 * @returns Normalized pressure signal payload.
 */
export function resolvePolicyPressureSignals(
  sceneNodeCount: number,
  stats: EngineRenderStats | null,
): EnginePressureSignals {
  const frameMs = stats?.frameMs ?? 0
  const gpuTextureBytes = stats?.gpuTextureBytes ?? 0
  const tilePending = stats?.tileSchedulerPendingCount ?? 0

  return {
    cpuLoad: Math.min(1, frameMs / 16),
    gpuLoad: Math.min(1, (stats?.drawCount ?? 0) / 2000),
    memoryLoad: Math.min(1, gpuTextureBytes / 300_000_000),
    visibilityLoad: Math.min(1, sceneNodeCount / 300_000),
    streamingLoad: Math.min(1, tilePending / 128),
  }
}

/**
 * Resolves the higher-severity pressure tier between two candidates.
 * @param left First pressure tier.
 * @param right Second pressure tier.
 * @returns Higher-severity pressure tier.
 */
export function resolveHigherPressureTier(
  left: EngineFrameBudgetPressure,
  right: EngineFrameBudgetPressure,
): EngineFrameBudgetPressure {
  const rankByTier: Record<EngineFrameBudgetPressure, number> = {
    low: 0,
    medium: 1,
    high: 2,
  }

  return rankByTier[left] >= rankByTier[right] ? left : right
}

/**
 * Resolves exact-hit candidate budget from pressure and interaction state.
 * @param options Budget-resolution input.
 * @param options.budgetPressure Current frame budget pressure tier.
 * @param options.interactionActive Whether interaction is currently active.
 * @returns Exact-check candidate budget for hit testing.
 */
export function resolveAdaptiveHitTestExactBudget(options: {
  budgetPressure: EngineFrameBudgetPressure
  interactionActive: boolean
}) {
  const HIGH_PRESSURE_INTERACTION_EXACT_BUDGET = 12
  const HIGH_PRESSURE_IDLE_EXACT_BUDGET = 16
  const MEDIUM_PRESSURE_INTERACTION_EXACT_BUDGET = 20
  const MEDIUM_PRESSURE_IDLE_EXACT_BUDGET = 28
  const LOW_PRESSURE_INTERACTION_EXACT_BUDGET = 36
  const LOW_PRESSURE_IDLE_EXACT_BUDGET = 48

  if (options.budgetPressure === 'high') {
    return options.interactionActive ? HIGH_PRESSURE_INTERACTION_EXACT_BUDGET : HIGH_PRESSURE_IDLE_EXACT_BUDGET
  }

  if (options.budgetPressure === 'medium') {
    return options.interactionActive ? MEDIUM_PRESSURE_INTERACTION_EXACT_BUDGET : MEDIUM_PRESSURE_IDLE_EXACT_BUDGET
  }

  return options.interactionActive ? LOW_PRESSURE_INTERACTION_EXACT_BUDGET : LOW_PRESSURE_IDLE_EXACT_BUDGET
}