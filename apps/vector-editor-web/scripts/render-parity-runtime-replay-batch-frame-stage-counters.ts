/**
 * Declares frame-stage scheduler mode distribution counters.
 */
export interface RenderParityFrameStageSchedulerModeCounter {
  /** Stores diagnostics row count with interactive scheduler mode. */
  interactive: number
  /** Stores diagnostics row count with normal scheduler mode. */
  normal: number
  /** Stores diagnostics row count without known scheduler mode token. */
  unknown: number
}

/**
 * Declares frame-stage scene-apply mode distribution counters.
 */
export interface RenderParityFrameStageSceneApplyModeCounter {
  /** Stores diagnostics row count with none scene-apply mode. */
  none: number
  /** Stores diagnostics row count with full-load scene-apply mode. */
  fullLoad: number
  /** Stores diagnostics row count with preview-load scene-apply mode. */
  previewLoad: number
  /** Stores diagnostics row count with incremental-patch scene-apply mode. */
  incrementalPatch: number
  /** Stores diagnostics row count without known scene-apply mode token. */
  unknown: number
}

/**
 * Declares frame-stage counters resolved from one runtime diagnostics input file.
 */
export interface RenderParityFrameStageCounterSet {
  /** Stores per-file scheduler mode distribution. */
  schedulerModeCounter: RenderParityFrameStageSchedulerModeCounter
  /** Stores per-file scene-apply mode distribution. */
  sceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter
}

/**
 * Builds frame-stage scheduler/scene-apply counters from one diagnostics row array.
 * @param records Runtime diagnostics records for one input file.
 */
export function createFrameStageCounterSetFromRecords(
  records: readonly unknown[],
): RenderParityFrameStageCounterSet {
  const schedulerModeCounter: RenderParityFrameStageSchedulerModeCounter = {
    interactive: 0,
    normal: 0,
    unknown: 0,
  }
  const sceneApplyModeCounter: RenderParityFrameStageSceneApplyModeCounter = {
    none: 0,
    fullLoad: 0,
    previewLoad: 0,
    incrementalPatch: 0,
    unknown: 0,
  }

  for (const row of records) {
    const record = (row && typeof row === 'object')
      ? (row as {
          frameStageSchedulerMode?: unknown
          frameStageSceneApplyMode?: unknown
        })
      : null

    const schedulerMode = typeof record?.frameStageSchedulerMode === 'string'
      ? record.frameStageSchedulerMode.trim().toLowerCase()
      : ''
    if (schedulerMode === 'interactive') {
      schedulerModeCounter.interactive += 1
    } else if (schedulerMode === 'normal') {
      schedulerModeCounter.normal += 1
    } else {
      schedulerModeCounter.unknown += 1
    }

    const sceneApplyMode = typeof record?.frameStageSceneApplyMode === 'string'
      ? record.frameStageSceneApplyMode.trim().toLowerCase()
      : ''
    if (sceneApplyMode === 'none') {
      sceneApplyModeCounter.none += 1
    } else if (sceneApplyMode === 'full-load') {
      sceneApplyModeCounter.fullLoad += 1
    } else if (sceneApplyMode === 'preview-load') {
      sceneApplyModeCounter.previewLoad += 1
    } else if (sceneApplyMode === 'incremental-patch') {
      sceneApplyModeCounter.incrementalPatch += 1
    } else {
      sceneApplyModeCounter.unknown += 1
    }
  }

  return {
    schedulerModeCounter,
    sceneApplyModeCounter,
  }
}

/**
 * Builds aggregate frame-stage scheduler mode distribution from per-row counters.
 * @param counters Per-row frame-stage scheduler mode counters.
 */
export function createFrameStageSchedulerModeAggregateCounter(
  counters: readonly RenderParityFrameStageSchedulerModeCounter[],
): RenderParityFrameStageSchedulerModeCounter {
  const aggregate: RenderParityFrameStageSchedulerModeCounter = {
    interactive: 0,
    normal: 0,
    unknown: 0,
  }

  for (const counter of counters) {
    aggregate.interactive += counter.interactive
    aggregate.normal += counter.normal
    aggregate.unknown += counter.unknown
  }

  return aggregate
}

/**
 * Builds aggregate frame-stage scene-apply mode distribution from per-row counters.
 * @param counters Per-row frame-stage scene-apply mode counters.
 */
export function createFrameStageSceneApplyModeAggregateCounter(
  counters: readonly RenderParityFrameStageSceneApplyModeCounter[],
): RenderParityFrameStageSceneApplyModeCounter {
  const aggregate: RenderParityFrameStageSceneApplyModeCounter = {
    none: 0,
    fullLoad: 0,
    previewLoad: 0,
    incrementalPatch: 0,
    unknown: 0,
  }

  for (const counter of counters) {
    aggregate.none += counter.none
    aggregate.fullLoad += counter.fullLoad
    aggregate.previewLoad += counter.previewLoad
    aggregate.incrementalPatch += counter.incrementalPatch
    aggregate.unknown += counter.unknown
  }

  return aggregate
}
