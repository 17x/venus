import type {SceneUpdateMessage} from '../worker/index.ts'

/**
 * Declares standardized runtime invalidation reason codes for render/state synchronization diagnostics.
 */
export type CanvasRuntimeInvalidationReasonCode =
  | 'init'
  | 'worker.scene-ready'
  | 'worker.scene-full'
  | 'worker.scene-flags'
  | 'viewport.fit'
  | 'viewport.pan'
  | 'viewport.resize'
  | 'viewport.zoom'
  | 'viewport.set'
  | 'fallback.selection.local'

/**
 * Declares split runtime revisions used by state synchronization diagnostics.
 */
export interface CanvasRuntimeRevisions {
  // Stores scene-structure revision advanced by worker full updates.
  sceneRevision: number
  // Stores selection-flag revision advanced by worker/local selection mutations.
  selectionRevision: number
  // Stores viewport-state revision advanced by local viewport operations.
  viewportRevision: number
}

/**
 * Declares synchronization diagnostics consumed by runtime integration and render invalidation tests.
 */
export interface CanvasRuntimeSynchronizationDiagnostics {
  // Stores current split revision counters.
  revisions: CanvasRuntimeRevisions
  // Stores last standardized invalidation reason code.
  lastInvalidationReason: CanvasRuntimeInvalidationReasonCode
  // Stores optional worker update kind from latest worker-driven synchronization.
  lastWorkerUpdateKind: SceneUpdateMessage['updateKind'] | null
}

/**
 * Stores default synchronization diagnostics used for runtime cold-start snapshots.
 */
export const DEFAULT_RUNTIME_SYNCHRONIZATION_DIAGNOSTICS: CanvasRuntimeSynchronizationDiagnostics = {
  revisions: {
    sceneRevision: 0,
    selectionRevision: 0,
    viewportRevision: 0,
  },
  lastInvalidationReason: 'init',
  lastWorkerUpdateKind: null,
}

/**
 * Resolves one standardized worker invalidation reason from worker message payload.
 * @param message Worker scene message used to infer invalidation reason.
 */
export function resolveWorkerInvalidationReason(
  message: SceneUpdateMessage,
): CanvasRuntimeInvalidationReasonCode {
  if (message.type === 'scene-ready') {
    return 'worker.scene-ready'
  }

  return message.updateKind === 'full' ? 'worker.scene-full' : 'worker.scene-flags'
}
