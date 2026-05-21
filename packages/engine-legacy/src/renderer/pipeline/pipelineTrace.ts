// Module responsibility: collect stage-level trace timing and slow-frame annotations.
// Non-responsibility: stage execution.

/**
 * Describes one pipeline stage timing sample.
 */
export interface EnginePipelineStageTraceSample {
  /** Stage id. */
  stageId: string
  /** Stage elapsed time in milliseconds. */
  elapsedMs: number
}

/**
 * Describes one pipeline frame trace summary.
 */
export interface EnginePipelineFrameTrace {
  /** Stage timing samples. */
  stages: EnginePipelineStageTraceSample[]
  /** Total frame time in milliseconds. */
  totalMs: number
  /** Whether frame is marked as slow. */
  slowFrame: boolean
}

const SLOW_FRAME_THRESHOLD_MS = 16

/**
 * Intent: aggregate stage timing samples into one frame trace summary.
 * @param stages Stage timing samples.
 * @returns Frame trace summary.
 */
export function resolveEnginePipelineFrameTrace(
  stages: readonly EnginePipelineStageTraceSample[],
): EnginePipelineFrameTrace {
  const totalMs = stages.reduce((sum, stage) => sum + Math.max(0, stage.elapsedMs), 0)
  return {
    stages: [...stages],
    totalMs,
    slowFrame: totalMs > SLOW_FRAME_THRESHOLD_MS,
  }
}
