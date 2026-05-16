// Module responsibility: normalize qos diagnostics panel payload.
// Non-responsibility: deciding qos policy or mutating renderer state.

import type { EngineFrameBudget } from '../../renderer/types/index.ts'
import type { EngineRenderFallbackReason } from '../../renderer/fallbackTaxonomy/index.ts'
import type { EngineFrameBudgetPressure } from '../createEngine/frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'
import type { EngineProfileName } from '../../settings/index.ts'

/**
 * Describes one qos diagnostics panel snapshot for runtime introspection.
 */
export interface EngineQosDiagnosticsPanel {
  /** Effective runtime profile used by qos for current frame. */
  profile: EngineProfileName
  /** Stable strategy phase used by qos controller input. */
  phase: EngineRenderStrategyPhase
  /** Effective pressure tier used by qos controller input. */
  pressure: EngineFrameBudgetPressure
  /** Effective budget applied to renderer in current frame. */
  budget: EngineFrameBudget
  /** Degradation level selected by degradation ladder. */
  degradationLevel: string
  /** Fallback reason captured from renderer stats snapshot. */
  fallbackReason: EngineRenderFallbackReason | null
  /** Hard-guard and profile policy triggers for current frame. */
  guardTriggers: string[]
  /** Controller trace id for diagnostics joins and replay. */
  trace: string
}

/**
 * Intent: build one deterministic qos diagnostics panel payload.
 * @param panel Partial panel payload from runtime frame context.
 * @returns Normalized diagnostics panel payload.
 */
export function resolveEngineQosDiagnosticsPanel(panel: EngineQosDiagnosticsPanel): EngineQosDiagnosticsPanel {
  return {
    ...panel,
    guardTriggers: [...panel.guardTriggers],
    fallbackReason: panel.fallbackReason ?? null,
  }
}
