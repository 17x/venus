export interface RenderParityCaptureReleaseGateSummaryInput {
  generatedAt?: string
  status?: string
  durationMs?: number
  captureDurationMs?: number
  bootstrapDurationMs?: number
  batchDurationMs?: number
  gateDurationMs?: number
  capturedCount?: number
  failureCodes?: readonly string[]
  frameArtifactStatusCounter?: {
    pass?: number
    degraded?: number
    unknown?: number
    missing?: number
    invalid?: number
  }
}

export interface RenderParityCaptureReleaseGateStabilityThresholds {
  minRunCount: number
  maxFailureCount: number
  maxDurationMs: number
  maxFrameArtifactIssueCount: number
}

export interface RenderParityCaptureReleaseGatePrRequiredRolloutPolicy {
  minRunCount: number
  minPassRatePercent: number
  maxFailureCount: number
  maxDurationMs: number
  maxFrameArtifactIssueCount: number
}

export interface RenderParityCaptureReleaseGateStabilityReport {
  schemaVersion: 1
  generatedAt: string
  runCount: number
  passCount: number
  failCount: number
  passRatePercent: number
  maxDurationMs: number
  averageDurationMs: number
  maxCaptureDurationMs: number
  averageCaptureDurationMs: number
  totalCapturedCount: number
  failureCodeCounter: Record<string, number>
  frameArtifactIssueCount: number
  frameArtifactStatusCounter: {
    pass: number
    degraded: number
    unknown: number
    missing: number
    invalid: number
  }
  thresholds: RenderParityCaptureReleaseGateStabilityThresholds
  prRequiredRolloutPolicy: RenderParityCaptureReleaseGatePrRequiredRolloutPolicy
  promotionRecommendation: 'promote-to-pr-candidate' | 'keep-manual'
  promotionGateStatus: 'pass' | 'fail'
  prRequiredRolloutRecommendation: 'ready-for-pr-required' | 'keep-manual-observation'
  reasons: string[]
  prRequiredRolloutReasons: string[]
}

export const DEFAULT_CAPTURE_RELEASE_GATE_STABILITY_THRESHOLDS: RenderParityCaptureReleaseGateStabilityThresholds = {
  minRunCount: 3,
  maxFailureCount: 0,
  maxDurationMs: 120000,
  maxFrameArtifactIssueCount: 0,
}

export const DEFAULT_CAPTURE_RELEASE_GATE_PR_REQUIRED_ROLLOUT_POLICY:
  RenderParityCaptureReleaseGatePrRequiredRolloutPolicy = {
    minRunCount: 5,
    minPassRatePercent: 100,
    maxFailureCount: 0,
    maxDurationMs: 90000,
    maxFrameArtifactIssueCount: 0,
  }

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
}

function normalizeFrameCounter(input: RenderParityCaptureReleaseGateSummaryInput) {
  const counter = input.frameArtifactStatusCounter ?? {}
  return {
    pass: finiteNumber(counter.pass),
    degraded: finiteNumber(counter.degraded),
    unknown: finiteNumber(counter.unknown),
    missing: finiteNumber(counter.missing),
    invalid: finiteNumber(counter.invalid),
  }
}

function resolveThresholds(
  thresholds: Partial<RenderParityCaptureReleaseGateStabilityThresholds>,
): RenderParityCaptureReleaseGateStabilityThresholds {
  return {
    minRunCount: finiteNumber(thresholds.minRunCount) || DEFAULT_CAPTURE_RELEASE_GATE_STABILITY_THRESHOLDS.minRunCount,
    maxFailureCount: finiteNumber(thresholds.maxFailureCount),
    maxDurationMs: finiteNumber(thresholds.maxDurationMs) ||
      DEFAULT_CAPTURE_RELEASE_GATE_STABILITY_THRESHOLDS.maxDurationMs,
    maxFrameArtifactIssueCount: finiteNumber(thresholds.maxFrameArtifactIssueCount),
  }
}

function resolvePrRequiredRolloutPolicy(
  policy: Partial<RenderParityCaptureReleaseGatePrRequiredRolloutPolicy>,
): RenderParityCaptureReleaseGatePrRequiredRolloutPolicy {
  return {
    minRunCount: finiteNumber(policy.minRunCount) ||
      DEFAULT_CAPTURE_RELEASE_GATE_PR_REQUIRED_ROLLOUT_POLICY.minRunCount,
    minPassRatePercent: finiteNumber(policy.minPassRatePercent) ||
      DEFAULT_CAPTURE_RELEASE_GATE_PR_REQUIRED_ROLLOUT_POLICY.minPassRatePercent,
    maxFailureCount: finiteNumber(policy.maxFailureCount),
    maxDurationMs: finiteNumber(policy.maxDurationMs) ||
      DEFAULT_CAPTURE_RELEASE_GATE_PR_REQUIRED_ROLLOUT_POLICY.maxDurationMs,
    maxFrameArtifactIssueCount: finiteNumber(policy.maxFrameArtifactIssueCount),
  }
}

/**
 * Aggregates capture release gate summaries into one stability report.
 * @param summaries Capture release gate summary artifacts.
 * @param thresholds Optional promotion thresholds.
 */
