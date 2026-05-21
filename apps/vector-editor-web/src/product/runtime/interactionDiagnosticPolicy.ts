/**
 * Declares key-path stage labels used by runtime interaction diagnostics.
 */
export type RuntimeInteractionDiagnosticStage =
  | 'pointer-down'
  | 'pointer-move'
  | 'pointer-up'
  | 'pointer-leave'
  | 'selection-cycle'

/**
 * Declares one diagnostic event payload emitted from runtime interaction key paths.
 */
export type RuntimeInteractionDiagnosticEvent = {
  /** Stores event kind for hit-candidate diagnostics. */
  kind: 'hit-candidate'
  /** Stores key-path stage where hit candidates were sampled. */
  stage: RuntimeInteractionDiagnosticStage
  /** Stores hit candidate count after runtime selection filtering. */
  candidateCount: number
} | {
  /** Stores event kind for transform-commit diagnostics. */
  kind: 'transform-commit'
  /** Stores key-path stage where transform commit completed. */
  stage: RuntimeInteractionDiagnosticStage
  /** Stores elapsed time in milliseconds for transform commit path. */
  durationMs: number
} | {
  /** Stores event kind for rollback diagnostics. */
  kind: 'transform-rollback'
  /** Stores key-path stage where rollback/cancel was resolved. */
  stage: RuntimeInteractionDiagnosticStage
  /** Stores rollback reason token to make triage searchable. */
  reason:
    | 'pointer-leave-cancel'
    | 'pointer-up-no-transform-command'
    | 'pointer-up-stale-preview-cleanup'
}

/**
 * Declares one persisted diagnostic entry for runtime interaction tracing.
 */
export interface RuntimeInteractionDiagnosticEntry {
  /** Stores event kind for downstream query grouping. */
  kind: RuntimeInteractionDiagnosticEvent['kind']
  /** Stores key-path stage for fast branch localization. */
  stage: RuntimeInteractionDiagnosticStage
  /** Stores timestamp (epoch milliseconds) when the entry was produced. */
  timestampMs: number
  /** Stores hit candidate count when kind is hit-candidate. */
  hitCandidateCount: number | null
  /** Stores transform commit duration when kind is transform-commit. */
  transformCommitDurationMs: number | null
  /** Stores cumulative rollback count after this entry. */
  rollbackCount: number
  /** Stores rollback reason token when kind is transform-rollback. */
  rollbackReason:
    | 'pointer-leave-cancel'
    | 'pointer-up-no-transform-command'
    | 'pointer-up-stale-preview-cleanup'
    | null
}

/**
 * Declares coverage snapshot for mandatory key metrics in diagnostics logs.
 */
export interface RuntimeInteractionDiagnosticCoverage {
  /** Stores number of key-path metric logs expected from processed events. */
  expectedMetricLogCount: number
  /** Stores number of key-path metric logs emitted with valid metric payload. */
  emittedMetricLogCount: number
  /** Stores completeness ratio in [0, 1]. */
  completenessRatio: number
}

/**
 * Declares immutable diagnostics snapshot returned to runtime callers.
 */
export interface RuntimeInteractionDiagnosticSnapshot {
  /** Stores latest metric-log coverage snapshot. */
  coverage: RuntimeInteractionDiagnosticCoverage
  /** Stores cumulative rollback counter for runtime interaction session. */
  rollbackCount: number
  /** Stores latest diagnostic entry for incremental observers. */
  latestEntry: RuntimeInteractionDiagnosticEntry | null
  /** Stores recent diagnostic ring buffer for issue replay. */
  recentEntries: RuntimeInteractionDiagnosticEntry[]
}

/**
 * Declares logger output contract for runtime interaction diagnostics.
 */
export interface RuntimeInteractionDiagnosticLogger {
  /**
   * Records one interaction diagnostic event and returns updated snapshot.
   * @param event Diagnostic event payload emitted by runtime key path.
   * @returns Updated diagnostic snapshot after event ingestion.
   */
  record(event: RuntimeInteractionDiagnosticEvent): RuntimeInteractionDiagnosticSnapshot
  /**
   * Returns current diagnostic snapshot without mutating logger state.
   * @returns Current runtime interaction diagnostic snapshot.
   */
  getSnapshot(): RuntimeInteractionDiagnosticSnapshot
}

/**
 * Declares creation-time options for runtime interaction diagnostic logger.
 */
export interface CreateRuntimeInteractionDiagnosticLoggerOptions {
  /** Stores max number of recent entries retained for replay and triage. */
  maxRecentEntries?: number
  /** Stores optional structured log sink; defaults to console.info. */
  emitLog?: (entry: RuntimeInteractionDiagnosticEntry, snapshot: RuntimeInteractionDiagnosticSnapshot) => void
}

const DEFAULT_MAX_RECENT_ENTRIES = 60

/**
 * Resolves one normalized metric completeness ratio.
 * @param expectedMetricLogCount Number of expected metric logs.
 * @param emittedMetricLogCount Number of emitted metric logs.
 * @returns Ratio clamped to [0, 1].
 */
