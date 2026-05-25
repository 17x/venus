/**
 * Declares one verdict counter payload grouped by status and backend.
 */
export interface RenderParityVerdictSummary {
  /** Stores pass verdict counts for WebGL/WebGPU. */
  pass: {webgl: number; webgpu: number}
  /** Stores degraded verdict counts for WebGL/WebGPU. */
  degraded: {webgl: number; webgpu: number}
  /** Stores fail verdict counts for WebGL/WebGPU. */
  fail: {webgl: number; webgpu: number}
  /** Stores unknown verdict counts for WebGL/WebGPU. */
  unknown: {webgl: number; webgpu: number}
}

/**
 * Declares one reason bucket summary emitted by runtime auto report summary artifacts.
 */
export interface RenderParityReasonBucketSummary {
  /** Stores known and non-`none` rejected count for one backend bucket. */
  knownRejectedCount: number
  /** Stores unknown but non-empty rejected count for one backend bucket. */
  unknownRejectedCount: number
  /** Stores dominant known reason token for one backend bucket. */
  dominantKnownReason: string | null
}

/**
 * Declares one reason summary emitted by runtime auto report summary artifacts.
 */
export interface RenderParityReasonSummary {
  /** Stores WebGL cache fallback reason summary. */
  webglCacheFallback: RenderParityReasonBucketSummary
  /** Stores WebGPU rect-batch rejection reason summary. */
  webgpuRectBatchReject: RenderParityReasonBucketSummary
  /** Stores WebGL feature-capability gate reason summary. */
  webglFeatureCapabilityGate: RenderParityReasonBucketSummary
  /** Stores WebGPU feature-capability gate reason summary. */
  webgpuFeatureCapabilityGate: RenderParityReasonBucketSummary
}

/**
 * Declares one runtime auto summary artifact shape used for diff comparisons.
 */
export interface RenderParityRuntimeSummaryArtifact {
  /** Stores generated timestamp emitted by summary artifact producer. */
  generatedAt: string
  /** Stores sampled frame count used by parity report generation. */
  sampleCount: number
  /** Stores parity verdict summary grouped by status/backend. */
  verdictSummary: RenderParityVerdictSummary
  /** Stores backend reason summaries used for trend comparisons. */
  reasonSummary: RenderParityReasonSummary
}

/**
 * Declares one reason bucket delta section used by summary-diff reports.
 */
export interface RenderParityReasonBucketDiff {
  /** Stores current minus baseline known rejected count. */
  knownRejectedDelta: number
  /** Stores current minus baseline unknown rejected count. */
  unknownRejectedDelta: number
  /** Stores baseline dominant known reason token. */
  baselineDominantKnownReason: string | null
  /** Stores current dominant known reason token. */
  currentDominantKnownReason: string | null
  /** Indicates whether dominant known reason changed between runs. */
  dominantKnownReasonChanged: boolean
  /** Stores interpreted trend signal for this reason bucket. */
  trend: 'improved' | 'regressed' | 'unchanged' | 'mixed'
}

/**
 * Declares one verdict summary delta section used by summary-diff reports.
 */
export interface RenderParityVerdictDiff {
  /** Stores current minus baseline pass-count delta for one backend. */
  passDelta: number
  /** Stores current minus baseline degraded-count delta for one backend. */
  degradedDelta: number
  /** Stores current minus baseline fail-count delta for one backend. */
  failDelta: number
  /** Stores current minus baseline unknown-count delta for one backend. */
  unknownDelta: number
}

/**
 * Declares one cross-run summary diff report emitted by comparison tooling.
 */
export interface RenderParitySummaryDiffReport {
  /** Stores baseline summary artifact metadata used for comparison. */
  baseline: {generatedAt: string; sampleCount: number}
  /** Stores current summary artifact metadata used for comparison. */
  current: {generatedAt: string; sampleCount: number}
  /** Stores per-backend reason bucket delta sections. */
  reasonDiff: {
    webglCacheFallback: RenderParityReasonBucketDiff
    webgpuRectBatchReject: RenderParityReasonBucketDiff
    webglFeatureCapabilityGate: RenderParityReasonBucketDiff
    webgpuFeatureCapabilityGate: RenderParityReasonBucketDiff
  }
  /** Stores per-backend verdict deltas to track row-level parity drift. */
  verdictDiff: {
    webgl: RenderParityVerdictDiff
    webgpu: RenderParityVerdictDiff
  }
  /** Stores one concise aggregate trend signal for quick CI/report reading. */
  overallTrend: 'improved' | 'regressed' | 'unchanged' | 'mixed'
}

/**
 * Resolves one safe reason bucket from possibly legacy summary artifacts.
 * @param bucket Candidate reason bucket from one summary artifact.
 */
function resolveReasonBucket(
  bucket: RenderParityReasonBucketSummary | undefined,
): RenderParityReasonBucketSummary {
  return {
    knownRejectedCount: bucket?.knownRejectedCount ?? 0,
    unknownRejectedCount: bucket?.unknownRejectedCount ?? 0,
    dominantKnownReason: bucket?.dominantKnownReason ?? null,
  }
}

/**
 * Resolves one reason bucket trend classification from baseline/current summaries.
 * @param baseline Baseline reason bucket summary.
 * @param current Current reason bucket summary.
 */
