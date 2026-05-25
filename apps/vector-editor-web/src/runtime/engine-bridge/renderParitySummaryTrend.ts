import {
  createRenderParitySummaryDiffReport,
  type RenderParityRuntimeSummaryArtifact,
  type RenderParitySummaryDiffReport,
} from './renderParitySummaryDiff.ts'

/**
 * Declares one current-run diff row in trend ledger output.
 */
export interface RenderParitySummaryTrendRow {
  /** Stores current summary artifact generated timestamp. */
  generatedAt: string
  /** Stores current summary artifact sample count. */
  sampleCount: number
  /** Stores diff report between baseline and this current summary. */
  diff: RenderParitySummaryDiffReport
}

/**
 * Declares one trend ledger report for baseline against many current summaries.
 */
export interface RenderParitySummaryTrendReport {
  /** Stores baseline summary artifact metadata. */
  baseline: {
    generatedAt: string
    sampleCount: number
  }
  /** Stores number of compared current summaries. */
  comparedCount: number
  /** Stores aggregate overall-trend counters across compared summaries. */
  trendCounter: {
    improved: number
    regressed: number
    mixed: number
    unchanged: number
  }
  /** Stores per-summary diff rows in ascending generatedAt order. */
  rows: RenderParitySummaryTrendRow[]
}

/**
 * Builds one summary trend ledger report for a baseline and many current summaries.
 * @param baseline Baseline summary artifact used for all pairwise diffs.
 * @param currentSummaries Current summary artifacts to compare against baseline.
 */
export function createRenderParitySummaryTrendReport(
  baseline: RenderParityRuntimeSummaryArtifact,
  currentSummaries: readonly RenderParityRuntimeSummaryArtifact[],
): RenderParitySummaryTrendReport {
  const rows = [...currentSummaries]
    .sort((left, right) => left.generatedAt.localeCompare(right.generatedAt))
    .map((currentSummary) => ({
      generatedAt: currentSummary.generatedAt,
      sampleCount: currentSummary.sampleCount,
      diff: createRenderParitySummaryDiffReport(baseline, currentSummary),
    }))

  const trendCounter: RenderParitySummaryTrendReport['trendCounter'] = {
    improved: 0,
    regressed: 0,
    mixed: 0,
    unchanged: 0,
  }

  for (const row of rows) {
    trendCounter[row.diff.overallTrend] += 1
  }

  return {
    baseline: {
      generatedAt: baseline.generatedAt,
      sampleCount: baseline.sampleCount,
    },
    comparedCount: rows.length,
    trendCounter,
    rows,
  }
}
