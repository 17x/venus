import type {RenderParityDiagnosticsSample} from './renderParityChecklist.ts'

const KNOWN_WEBGL_CACHE_FALLBACK_REASONS = [
  'none',
  'l0-no-snapshot',
  'l0-preview-miss',
  'l0-revision-mismatch',
  'l0-viewport-width-mismatch',
  'l0-viewport-height-mismatch',
  'l0-pixel-ratio-mismatch',
  'l0-invalid-scale-ratio',
  'l0-zoom-only-pan-blocked',
  'l0-scale-step-exceeded',
  'l0-translate-exceeded',
  'l1-bypass-interactive',
  'l1-disabled',
  'l2-tile-seed-upload-failed',
  'l2-tile-partial-region-canvas-crop',
  'l2-tile-framebuffer-copy-fallback-canvas',
  'l2-tile-framebuffer-copy-failed',
  'l2-tile-source-build-failed',
  'l2-bypass-visible-tile-pressure',
  'l2-tile-fallback-to-composite',
  'l3-budget-draw-submit-cap',
  'l3-empty-frame-model-fallback',
] as const

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

type KnownWebglCacheFallbackReason =
  (typeof KNOWN_WEBGL_CACHE_FALLBACK_REASONS)[number]

type KnownWebgpuRectBatchRejectionReason =
  (typeof KNOWN_WEBGPU_RECT_BATCH_REJECTION_REASONS)[number]

type KnownFeatureCapabilityGateReason =
  (typeof KNOWN_FEATURE_CAPABILITY_GATE_REASONS)[number]

/**
 * Declares one compact reason summary bucket used by parity auto-report artifacts.
 */
export interface RenderParityReasonBucketSummary {
  /** Stores total sampled frames with known and non-`none` reason tokens. */
  knownRejectedCount: number
  /** Stores total sampled frames with non-empty but unknown reason tokens. */
  unknownRejectedCount: number
  /** Stores dominant known reason token excluding `none`, if available. */
  dominantKnownReason: string | null
}

/**
 * Declares one cross-backend reason summary used by parity auto-report outputs.
 */
export interface RenderParityReasonSummary {
  /** Stores WebGL cache-fallback reason distribution summary. */
  webglCacheFallback: RenderParityReasonBucketSummary
  /** Stores WebGPU rect-batch rejection reason distribution summary. */
  webgpuRectBatchReject: RenderParityReasonBucketSummary
  /** Stores WebGL feature-capability gate reason distribution summary. */
  webglFeatureCapabilityGate: RenderParityReasonBucketSummary
  /** Stores WebGPU feature-capability gate reason distribution summary. */
  webgpuFeatureCapabilityGate: RenderParityReasonBucketSummary
}

/**
 * Resolves one dominant-reason summary from sampled diagnostics reason tokens.
 * @param tokens Sampled reason tokens.
 * @param knownReasons Canonical known reason tokens including `none`.
 */
function createReasonBucketSummary(
  tokens: readonly string[],
  knownReasons: readonly string[],
): RenderParityReasonBucketSummary {
  const knownReasonSet = new Set(knownReasons)
  const knownCounts = new Map<string, number>()
  let knownRejectedCount = 0
  let unknownRejectedCount = 0

  for (const token of tokens) {
    const normalized = typeof token === 'string' ? token.trim() : ''
    if (normalized.length <= 0 || normalized === 'none') {
      continue
    }

    if (knownReasonSet.has(normalized)) {
      knownRejectedCount += 1
      knownCounts.set(normalized, (knownCounts.get(normalized) ?? 0) + 1)
      continue
    }

    unknownRejectedCount += 1
  }

  let dominantKnownReason: string | null = null
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
 * Builds cross-backend dominant reason summary from sampled parity diagnostics rows.
 * @param samples Sampled parity diagnostics rows.
 */
export function createRenderParityReasonSummary(
  samples: readonly RenderParityDiagnosticsSample[],
): RenderParityReasonSummary {
  const webglTokens = samples.map((sample) => sample.cacheFallbackReason)
  const webgpuTokens = samples.map((sample) => sample.webgpuNativeRectBatchRejectedReason)
  const webglFeatureTokens = samples.map((sample) => sample.webglFeatureCapabilityGateReason)
  const webgpuFeatureTokens = samples.map((sample) => sample.webgpuFeatureCapabilityGateReason)

  return {
    webglCacheFallback: createReasonBucketSummary(
      webglTokens,
      KNOWN_WEBGL_CACHE_FALLBACK_REASONS as readonly KnownWebglCacheFallbackReason[],
    ),
    webgpuRectBatchReject: createReasonBucketSummary(
      webgpuTokens,
      KNOWN_WEBGPU_RECT_BATCH_REJECTION_REASONS as readonly KnownWebgpuRectBatchRejectionReason[],
    ),
    webglFeatureCapabilityGate: createReasonBucketSummary(
      webglFeatureTokens,
      KNOWN_FEATURE_CAPABILITY_GATE_REASONS as readonly KnownFeatureCapabilityGateReason[],
    ),
    webgpuFeatureCapabilityGate: createReasonBucketSummary(
      webgpuFeatureTokens,
      KNOWN_FEATURE_CAPABILITY_GATE_REASONS as readonly KnownFeatureCapabilityGateReason[],
    ),
  }
}
