// Module responsibility: compute unified E/F/G/H phase release bundle verdict.
// Non-responsibility: collecting per-phase evidence.

/**
 * Describes unified phase acceptance input across E/F/G/H.
 */
export interface EnginePhaseReleaseBundleInputV1 {
  /** Whether phase-E acceptance has passed. */
  phaseEAccepted: boolean
  /** Whether phase-F release contracts have passed. */
  phaseFAccepted: boolean
  /** Whether phase-G acceptance has passed. */
  phaseGAccepted: boolean
  /** Whether phase-H acceptance has passed. */
  phaseHAccepted: boolean
}

/**
 * Describes sequential phase readiness verdicts plus final release readiness.
 */
export interface EnginePhaseReleaseBundleResultV1 {
  /** Whether phase-E gate is ready. */
  phaseEReady: boolean
  /** Whether phase-F gate is ready after phase-E. */
  phaseFReady: boolean
  /** Whether phase-G gate is ready after phase-F. */
  phaseGReady: boolean
  /** Whether phase-H gate is ready after phase-G. */
  phaseHReady: boolean
  /** Whether final release readiness gate is satisfied. */
  releaseReady: boolean
}

/**
 * Intent: compute unified phase readiness with strict sequential gating.
 * @param input Unified phase acceptance input.
 * @returns Per-phase readiness verdict and final release readiness.
 */
export function computeEnginePhaseReleaseBundleV1(
  input: EnginePhaseReleaseBundleInputV1,
): EnginePhaseReleaseBundleResultV1 {
  const phaseEReady = input.phaseEAccepted
  const phaseFReady = phaseEReady && input.phaseFAccepted
  const phaseGReady = phaseFReady && input.phaseGAccepted
  const phaseHReady = phaseGReady && input.phaseHAccepted

  return {
    phaseEReady,
    phaseFReady,
    phaseGReady,
    phaseHReady,
    releaseReady: phaseHReady,
  }
}
