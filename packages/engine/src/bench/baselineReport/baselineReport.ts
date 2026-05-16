import type { EngineRenderStats } from '../../renderer/types/index.ts'
import type { EngineRuntimeDiagnostics } from '../../runtime/createEngine/createEngine.ts'

const PERCENTILE_MAX = 100

/**
 * Describes one benchmark run metadata snapshot used for reproducibility.
 */
export interface EngineBaselineRunMeta {
  /** Scenario identifier used by benchmark scenario factory. */
  scenario: string
  /** UTC timestamp in ISO-8601 format. */
  timestampIso: string
  /** Optional git commit hash from CI or local shell. */
  gitCommit?: string
  /** Renderer backend resolved by engine diagnostics. */
  backend: 'canvas2d' | 'webgl' | 'webgpu'
}

/**
 * Describes aggregate frame metrics for one benchmark run.
 */
export interface EngineBaselineSummary {
  /** Number of rendered frames included in this summary. */
  frameCount: number
  /** Mean frame time across all frames in milliseconds. */
  avgFrameMs: number
  /** Median frame time in milliseconds. */
  p50FrameMs: number
  /** p95 frame time in milliseconds. */
  p95FrameMs: number
  /** p99 frame time in milliseconds. */
  p99FrameMs: number
  /** Mean draw call count across all frames. */
  avgDrawCount: number
  /** Mean visible node count across all frames. */
  avgVisibleCount: number
  /** Mean tile scheduler pending queue depth. */
  avgTileQueuePending: number
  /** Count of frames classified as interactive phase. */
  interactiveFrameCount: number
  /** Count of frames classified as static phase. */
  staticFrameCount: number
  /** Count of frames classified as camera phase. */
  cameraFrameCount: number
  /** Distinct fallback reason counters keyed by reason string. */
  fallbackReasonCounts: Record<string, number>
}

/**
 * Describes one per-frame diagnostics snapshot emitted by runtime contracts.
 */
export interface EngineFrameDiagnosticsSnapshot {
  /** Zero-based frame index in the run sequence. */
  frameIndex: number
  /** Runtime strategy phase resolved for the frame. */
  phase: 'interactive' | 'settling' | 'static' | 'camera'
  /** Runtime budget pressure tier resolved for the frame. */
  budgetPressure: 'low' | 'medium' | 'high'
  /** Effective fallback reason emitted by renderer, if any. */
  fallbackReason: string | null
  /** Predictor confidence in range [0,1]. */
  predictorConfidence: number
  /** Draw count emitted by render stats. */
  drawCount: number
  /** Visible count emitted by render stats. */
  visibleCount: number
  /** Frame time in milliseconds. */
  frameMs: number
  /** Whether settle-to-sharp contract still waits for full-quality sharp frame. */
  settlePending: boolean
}

/**
 * Describes one serialized baseline report payload for T0001/T0006 evidence.
 */
export interface EngineBaselineReport {
  /** Reproducibility metadata for the benchmark run. */
  run: EngineBaselineRunMeta
  /** Aggregate metrics for quick dashboard ingestion. */
  summary: EngineBaselineSummary
  /** Per-frame diagnostics snapshots for replay and auditing. */
  snapshots: EngineFrameDiagnosticsSnapshot[]
}

/**
 * Intent: resolve percentile value from a sorted list with safe empty handling.
 * @param sortedValues Sorted numeric samples.
 * @param percentile Percentile in [0, 100].
 * @returns Percentile value or zero for empty input.
 */
function resolvePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) {
    return 0
  }

  const clampedPercentile = Math.min(PERCENTILE_MAX, Math.max(0, percentile))
  const index = Math.min(
    sortedValues.length - 1,
    Math.floor((clampedPercentile / PERCENTILE_MAX) * sortedValues.length),
  )
  return sortedValues[index] ?? 0
}

/**
 * Intent: normalize internal strategy phase into program-level four-phase taxonomy.
 * @param strategyPhase Runtime strategy phase from diagnostics.
 * @returns Program-level phase classification.
 */
function resolveProgramPhase(strategyPhase: EngineRuntimeDiagnostics['strategy']['phase']): 'interactive' | 'settling' | 'static' | 'camera' {
  if (strategyPhase === 'pan' || strategyPhase === 'zoom') {
    return 'interactive'
  }

  return strategyPhase
}

/**
 * Intent: fold fallback reasons into deterministic frequency counters.
 * @param statsList Render stats list from benchmark frames.
 * @returns Fallback reason counters.
 */
function resolveFallbackReasonCounts(statsList: EngineRenderStats[]): Record<string, number> {
  const counters: Record<string, number> = {}
  for (const stats of statsList) {
    const reason = stats.cacheFallbackReason ?? 'none'
    counters[reason] = (counters[reason] ?? 0) + 1
  }
  return counters
}

/**
 * Intent: build one baseline report payload from render stats and diagnostics snapshots.
 * @param run Reproducibility metadata for the benchmark run.
 * @param statsList Frame-level render stats.
 * @param diagnosticsList Frame-level runtime diagnostics.
 * @returns Serialized baseline report structure for T0001/T0006 artifacts.
 */
export function buildEngineBaselineReport(
  run: EngineBaselineRunMeta,
  statsList: EngineRenderStats[],
  diagnosticsList: EngineRuntimeDiagnostics[],
): EngineBaselineReport {
  const frameMsList = statsList.map((stats) => stats.frameMs)
  const sortedFrameMsList = [...frameMsList].sort((a, b) => a - b)
  const frameCount = statsList.length
  const phaseCounters = {
    interactive: 0,
    settling: 0,
    static: 0,
    camera: 0,
  }

  const snapshots = diagnosticsList.map((diagnostics, frameIndex) => {
    const phase = resolveProgramPhase(diagnostics.strategy.phase)
    phaseCounters[phase] += 1
    const stats = statsList[frameIndex]

    return {
      frameIndex,
      phase,
      budgetPressure: diagnostics.budget.pressure,
      fallbackReason: diagnostics.strategySnapshot.fallbackReason,
      predictorConfidence: diagnostics.predictor.confidence,
      drawCount: stats?.drawCount ?? 0,
      visibleCount: stats?.visibleCount ?? 0,
      frameMs: stats?.frameMs ?? 0,
      settlePending: diagnostics.settleSharpness.pending,
    }
  })

  const avgFrameMs = frameCount > 0
    ? frameMsList.reduce((sum, value) => sum + value, 0) / frameCount
    : 0
  const avgDrawCount = frameCount > 0
    ? statsList.reduce((sum, stats) => sum + stats.drawCount, 0) / frameCount
    : 0
  const avgVisibleCount = frameCount > 0
    ? statsList.reduce((sum, stats) => sum + stats.visibleCount, 0) / frameCount
    : 0
  const avgTileQueuePending = frameCount > 0
    ? statsList.reduce((sum, stats) => sum + (stats.tileSchedulerPendingCount ?? 0), 0) / frameCount
    : 0

  return {
    run,
    summary: {
      frameCount,
      avgFrameMs,
      p50FrameMs: resolvePercentile(sortedFrameMsList, 50),
      p95FrameMs: resolvePercentile(sortedFrameMsList, 95),
      p99FrameMs: resolvePercentile(sortedFrameMsList, 99),
      avgDrawCount,
      avgVisibleCount,
      avgTileQueuePending,
      interactiveFrameCount: phaseCounters.interactive,
      staticFrameCount: phaseCounters.static,
      cameraFrameCount: phaseCounters.camera,
      fallbackReasonCounts: resolveFallbackReasonCounts(statsList),
    },
    snapshots,
  }
}
