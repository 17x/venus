// Module responsibility: auto quality scaling decisions based on pressure tiers.
// Non-responsibility: collecting pressure signals or applying renderer side effects.

import type { EnginePressureTier } from '../budget/pressureMonitor.ts'

/**
 * Describes one auto quality scaler state snapshot.
 */
export interface EngineAutoQualityScalerState {
  /** Current render scale before decision. */
  renderScale: number
  /** Timestamp in ms when scale was last adjusted. */
  lastAdjustedAtMs: number
}

/**
 * Describes one auto quality scaler decision output.
 */
export interface EngineAutoQualityScalerDecision {
  /** Next render scale after decision. */
  nextRenderScale: number
  /** True when render scale was changed. */
  changed: boolean
  /** Decision reason for diagnostics. */
  reason: 'pressure-high-shrink' | 'pressure-low-recover' | 'cooldown' | 'hold'
}

/**
 * Describes scaler limits and update cadence.
 */
export interface EngineAutoQualityScalerConfig {
  /** Minimum render scale allowed. */
  minRenderScale: number
  /** Maximum render scale allowed. */
  maxRenderScale: number
  /** Scale adjustment step size. */
  step: number
  /** Cooldown between two adjustments in milliseconds. */
  cooldownMs: number
}

/**
 * Defines canonical scaler defaults.
 */
export const DEFAULT_ENGINE_AUTO_QUALITY_SCALER_CONFIG: EngineAutoQualityScalerConfig = {
  minRenderScale: 0.7,
  maxRenderScale: 1.5,
  step: 0.05,
  cooldownMs: 120,
}

/**
 * Intent: clamp render scale into configured bounds.
 * @param scale Candidate render scale.
 * @param config Scaler config.
 * @returns Clamped render scale.
 */
function clampRenderScale(scale: number, config: EngineAutoQualityScalerConfig): number {
  return Math.max(config.minRenderScale, Math.min(config.maxRenderScale, scale))
}

/**
 * Intent: resolve next render scale from pressure tier and scaler state.
 * @param pressureTier Current pressure tier.
 * @param nowMs Current timestamp in milliseconds.
 * @param state Current scaler state.
 * @param config Scaler config override.
 * @returns Scaler decision payload.
 */
export function resolveEngineAutoQualityScalerDecision(
  pressureTier: EnginePressureTier,
  nowMs: number,
  state: EngineAutoQualityScalerState,
  config: EngineAutoQualityScalerConfig = DEFAULT_ENGINE_AUTO_QUALITY_SCALER_CONFIG,
): EngineAutoQualityScalerDecision {
  const elapsedMs = nowMs - state.lastAdjustedAtMs
  if (elapsedMs < config.cooldownMs) {
    return {
      nextRenderScale: state.renderScale,
      changed: false,
      reason: 'cooldown',
    }
  }

  if (pressureTier === 'high') {
    const shrunk = clampRenderScale(state.renderScale - config.step, config)
    return {
      nextRenderScale: shrunk,
      changed: shrunk !== state.renderScale,
      reason: shrunk !== state.renderScale ? 'pressure-high-shrink' : 'hold',
    }
  }

  if (pressureTier === 'low') {
    const recovered = clampRenderScale(state.renderScale + config.step, config)
    return {
      nextRenderScale: recovered,
      changed: recovered !== state.renderScale,
      reason: recovered !== state.renderScale ? 'pressure-low-recover' : 'hold',
    }
  }

  return {
    nextRenderScale: state.renderScale,
    changed: false,
    reason: 'hold',
  }
}
