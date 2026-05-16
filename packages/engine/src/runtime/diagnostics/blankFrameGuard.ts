// Module responsibility: detect blank-frame and black-frame ratios.
// Non-responsibility: frame capture.

/**
 * Describes frame-quality sample counts.
 */
export interface EngineBlankFrameSample {
  /** Total frame count in sample window. */
  totalFrames: number
  /** Blank frame count in sample window. */
  blankFrames: number
  /** Black frame count in sample window. */
  blackFrames: number
}

/**
 * Intent: resolve blank-frame guard pass/fail under ratio threshold.
 * @param sample Blank-frame sample.
 * @param maxRatio Maximum allowed combined blank+black ratio.
 * @returns True when guard passes.
 */
export function passEngineBlankFrameGuard(
  sample: EngineBlankFrameSample,
  maxRatio: number,
): boolean {
  const total = Math.max(1, sample.totalFrames)
  const ratio = (sample.blankFrames + sample.blackFrames) / total
  return ratio <= Math.max(0, maxRatio)
}