function resolveCompletenessRatio(
  expectedMetricLogCount: number,
  emittedMetricLogCount: number,
): number {
  if (expectedMetricLogCount <= 0) {
    return 1
  }

  const rawRatio = emittedMetricLogCount / expectedMetricLogCount
  return Math.max(0, Math.min(1, rawRatio))
}

/**
 * Resolves whether one diagnostic event carries a valid mandatory metric value.
 * @param event Runtime interaction diagnostic event.
 * @returns True when event contains valid mandatory metric payload.
 */
function hasValidMetricPayload(event: RuntimeInteractionDiagnosticEvent): boolean {
  if (event.kind === 'hit-candidate') {
    return Number.isFinite(event.candidateCount) && event.candidateCount >= 0
  }

  if (event.kind === 'transform-commit') {
    return Number.isFinite(event.durationMs) && event.durationMs >= 0
  }

  return true
}

/**
 * Resolves one immutable snapshot from mutable logger state.
 * @param expectedMetricLogCount Number of expected metric logs.
 * @param emittedMetricLogCount Number of valid emitted metric logs.
 * @param rollbackCount Cumulative rollback counter.
 * @param latestEntry Latest diagnostic entry.
 * @param recentEntries Ring-buffered diagnostic entries.
 * @returns Immutable diagnostic snapshot.
 */
function createSnapshot(
  expectedMetricLogCount: number,
  emittedMetricLogCount: number,
  rollbackCount: number,
  latestEntry: RuntimeInteractionDiagnosticEntry | null,
  recentEntries: RuntimeInteractionDiagnosticEntry[],
): RuntimeInteractionDiagnosticSnapshot {
  return {
    coverage: {
      expectedMetricLogCount,
      emittedMetricLogCount,
      completenessRatio: resolveCompletenessRatio(expectedMetricLogCount, emittedMetricLogCount),
    },
    rollbackCount,
    latestEntry,
    recentEntries,
  }
}

/**
 * Creates runtime interaction diagnostic logger used by product/runtime key paths.
 * @param options Optional logger configuration.
 * @returns Diagnostic logger with record/query capabilities.
 */
export function createRuntimeInteractionDiagnosticLogger(
  options: CreateRuntimeInteractionDiagnosticLoggerOptions = {},
): RuntimeInteractionDiagnosticLogger {
  const maxRecentEntries = Number.isFinite(options.maxRecentEntries)
    ? Math.max(1, Math.floor(options.maxRecentEntries ?? DEFAULT_MAX_RECENT_ENTRIES))
    : DEFAULT_MAX_RECENT_ENTRIES
  const emitLog = options.emitLog ?? ((entry, snapshot) => {
    console.info('[runtime-interaction-diagnostic]', {
      entry,
      coverage: snapshot.coverage,
      rollbackCount: snapshot.rollbackCount,
    })
  })

  let expectedMetricLogCount = 0
  let emittedMetricLogCount = 0
  let rollbackCount = 0
  let latestEntry: RuntimeInteractionDiagnosticEntry | null = null
  const recentEntries: RuntimeInteractionDiagnosticEntry[] = []

  /**
   * Appends one entry into bounded recent-entry ring buffer.
   * @param entry Diagnostic entry to append.
   */
  const appendRecentEntry = (entry: RuntimeInteractionDiagnosticEntry) => {
    recentEntries.push(entry)
    if (recentEntries.length > maxRecentEntries) {
      recentEntries.shift()
    }
  }

  /**
   * Records one interaction diagnostic event.
   * @param event Diagnostic event emitted by key path instrumentation.
   * @returns Updated diagnostic snapshot.
   */
  const record = (event: RuntimeInteractionDiagnosticEvent): RuntimeInteractionDiagnosticSnapshot => {
    expectedMetricLogCount += 1
    if (hasValidMetricPayload(event)) {
      emittedMetricLogCount += 1
    }

    if (event.kind === 'transform-rollback') {
      rollbackCount += 1
    }

    const entry: RuntimeInteractionDiagnosticEntry = {
      kind: event.kind,
      stage: event.stage,
      timestampMs: Date.now(),
      hitCandidateCount: event.kind === 'hit-candidate' ? event.candidateCount : null,
      transformCommitDurationMs: event.kind === 'transform-commit' ? event.durationMs : null,
      rollbackCount,
      rollbackReason: event.kind === 'transform-rollback' ? event.reason : null,
    }

    latestEntry = entry
    appendRecentEntry(entry)
    const snapshot = createSnapshot(
      expectedMetricLogCount,
      emittedMetricLogCount,
      rollbackCount,
      latestEntry,
      recentEntries,
    )
    emitLog(entry, snapshot)
    return snapshot
  }

  /**
   * Returns current diagnostic snapshot.
   * @returns Current logger snapshot.
   */
  const getSnapshot = (): RuntimeInteractionDiagnosticSnapshot => {
    return createSnapshot(
      expectedMetricLogCount,
      emittedMetricLogCount,
      rollbackCount,
      latestEntry,
      recentEntries,
    )
  }

  return {
    record,
    getSnapshot,
  }
}