function createReasonBucketDiff(
  baseline: RenderParityReasonBucketSummary,
  current: RenderParityReasonBucketSummary,
): RenderParityReasonBucketDiff {
  const knownRejectedDelta = current.knownRejectedCount - baseline.knownRejectedCount
  const unknownRejectedDelta = current.unknownRejectedCount - baseline.unknownRejectedCount
  const dominantKnownReasonChanged = baseline.dominantKnownReason !== current.dominantKnownReason

  const knownImproved = knownRejectedDelta < 0
  const unknownImproved = unknownRejectedDelta < 0
  const knownRegressed = knownRejectedDelta > 0
  const unknownRegressed = unknownRejectedDelta > 0

  const trend: RenderParityReasonBucketDiff['trend'] =
    knownRegressed || unknownRegressed
      ? (knownImproved || unknownImproved ? 'mixed' : 'regressed')
      : knownImproved || unknownImproved
        ? 'improved'
        : 'unchanged'

  return {
    knownRejectedDelta,
    unknownRejectedDelta,
    baselineDominantKnownReason: baseline.dominantKnownReason,
    currentDominantKnownReason: current.dominantKnownReason,
    dominantKnownReasonChanged,
    trend,
  }
}

/**
 * Resolves one backend verdict delta section from baseline/current verdict payloads.
 * @param baseline Baseline verdict summary payload.
 * @param current Current verdict summary payload.
 * @param backend Backend key used for verdict delta extraction.
 */
function createVerdictDiff(
  baseline: RenderParityVerdictSummary,
  current: RenderParityVerdictSummary,
  backend: 'webgl' | 'webgpu',
): RenderParityVerdictDiff {
  return {
    passDelta: current.pass[backend] - baseline.pass[backend],
    degradedDelta: current.degraded[backend] - baseline.degraded[backend],
    failDelta: current.fail[backend] - baseline.fail[backend],
    unknownDelta: current.unknown[backend] - baseline.unknown[backend],
  }
}

/**
 * Resolves one aggregate trend signal from per-bucket reason trends.
 * @param reasonDiff Reason bucket diff payload.
 */
function createOverallTrend(reasonDiff: {
  webglCacheFallback: RenderParityReasonBucketDiff
  webgpuRectBatchReject: RenderParityReasonBucketDiff
  webglFeatureCapabilityGate: RenderParityReasonBucketDiff
  webgpuFeatureCapabilityGate: RenderParityReasonBucketDiff
}): RenderParitySummaryDiffReport['overallTrend'] {
  const trends = [
    reasonDiff.webglCacheFallback.trend,
    reasonDiff.webgpuRectBatchReject.trend,
    reasonDiff.webglFeatureCapabilityGate.trend,
    reasonDiff.webgpuFeatureCapabilityGate.trend,
  ]
  const hasImproved = trends.includes('improved')
  const hasRegressed = trends.includes('regressed')
  const hasMixed = trends.includes('mixed')

  if (hasMixed || (hasImproved && hasRegressed)) {
    return 'mixed'
  }
  if (hasRegressed) {
    return 'regressed'
  }
  if (hasImproved) {
    return 'improved'
  }
  return 'unchanged'
}

/**
 * Builds one cross-run summary diff report for parity trend and dominant-reason drift tracking.
 * @param baseline Baseline runtime auto summary artifact.
 * @param current Current runtime auto summary artifact.
 */
export function createRenderParitySummaryDiffReport(
  baseline: RenderParityRuntimeSummaryArtifact,
  current: RenderParityRuntimeSummaryArtifact,
): RenderParitySummaryDiffReport {
  const baselineReasonSummary = baseline.reasonSummary as Partial<RenderParityReasonSummary>
  const currentReasonSummary = current.reasonSummary as Partial<RenderParityReasonSummary>
  const reasonDiff = {
    webglCacheFallback: createReasonBucketDiff(
      resolveReasonBucket(baselineReasonSummary.webglCacheFallback),
      resolveReasonBucket(currentReasonSummary.webglCacheFallback),
    ),
    webgpuRectBatchReject: createReasonBucketDiff(
      resolveReasonBucket(baselineReasonSummary.webgpuRectBatchReject),
      resolveReasonBucket(currentReasonSummary.webgpuRectBatchReject),
    ),
    webglFeatureCapabilityGate: createReasonBucketDiff(
      resolveReasonBucket(baselineReasonSummary.webglFeatureCapabilityGate),
      resolveReasonBucket(currentReasonSummary.webglFeatureCapabilityGate),
    ),
    webgpuFeatureCapabilityGate: createReasonBucketDiff(
      resolveReasonBucket(baselineReasonSummary.webgpuFeatureCapabilityGate),
      resolveReasonBucket(currentReasonSummary.webgpuFeatureCapabilityGate),
    ),
  }

  return {
    baseline: {
      generatedAt: baseline.generatedAt,
      sampleCount: baseline.sampleCount,
    },
    current: {
      generatedAt: current.generatedAt,
      sampleCount: current.sampleCount,
    },
    reasonDiff,
    verdictDiff: {
      webgl: createVerdictDiff(baseline.verdictSummary, current.verdictSummary, 'webgl'),
      webgpu: createVerdictDiff(baseline.verdictSummary, current.verdictSummary, 'webgpu'),
    },
    overallTrend: createOverallTrend(reasonDiff),
  }
}