export function createRenderParityCaptureReleaseGateStabilityReport(
  summaries: readonly RenderParityCaptureReleaseGateSummaryInput[],
  thresholds: Partial<RenderParityCaptureReleaseGateStabilityThresholds> = {},
  prRequiredRolloutPolicy: Partial<RenderParityCaptureReleaseGatePrRequiredRolloutPolicy> = {},
): RenderParityCaptureReleaseGateStabilityReport {
  const resolvedThresholds = resolveThresholds(thresholds)
  const resolvedPrRequiredRolloutPolicy = resolvePrRequiredRolloutPolicy(prRequiredRolloutPolicy)
  const durations = summaries.map((summary) => finiteNumber(summary.durationMs))
  const captureDurations = summaries.map((summary) => finiteNumber(summary.captureDurationMs))
  const passCount = summaries.filter((summary) => summary.status === 'pass').length
  const failCount = summaries.length - passCount
  const failureCodeCounter: Record<string, number> = {}
  const frameArtifactStatusCounter = {
    pass: 0,
    degraded: 0,
    unknown: 0,
    missing: 0,
    invalid: 0,
  }
  let totalCapturedCount = 0

  for (const summary of summaries) {
    totalCapturedCount += finiteNumber(summary.capturedCount)
    for (const code of summary.failureCodes ?? []) {
      failureCodeCounter[code] = (failureCodeCounter[code] ?? 0) + 1
    }
    const frameCounter = normalizeFrameCounter(summary)
    frameArtifactStatusCounter.pass += frameCounter.pass
    frameArtifactStatusCounter.degraded += frameCounter.degraded
    frameArtifactStatusCounter.unknown += frameCounter.unknown
    frameArtifactStatusCounter.missing += frameCounter.missing
    frameArtifactStatusCounter.invalid += frameCounter.invalid
  }

  const frameArtifactIssueCount = frameArtifactStatusCounter.degraded +
    frameArtifactStatusCounter.unknown +
    frameArtifactStatusCounter.missing +
    frameArtifactStatusCounter.invalid
  const maxDurationMs = Math.max(0, ...durations)
  const reasons: string[] = []

  if (summaries.length < resolvedThresholds.minRunCount) {
    reasons.push(`runCount ${summaries.length} is below minRunCount ${resolvedThresholds.minRunCount}`)
  }
  if (failCount > resolvedThresholds.maxFailureCount) {
    reasons.push(`failCount ${failCount} exceeds maxFailureCount ${resolvedThresholds.maxFailureCount}`)
  }
  if (maxDurationMs > resolvedThresholds.maxDurationMs) {
    reasons.push(`maxDurationMs ${maxDurationMs} exceeds maxDurationMs threshold ${resolvedThresholds.maxDurationMs}`)
  }
  if (frameArtifactIssueCount > resolvedThresholds.maxFrameArtifactIssueCount) {
    reasons.push(`frameArtifactIssueCount ${frameArtifactIssueCount} exceeds maxFrameArtifactIssueCount ${resolvedThresholds.maxFrameArtifactIssueCount}`)
  }

  const passRatePercent = percent(passCount, summaries.length)
  const prRequiredRolloutReasons: string[] = []
  if (summaries.length < resolvedPrRequiredRolloutPolicy.minRunCount) {
    prRequiredRolloutReasons.push(
      `runCount ${summaries.length} is below PR rollout minRunCount ${resolvedPrRequiredRolloutPolicy.minRunCount}`,
    )
  }
  if (passRatePercent < resolvedPrRequiredRolloutPolicy.minPassRatePercent) {
    prRequiredRolloutReasons.push(
      `passRatePercent ${passRatePercent} is below PR rollout minPassRatePercent ${resolvedPrRequiredRolloutPolicy.minPassRatePercent}`,
    )
  }
  if (failCount > resolvedPrRequiredRolloutPolicy.maxFailureCount) {
    prRequiredRolloutReasons.push(
      `failCount ${failCount} exceeds PR rollout maxFailureCount ${resolvedPrRequiredRolloutPolicy.maxFailureCount}`,
    )
  }
  if (maxDurationMs > resolvedPrRequiredRolloutPolicy.maxDurationMs) {
    prRequiredRolloutReasons.push(
      `maxDurationMs ${maxDurationMs} exceeds PR rollout maxDurationMs ${resolvedPrRequiredRolloutPolicy.maxDurationMs}`,
    )
  }
  if (frameArtifactIssueCount > resolvedPrRequiredRolloutPolicy.maxFrameArtifactIssueCount) {
    prRequiredRolloutReasons.push(
      `frameArtifactIssueCount ${frameArtifactIssueCount} exceeds PR rollout maxFrameArtifactIssueCount ${resolvedPrRequiredRolloutPolicy.maxFrameArtifactIssueCount}`,
    )
  }

  const promotionGateStatus = reasons.length === 0 ? 'pass' : 'fail'
  const prRequiredRolloutRecommendation = prRequiredRolloutReasons.length === 0
    ? 'ready-for-pr-required'
    : 'keep-manual-observation'

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runCount: summaries.length,
    passCount,
    failCount,
    passRatePercent,
    maxDurationMs,
    averageDurationMs: average(durations),
    maxCaptureDurationMs: Math.max(0, ...captureDurations),
    averageCaptureDurationMs: average(captureDurations),
    totalCapturedCount,
    failureCodeCounter,
    frameArtifactIssueCount,
    frameArtifactStatusCounter,
    thresholds: resolvedThresholds,
    prRequiredRolloutPolicy: resolvedPrRequiredRolloutPolicy,
    promotionRecommendation: promotionGateStatus === 'pass' ? 'promote-to-pr-candidate' : 'keep-manual',
    promotionGateStatus,
    prRequiredRolloutRecommendation,
    reasons,
    prRequiredRolloutReasons,
  }
}
