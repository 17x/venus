// Module responsibility: summarize qos replay frames into one deterministic report.
// Non-responsibility: running scene replay execution loops.

import type { EngineFrameBudgetPressure } from '../createEngine/frameBudgetBroker/frameBudgetBroker.ts'
import type { EngineRenderStrategyPhase } from '../createEngine/strategy/strategy.ts'

/**
 * Describes one qos replay frame sample.
 */
export interface EngineQosReplayFrameSample {
  /** Phase selected for this replay frame. */
  phase: EngineRenderStrategyPhase
  /** Pressure selected for this replay frame. */
  pressure: EngineFrameBudgetPressure
  /** Degradation level selected for this replay frame. */
  degradationLevel: string
}

/**
 * Describes one qos end-to-end summary report.
 */
export interface EngineQosE2EReport {
  /** Total sample count included in report. */
  sampleCount: number
  /** Histogram of phase occurrences by phase name. */
  phaseHistogram: Record<string, number>
  /** Histogram of pressure occurrences by tier. */
  pressureHistogram: Record<string, number>
  /** Histogram of degradation level occurrences. */
  degradationHistogram: Record<string, number>
}

/**
 * Intent: aggregate replay frame sequence into one qos report payload.
 * @param samples Replay frame sample sequence.
 * @returns Aggregated qos e2e report.
 */
export function resolveEngineQosE2EReport(samples: readonly EngineQosReplayFrameSample[]): EngineQosE2EReport {
  const phaseHistogram: Record<string, number> = {}
  const pressureHistogram: Record<string, number> = {}
  const degradationHistogram: Record<string, number> = {}

  for (const sample of samples) {
    phaseHistogram[sample.phase] = (phaseHistogram[sample.phase] ?? 0) + 1
    pressureHistogram[sample.pressure] = (pressureHistogram[sample.pressure] ?? 0) + 1
    degradationHistogram[sample.degradationLevel] = (degradationHistogram[sample.degradationLevel] ?? 0) + 1
  }

  return {
    sampleCount: samples.length,
    phaseHistogram,
    pressureHistogram,
    degradationHistogram,
  }
}
