/**
 * Declares stable parity status labels used by render feature checklist rows.
 */
export type RenderParityStatus = 'pass' | 'degraded' | 'fail' | 'unknown'

/**
 * Declares one backend parity status with deterministic reason and evidence probe ids.
 */
export interface RenderParityBackendStatus {
  /** Stores parity verdict for one backend under one feature row. */
  status: RenderParityStatus
  /** Stores concise reason used by checklist triage and follow-up task mapping. */
  reason: string
  /** Stores diagnostics field names that can validate this verdict at runtime. */
  evidenceSignals: string[]
}

/**
 * Declares one feature-level parity checklist row.
 */
export interface RenderParityChecklistRow {
  /** Stores stable row identifier for report diffing. */
  id: string
  /** Stores human-readable feature label. */
  feature: string
  /** Stores WebGL parity status with rationale and evidence probes. */
  webgl: RenderParityBackendStatus
  /** Stores WebGPU parity status with rationale and evidence probes. */
  webgpu: RenderParityBackendStatus
  /** Stores compact category so roadmap tasks can batch rows by remediation lane. */
  category:
    | 'geometry'
    | 'paint-effect'
    | 'text-image'
    | 'fallback-classification'
    | 'diagnostics'
}

/**
 * Declares one parity checklist report payload.
 */
export interface RenderParityChecklistReport {
  /** Stores report schema version for deterministic tooling migration. */
  schemaVersion: number
  /** Stores generated-at timestamp in ISO format. */
  generatedAt: string
  /** Stores all feature-level parity rows in stable order. */
  rows: RenderParityChecklistRow[]
  /** Stores aggregated row counts by status for quick progress tracking. */
  summary: {
    /** Stores pass-row count per backend. */
    pass: {webgl: number; webgpu: number}
    /** Stores degraded-row count per backend. */
    degraded: {webgl: number; webgpu: number}
    /** Stores fail-row count per backend. */
    fail: {webgl: number; webgpu: number}
    /** Stores unknown-row count per backend. */
    unknown: {webgl: number; webgpu: number}
  }
}

/**
 * Declares one diagnostics sample consumed by parity checklist automatic evaluation.
 */
export interface RenderParityDiagnosticsSample {
  /** Stores backend-classified WebGL render route for this frame. */
  webglRenderPath: 'model-complete' | 'packet' | 'none'
  /** Stores backend-classified WebGPU render route for this frame. */
  webgpuRenderPath: 'hybrid-webgl' | 'native-clear-only' | 'native-rect-batch' | 'native-model-complete'
  /** Stores fallback taxonomy token emitted by runtime diagnostics. */
  cacheFallbackReason: string
  /** Stores interactive text fallback count for this diagnostics frame. */
  webglInteractiveTextFallbackCount: number
  /** Stores deferred text texture count for this diagnostics frame. */
  webglDeferredTextTextureCount: number
  /** Stores deferred image texture count for this diagnostics frame. */
  webglDeferredImageTextureCount: number
  /** Stores image texture upload count for this diagnostics frame. */
  webglImageTextureUploadCount: number
  /** Stores WebGL budget pressure tier for this diagnostics frame. */
  webglBudgetPressure: 'low' | 'medium' | 'high'
  /** Stores WebGPU rect-batch reject reason for this diagnostics frame. */
  webgpuNativeRectBatchRejectedReason: string
  /** Stores WebGL feature capability gate reason for this diagnostics frame. */
  webglFeatureCapabilityGateReason: string
  /** Stores WebGPU feature capability gate reason for this diagnostics frame. */
  webgpuFeatureCapabilityGateReason: string
  /** Stores WebGPU native submit attempt count for this diagnostics frame. */
  webgpuNativeSubmissionAttemptedCount: number
}

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

/**
 * Declares one diagnostics-driven evaluation input payload.
 */
export interface CreateRenderParityChecklistFromDiagnosticsInput {
  /** Stores diagnostics sample series captured from replay runs. */
  samples: readonly RenderParityDiagnosticsSample[]
  /** Stores optional threshold overrides for automatic parity verdicting. */
  thresholds?: Partial<RenderParityEvaluationThresholds>
}

