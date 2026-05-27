import type {RenderParityDiagnosticsSample} from './renderParityChecklist.ts'

/**
 * Declares one threshold bundle for diagnostics-sampled parity evaluation.
 */
export interface RenderParityEvaluationThresholds {
  /** Stores minimum sample count before automatic verdicts can leave unknown state. */
  minSampleCountForAutomaticVerdict: number
  /** Stores maximum allowed aggregated text fallback count before degradation. */
  maxAllowedTextFallbackCount: number
  /** Stores maximum allowed deferred image texture count before degradation. */
  maxAllowedDeferredImageTextureCount: number
  /** Stores maximum allowed deferred text texture count before degradation. */
  maxAllowedDeferredTextTextureCount: number
}

/** Default thresholds used when diagnostics-based evaluation does not override values. */
export const DEFAULT_RENDER_PARITY_EVALUATION_THRESHOLDS: RenderParityEvaluationThresholds = {
  minSampleCountForAutomaticVerdict: 6,
  maxAllowedTextFallbackCount: 0,
  maxAllowedDeferredImageTextureCount: 0,
  maxAllowedDeferredTextTextureCount: 0,
}

const KNOWN_WEBGPU_RECT_BATCH_REJECTION_REASONS = [
  'none',
  'scene-empty',
  'group-node-unsupported',
  'non-shape-node-unsupported',
  'non-rect-shape-unsupported',
  'shape-style-unsupported',
  'shape-transform-unsupported',
] as const

const KNOWN_FEATURE_CAPABILITY_GATE_REASONS = [
  'none',
  'image-node-unsupported',
  'clip-node-unsupported',
  'text-style-unsupported',
  'shadow-style-unsupported',
  'gradient-style-unsupported',
] as const

type KnownWebgpuRectBatchRejectionReason =
  (typeof KNOWN_WEBGPU_RECT_BATCH_REJECTION_REASONS)[number]

type KnownFeatureCapabilityGateReason =
  (typeof KNOWN_FEATURE_CAPABILITY_GATE_REASONS)[number]

/**
 * Declares one structured summary of sampled WebGPU rect-batch rejection reasons.
 */
export interface WebgpuRectBatchRejectionSummary {
  /** Stores total sampled frames with non-`none` known rejection reasons. */
  knownRejectedCount: number
  /** Stores total sampled frames with unknown/non-empty rejection reasons. */
  unknownRejectedCount: number
  /** Stores dominant known rejection reason excluding `none`, if available. */
  dominantKnownReason: Exclude<KnownWebgpuRectBatchRejectionReason, 'none'> | null
}

/**
 * Declares one structured summary of sampled feature capability gate reasons.
 */
export interface FeatureCapabilityGateSummary {
  /** Stores total sampled frames with non-`none` known capability-gate reasons. */
  knownRejectedCount: number
  /** Stores total sampled frames with unknown/non-empty capability-gate reasons. */
  unknownRejectedCount: number
  /** Stores dominant known capability-gate reason excluding `none`, if available. */
  dominantKnownReason: Exclude<KnownFeatureCapabilityGateReason, 'none'> | null
}

/**
 * Resolves structured rejection summary from sampled WebGPU diagnostics tokens.
 * @param samples Diagnostics samples captured from replay/runtime export.
 */
export function createWebgpuRectBatchRejectionSummary(
  samples: readonly RenderParityDiagnosticsSample[],
): WebgpuRectBatchRejectionSummary {
  const knownCounts = new Map<Exclude<KnownWebgpuRectBatchRejectionReason, 'none'>, number>()
  let knownRejectedCount = 0
  let unknownRejectedCount = 0

  for (const sample of samples) {
    const reasonToken = sample.webgpuNativeRectBatchRejectedReason.trim()
    if (reasonToken.length <= 0 || reasonToken === 'none') {
      continue
    }

    if (
      KNOWN_WEBGPU_RECT_BATCH_REJECTION_REASONS.includes(
        reasonToken as KnownWebgpuRectBatchRejectionReason,
      )
    ) {
      knownRejectedCount += 1
      const knownReason = reasonToken as Exclude<KnownWebgpuRectBatchRejectionReason, 'none'>
      knownCounts.set(knownReason, (knownCounts.get(knownReason) ?? 0) + 1)
      continue
    }

    unknownRejectedCount += 1
  }

  let dominantKnownReason: Exclude<KnownWebgpuRectBatchRejectionReason, 'none'> | null = null
  let dominantKnownCount = 0
  for (const [reason, count] of knownCounts) {
    if (count > dominantKnownCount) {
      dominantKnownReason = reason
      dominantKnownCount = count
    }
  }

  return {
    knownRejectedCount,
    unknownRejectedCount,
    dominantKnownReason,
  }
}

/**
 * Resolves structured capability-gate summary from sampled backend feature reason tokens.
 * @param tokens Feature capability gate reason tokens sampled from one backend lane.
 */
export function createFeatureCapabilityGateSummary(
  tokens: readonly string[],
): FeatureCapabilityGateSummary {
  const knownCounts = new Map<Exclude<KnownFeatureCapabilityGateReason, 'none'>, number>()
  let knownRejectedCount = 0
  let unknownRejectedCount = 0

  for (const token of tokens) {
    const reasonToken = typeof token === 'string' ? token.trim() : ''
    if (reasonToken.length <= 0 || reasonToken === 'none') {
      continue
    }

    if (
      KNOWN_FEATURE_CAPABILITY_GATE_REASONS.includes(
        reasonToken as KnownFeatureCapabilityGateReason,
      )
    ) {
      knownRejectedCount += 1
      const knownReason = reasonToken as Exclude<KnownFeatureCapabilityGateReason, 'none'>
      knownCounts.set(knownReason, (knownCounts.get(knownReason) ?? 0) + 1)
      continue
    }

    unknownRejectedCount += 1
  }

  let dominantKnownReason: Exclude<KnownFeatureCapabilityGateReason, 'none'> | null = null
  let dominantKnownCount = 0
  for (const [reason, count] of knownCounts) {
    if (count > dominantKnownCount) {
      dominantKnownReason = reason
      dominantKnownCount = count
    }
  }

  return {
    knownRejectedCount,
    unknownRejectedCount,
    dominantKnownReason,
  }
}
