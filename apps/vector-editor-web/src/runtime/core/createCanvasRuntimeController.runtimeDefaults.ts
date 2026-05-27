import type {
  CollaborationState,
  HistorySummary,
  RuntimeV2DiagnosticsMessage,
} from '../worker/index.ts'

/** Stores default collaboration state before worker bootstrap emits first snapshot. */
export const DEFAULT_COLLABORATION_STATE: CollaborationState = {
  connected: false,
  actorId: 'local-user',
  pendingLocalCount: 0,
  pendingRemoteCount: 0,
  lastOperationId: null,
}

/** Stores default history summary before runtime history hydration completes. */
export const DEFAULT_HISTORY_STATE: HistorySummary = {
  entries: [],
  transactionGroups: [],
  cursor: -1,
  canUndo: false,
  canRedo: false,
  recoveryReplay: {
    maxEntries: 20,
    localOnly: {
      mode: 'local-only',
      entries: [],
    },
    merged: {
      mode: 'merged',
      entries: [],
    },
  },
}

/** Stores empty runtime-v2 diagnostics payload used before worker emits migration telemetry. */
export const DEFAULT_RUNTIME_V2_DIAGNOSTICS: RuntimeV2DiagnosticsMessage = {
  checks: 0,
  mismatches: 0,
  lastCommandType: null,
  lastIssues: [],
  frameBoundaryChecks: 0,
  frameBoundaryMismatches: 0,
  lastFrameBoundaryIssues: [],
  strictModeEnabled: false,
}

/** Stores diagnostic threshold for reporting slow worker message handlers in development traces. */
export const SLOW_MESSAGE_HANDLER_MS = 16

/**
 * Development-only trace helper for following the runtime bridge without
 * sprinkling raw `console.log` calls throughout the code.
 * @param _message Human-readable diagnostic label for the trace event.
 * @param _details Optional structured payload to inspect at the trace site.
 */
export function debugRuntime(_message: string, _details?: unknown) {
  // console.debug('CANVAS-BASE', _message, _details)
}