const DEFAULT_RENDER_PARITY_EVALUATION_THRESHOLDS: RenderParityEvaluationThresholds = {
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
interface WebgpuRectBatchRejectionSummary {
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
interface FeatureCapabilityGateSummary {
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
function createWebgpuRectBatchRejectionSummary(
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
function createFeatureCapabilityGateSummary(
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

/**
 * Builds one deterministic render parity checklist baseline report.
 */
export function createRenderParityChecklistReport(): RenderParityChecklistReport {
  const rows: RenderParityChecklistRow[] = [
    {
      id: 'line-path-polygon-bezier-parity',
      feature: 'Line/Path/Polygon/Bezier parity',
      category: 'geometry',
      webgl: {
        status: 'degraded',
        reason: 'WebGL packet fallback path can bypass model-complete geometry fidelity in interactive frames.',
        evidenceSignals: ['webglRenderPath', 'cacheFallbackReason'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'Current native WebGPU path is rect-batch oriented and falls back for non-rect/vector geometry.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason'],
      },
    },
    {
      id: 'text-run-rich-typography-parity',
      feature: 'Text run and rich typography parity',
      category: 'text-image',
      webgl: {
        status: 'degraded',
        reason: 'Interactive text fallback/deferred uploads indicate non-uniform text path quality under pressure.',
        evidenceSignals: ['webglInteractiveTextFallbackCount', 'webglDeferredTextTextureCount'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'WebGPU native path still leans on hybrid fallback for full text semantics.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
      },
    },
    {
      id: 'gradient-shadow-filter-parity',
      feature: 'Gradient/Shadow/Filter parity',
      category: 'paint-effect',
      webgl: {
        status: 'degraded',
        reason: 'Model-complete features can be lost when packet fallback is selected during pressure.',
        evidenceSignals: ['webglRenderPath', 'webglBudgetPressure', 'cacheFallbackReason', 'webglFeatureCapabilityGateReason'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'Native rect-batch path rejects style-heavy shapes and relies on fallback pipelines.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
      },
    },
    {
      id: 'image-clip-mask-parity',
      feature: 'Image clip and mask parity',
      category: 'text-image',
      webgl: {
        status: 'degraded',
        reason: 'Image upload budgeting and deferred texture counters indicate quality trade-offs under load.',
        evidenceSignals: ['webglImageTextureUploadCount', 'webglDeferredImageTextureCount', 'webglFeatureCapabilityGateReason'],
      },
      webgpu: {
        status: 'degraded',
        reason: 'WebGPU route often resolves to hybrid-webgl for non-rect compositing requirements.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuFeatureCapabilityGateReason'],
      },
    },
    {
      id: 'model-complete-failure-fallback-classification',
      feature: 'Model-complete failure fallback classification',
      category: 'fallback-classification',
      webgl: {
        status: 'pass',
        reason: 'Fallback is explicitly classified via webglRenderPath and cacheFallbackReason taxonomy.',
        evidenceSignals: ['webglRenderPath', 'cacheFallbackReason'],
      },
      webgpu: {
        status: 'pass',
        reason: 'Fallback outcome is explicitly classified via webgpuRenderPath and rect-batch reject reason.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason'],
      },
    },
    {
      id: 'cross-backend-parity-diagnostics-coverage',
      feature: 'Cross-backend parity diagnostics coverage',
      category: 'diagnostics',
      webgl: {
        status: 'pass',
        reason: 'Runtime diagnostics already publish backend path, pressure, and fallback taxonomy signals.',
        evidenceSignals: ['webglRenderPath', 'webglBudgetPressure', 'cacheFallbackReason'],
      },
      webgpu: {
        status: 'pass',
        reason: 'Runtime diagnostics already publish native submission and render-path classification signals.',
        evidenceSignals: ['webgpuRenderPath', 'webgpuNativeSubmissionAttemptedCount'],
      },
    },
  ]

  const summary = createRenderParitySummary(rows)

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    rows,
    summary,
  }
}

/**
 * Builds one render parity checklist report from diagnostics replay samples.
 * @param input Diagnostics sample payload and optional threshold overrides.
 */
export function createRenderParityChecklistReportFromDiagnostics(
  input: CreateRenderParityChecklistFromDiagnosticsInput,
): RenderParityChecklistReport {
  const thresholds: RenderParityEvaluationThresholds = {
    ...DEFAULT_RENDER_PARITY_EVALUATION_THRESHOLDS,
    ...(input.thresholds ?? {}),
  }

  if (input.samples.length < thresholds.minSampleCountForAutomaticVerdict) {
    const baseline = createRenderParityChecklistReport()
    const unknownRows = baseline.rows.map((row) => ({
      ...row,
      webgl: {
        ...row.webgl,
        status: 'unknown' as RenderParityStatus,
        reason:
          `Insufficient diagnostics samples (${input.samples.length}/${thresholds.minSampleCountForAutomaticVerdict}).`,
      },
      webgpu: {
        ...row.webgpu,
        status: 'unknown' as RenderParityStatus,
        reason:
          `Insufficient diagnostics samples (${input.samples.length}/${thresholds.minSampleCountForAutomaticVerdict}).`,
      },
    }))

    return {
      schemaVersion: baseline.schemaVersion,
      generatedAt: new Date().toISOString(),
      rows: unknownRows,
      summary: createRenderParitySummary(unknownRows),
    }
  }

  const totalTextFallbackCount = input.samples.reduce((sum, sample) => (
    sum + Math.max(0, sample.webglInteractiveTextFallbackCount)
  ), 0)
  const maxDeferredImageTextureCount = input.samples.reduce((currentMax, sample) => (
    Math.max(currentMax, Math.max(0, sample.webglDeferredImageTextureCount))
  ), 0)
  const maxDeferredTextTextureCount = input.samples.reduce((currentMax, sample) => (
    Math.max(currentMax, Math.max(0, sample.webglDeferredTextTextureCount))
  ), 0)
  const maxImageTextureUploadCount = input.samples.reduce((currentMax, sample) => (
    Math.max(currentMax, Math.max(0, sample.webglImageTextureUploadCount))
  ), 0)
  const hasWebglModelComplete = input.samples.some((sample) => sample.webglRenderPath === 'model-complete')
  const hasWebglPacket = input.samples.some((sample) => sample.webglRenderPath === 'packet')
  const hasWebglNoneOnly = input.samples.every((sample) => sample.webglRenderPath === 'none')
  const hasWebglHighPressure = input.samples.some((sample) => sample.webglBudgetPressure === 'high')
  const hasWebgpuNativeModelComplete = input.samples.some((sample) => sample.webgpuRenderPath === 'native-model-complete')
  const hasWebgpuHybridFallback = input.samples.some((sample) => sample.webgpuRenderPath === 'hybrid-webgl')
  const hasWebgpuNativePath = input.samples.some((sample) => (
    sample.webgpuRenderPath === 'native-model-complete' ||
    sample.webgpuRenderPath === 'native-rect-batch' ||
    sample.webgpuRenderPath === 'native-clear-only'
  ))
  const webgpuRectBatchRejectionSummary = createWebgpuRectBatchRejectionSummary(input.samples)
  const webglFeatureCapabilityGateSummary = createFeatureCapabilityGateSummary(
    input.samples.map((sample) => sample.webglFeatureCapabilityGateReason),
  )
  const webgpuFeatureCapabilityGateSummary = createFeatureCapabilityGateSummary(
    input.samples.map((sample) => sample.webgpuFeatureCapabilityGateReason),
  )

  const rows: RenderParityChecklistRow[] = [
    {
      id: 'line-path-polygon-bezier-parity',
      feature: 'Line/Path/Polygon/Bezier parity',
      category: 'geometry',
      webgl: hasWebglNoneOnly
        ? {
            status: 'fail',
            reason: 'All sampled WebGL frames resolved to none, geometry path is not being executed.',
            evidenceSignals: ['webglRenderPath'],
          }
        : hasWebglModelComplete && !hasWebglPacket
          ? {
              status: 'pass',
              reason: 'Sampled WebGL frames remained model-complete without packet fallback.',
              evidenceSignals: ['webglRenderPath'],
            }
          : {
              status: 'degraded',
              reason: 'Sampled WebGL frames include packet fallback during geometry workloads.',
              evidenceSignals: ['webglRenderPath', 'cacheFallbackReason'],
            },
      webgpu: hasWebgpuNativeModelComplete
        ? {
            status: 'pass',
            reason: 'Sampled WebGPU frames include native model-complete route.',
            evidenceSignals: ['webgpuRenderPath'],
          }
        : hasWebgpuNativePath
          ? {
              status: 'degraded',
              reason: webgpuRectBatchRejectionSummary.dominantKnownReason
                ? `Sampled WebGPU frames stay on native partial routes; dominant rect-batch reject reason: ${webgpuRectBatchRejectionSummary.dominantKnownReason}.`
                : 'Sampled WebGPU frames stay on native partial routes without model-complete parity.',
              evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason'],
            }
          : {
              status: 'fail',
              reason: 'Sampled WebGPU frames never reached native routes (hybrid fallback only).',
              evidenceSignals: ['webgpuRenderPath'],
            },
    },
    {
      id: 'text-run-rich-typography-parity',
      feature: 'Text run and rich typography parity',
      category: 'text-image',
      webgl: totalTextFallbackCount <= thresholds.maxAllowedTextFallbackCount &&
        maxDeferredTextTextureCount <= thresholds.maxAllowedDeferredTextTextureCount
        ? {
            status: 'pass',
            reason: 'Text fallback/deferred texture counters stayed within configured thresholds.',
            evidenceSignals: ['webglInteractiveTextFallbackCount', 'webglDeferredTextTextureCount'],
          }
        : {
            status: 'degraded',
            reason: 'Text fallback/deferred texture counters exceeded configured thresholds.',
            evidenceSignals: ['webglInteractiveTextFallbackCount', 'webglDeferredTextTextureCount'],
          },
      webgpu: hasWebgpuNativeModelComplete
        ? {
            status: 'pass',
            reason: 'WebGPU native model-complete route observed for sampled typography workload.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuFeatureCapabilityGateReason'],
          }
        : {
            status: 'degraded',
            reason: webgpuFeatureCapabilityGateSummary.dominantKnownReason
              ? `Sampled typography workload did not reach WebGPU native model-complete parity (dominant feature gate: ${webgpuFeatureCapabilityGateSummary.dominantKnownReason}; known=${webgpuFeatureCapabilityGateSummary.knownRejectedCount}; unknown=${webgpuFeatureCapabilityGateSummary.unknownRejectedCount}).`
              : 'Sampled typography workload did not reach WebGPU native model-complete parity.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
          },
    },
    {
      id: 'gradient-shadow-filter-parity',
      feature: 'Gradient/Shadow/Filter parity',
      category: 'paint-effect',
      webgl: hasWebglModelComplete && !hasWebglPacket && !hasWebglHighPressure
        ? {
            status: 'pass',
            reason: 'Paint-effect frames stayed model-complete without pressure-driven fallback.',
            evidenceSignals: ['webglRenderPath', 'webglBudgetPressure', 'webglFeatureCapabilityGateReason'],
          }
        : {
            status: 'degraded',
            reason: webglFeatureCapabilityGateSummary.dominantKnownReason
              ? `Paint-effect frames show packet fallback or high-pressure conditions (dominant feature gate: ${webglFeatureCapabilityGateSummary.dominantKnownReason}).`
              : 'Paint-effect frames show packet fallback or high-pressure conditions.',
            evidenceSignals: ['webglRenderPath', 'webglBudgetPressure', 'cacheFallbackReason', 'webglFeatureCapabilityGateReason'],
          },
      webgpu: hasWebgpuNativeModelComplete
        ? {
            status: 'pass',
            reason: 'WebGPU native model-complete route observed for paint-effect workload.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuFeatureCapabilityGateReason'],
          }
        : {
            status: 'degraded',
            reason: webgpuFeatureCapabilityGateSummary.dominantKnownReason
              ? `Paint-effect workload remained on fallback or partial native WebGPU routes (dominant feature gate: ${webgpuFeatureCapabilityGateSummary.dominantKnownReason}).`
              : 'Paint-effect workload remained on fallback or partial native WebGPU routes.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
          },
    },
    {
      id: 'image-clip-mask-parity',
      feature: 'Image clip and mask parity',
      category: 'text-image',
      webgl: maxDeferredImageTextureCount <= thresholds.maxAllowedDeferredImageTextureCount &&
        maxImageTextureUploadCount > 0
        ? {
            status: 'pass',
            reason: 'Image uploads occurred without deferred texture backlog beyond threshold.',
            evidenceSignals: ['webglImageTextureUploadCount', 'webglDeferredImageTextureCount', 'webglFeatureCapabilityGateReason'],
          }
        : {
            status: 'degraded',
            reason: webglFeatureCapabilityGateSummary.dominantKnownReason
              ? `Image upload/deferred texture counters indicate clip/mask pressure degradation (dominant feature gate: ${webglFeatureCapabilityGateSummary.dominantKnownReason}).`
              : 'Image upload/deferred texture counters indicate clip/mask pressure degradation.',
            evidenceSignals: ['webglImageTextureUploadCount', 'webglDeferredImageTextureCount', 'webglFeatureCapabilityGateReason'],
          },
      webgpu: hasWebgpuNativeModelComplete
        ? {
            status: 'pass',
            reason: 'Sampled image clip workload reached native model-complete WebGPU route.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuFeatureCapabilityGateReason'],
          }
        : {
            status: 'degraded',
            reason: webgpuFeatureCapabilityGateSummary.dominantKnownReason
              ? `Sampled image clip workload remained on hybrid or partial native routes (dominant feature gate: ${webgpuFeatureCapabilityGateSummary.dominantKnownReason}).`
              : 'Sampled image clip workload remained on hybrid or partial native routes.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuFeatureCapabilityGateReason'],
          },
    },
    {
      id: 'model-complete-failure-fallback-classification',
      feature: 'Model-complete failure fallback classification',
      category: 'fallback-classification',
      webgl: input.samples.every((sample) => sample.cacheFallbackReason.length > 0)
        ? {
            status: 'pass',
            reason: webglFeatureCapabilityGateSummary.dominantKnownReason
              ? `Fallback taxonomy signals are present for all sampled WebGL diagnostics frames (feature gate dominant=${webglFeatureCapabilityGateSummary.dominantKnownReason}; known=${webglFeatureCapabilityGateSummary.knownRejectedCount}; unknown=${webglFeatureCapabilityGateSummary.unknownRejectedCount}).`
              : 'Fallback taxonomy signals are present for all sampled WebGL diagnostics frames.',
            evidenceSignals: ['webglRenderPath', 'cacheFallbackReason', 'webglFeatureCapabilityGateReason'],
          }
        : {
            status: 'fail',
            reason: 'Missing cache fallback taxonomy signals in sampled WebGL diagnostics frames.',
            evidenceSignals: ['webglRenderPath', 'cacheFallbackReason', 'webglFeatureCapabilityGateReason'],
          },
      webgpu: input.samples.every((sample) => sample.webgpuNativeRectBatchRejectedReason.length > 0)
        ? {
            status: 'pass',
            reason: webgpuRectBatchRejectionSummary.dominantKnownReason
              ? `Fallback/rect-batch rejection taxonomy signals are present for sampled WebGPU frames (dominant reason: ${webgpuRectBatchRejectionSummary.dominantKnownReason}; known=${webgpuRectBatchRejectionSummary.knownRejectedCount}; unknown=${webgpuRectBatchRejectionSummary.unknownRejectedCount}; feature gate dominant=${webgpuFeatureCapabilityGateSummary.dominantKnownReason ?? 'none'}).`
              : 'Fallback/rect-batch rejection taxonomy signals are present for sampled WebGPU frames.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
          }
        : {
            status: 'fail',
            reason: 'Missing rect-batch rejection taxonomy signals in sampled WebGPU diagnostics frames.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuNativeRectBatchRejectedReason', 'webgpuFeatureCapabilityGateReason'],
          },
    },
    {
      id: 'cross-backend-parity-diagnostics-coverage',
      feature: 'Cross-backend parity diagnostics coverage',
      category: 'diagnostics',
      webgl: input.samples.every((sample) => Number.isFinite(sample.webglInteractiveTextFallbackCount))
        ? {
            status: 'pass',
            reason: 'Sampled WebGL diagnostics expose finite fallback counters for parity instrumentation.',
            evidenceSignals: ['webglInteractiveTextFallbackCount', 'webglBudgetPressure', 'cacheFallbackReason'],
          }
        : {
            status: 'fail',
            reason: 'Sampled WebGL diagnostics contain invalid parity instrumentation counters.',
            evidenceSignals: ['webglInteractiveTextFallbackCount', 'webglBudgetPressure', 'cacheFallbackReason'],
          },
      webgpu: input.samples.every((sample) => Number.isFinite(sample.webgpuNativeSubmissionAttemptedCount))
        ? {
            status: 'pass',
            reason: 'Sampled WebGPU diagnostics expose finite native submission counters.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuNativeSubmissionAttemptedCount', 'webgpuFeatureCapabilityGateReason'],
          }
        : {
            status: 'fail',
            reason: 'Sampled WebGPU diagnostics contain invalid native submission counters.',
            evidenceSignals: ['webgpuRenderPath', 'webgpuNativeSubmissionAttemptedCount', 'webgpuFeatureCapabilityGateReason'],
          },
    },
  ]

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    rows,
    summary: createRenderParitySummary(rows),
  }
}

/**
 * Builds one aggregated status summary from checklist rows.
 * @param rows Feature-level checklist rows.
 */
function createRenderParitySummary(
  rows: readonly RenderParityChecklistRow[],
): RenderParityChecklistReport['summary'] {
  const summary: RenderParityChecklistReport['summary'] = {
    pass: {webgl: 0, webgpu: 0},
    degraded: {webgl: 0, webgpu: 0},
    fail: {webgl: 0, webgpu: 0},
    unknown: {webgl: 0, webgpu: 0},
  }

  for (const row of rows) {
    summary[row.webgl.status].webgl += 1
    summary[row.webgpu.status].webgpu += 1
  }

  return summary
}
