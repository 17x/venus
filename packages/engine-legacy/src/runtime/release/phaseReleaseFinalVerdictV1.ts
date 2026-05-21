// Module responsibility: compute final phase-based release verdict from E/F/G/H gates and blocker status.
// Non-responsibility: evidence collection for individual gates.

import type { EnginePhaseReleaseBundleInputV1, EnginePhaseReleaseBundleResultV1 } from './phaseReleaseBundleV1.ts'
import { computeEnginePhaseReleaseBundleV1 } from './phaseReleaseBundleV1.ts'
import type { EnginePhaseHAcceptanceInput } from './phaseHAcceptance.ts'
import { computeEnginePhaseHAcceptance } from './phaseHAcceptance.ts'

/**
 * Describes single-entry input for final phase release verdict.
 */
export interface EnginePhaseReleaseFinalVerdictInputV1 {
  /** E/F/G/H acceptance flags used by bundle gate. */
  phaseBundleInput: EnginePhaseReleaseBundleInputV1
  /** Blocker count used by phase-H acceptance contract. */
  blockerCount: number
}

/**
 * Describes final phase release verdict with intermediate contracts for auditing.
 */
export interface EnginePhaseReleaseFinalVerdictResultV1 {
  /** Sequential E/F/G/H bundle gate result. */
  phaseBundle: EnginePhaseReleaseBundleResultV1
  /** Phase-H acceptance input derived from bundle verdict and blockers. */
  phaseHAcceptanceInput: EnginePhaseHAcceptanceInput
  /** Final release acceptance verdict. */
  releaseAccepted: boolean
}

/**
 * Intent: resolve phase-H acceptance input from phase bundle and blocker count.
 * @param phaseBundle Sequential E/F/G/H bundle verdict.
 * @param blockerCount Blocker count used by phase-H contract.
 * @returns Normalized phase-H acceptance input payload.
 */
function resolveEnginePhaseHAcceptanceInputFromBundle(
  phaseBundle: EnginePhaseReleaseBundleResultV1,
  blockerCount: number,
): EnginePhaseHAcceptanceInput {
  return {
    blockerCount,
    mandatoryGatesPassed: phaseBundle.releaseReady,
  }
}

/**
 * Intent: compute final release verdict from phase bundle and blocker status.
 * @param input Single-entry final release verdict input.
 * @returns Final verdict with bundle and phase-H acceptance artifacts.
 */
export function computeEnginePhaseReleaseFinalVerdictV1(
  input: EnginePhaseReleaseFinalVerdictInputV1,
): EnginePhaseReleaseFinalVerdictResultV1 {
  const phaseBundle = computeEnginePhaseReleaseBundleV1(input.phaseBundleInput)
  const phaseHAcceptanceInput = resolveEnginePhaseHAcceptanceInputFromBundle(phaseBundle, input.blockerCount)

  return {
    phaseBundle,
    phaseHAcceptanceInput,
    releaseAccepted: computeEnginePhaseHAcceptance(phaseHAcceptanceInput),
  }
}
