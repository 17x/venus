import {useEffect} from 'react'
import {
  publishRuntimeMigrationSnapshot,
  publishRuntimeShellSnapshot,
  resetRuntimeEventSnapshots,
} from '../../runtime/events/index/index.ts'

/**
 * Defines dependencies required by runtime bridge synchronization effects.
 */
export interface EditorRuntimeBridgeSyncOptions {
  /** Stores active file id to reset shared runtime snapshots across file boundaries. */
  fileId: string | null | undefined
  /** Resets last command snapshot in runtime interaction bridge. */
  setLastCommandType: (next: string | null) => void
  /** Resets last command metadata snapshot in runtime interaction bridge. */
  setLastCommandMeta: (next: import('./useEditorRuntimeInteractionBridge.ts').EditorRuntimeLastCommandMeta | null) => void
  /** Stores selected shape ids used for bridge selection sync and shell snapshot publishing. */
  selectedShapeIds: string[]
  /** Stores layer item count used for shell snapshot publishing. */
  layerItemCount: number
  /** Mirrors selected ids into runtime interaction bridge snapshot. */
  setSelectedShapeIds: (next: string[]) => void
  /** Mirrors shell selected-count into runtime interaction bridge snapshot. */
  setShellSelectedCount: (next: number) => void
  /** Mirrors shell layer-count into runtime interaction bridge snapshot. */
  setShellLayerCount: (next: number) => void
  /** Dispatches runtime interaction events for external subscribers. */
  dispatchRuntimeEvent: (event: import('./useEditorRuntimeInteractionBridge.ts').EditorRuntimeInteractionEvent) => void
  /** Stores runtime-v2 diagnostics snapshot published from runtime bridge. */
  runtimeV2: {
    /** Stores cumulative dual-write check count emitted by runtime-v2 diagnostics. */
    checks: number
    /** Stores cumulative dual-write mismatch count emitted by runtime-v2 diagnostics. */
    mismatches: number
    /** Stores latest command type associated with runtime-v2 mismatch diagnostics. */
    lastCommandType: string | null
    /** Stores latest mismatch issue payload from runtime-v2 diagnostics. */
    lastIssues: string[]
    /** Stores cumulative frame-boundary invariant check count from runtime-v2 diagnostics. */
    frameBoundaryChecks: number
    /** Stores cumulative frame-boundary mismatch count from runtime-v2 diagnostics. */
    frameBoundaryMismatches: number
    /** Stores latest frame-boundary mismatch issues from runtime-v2 diagnostics. */
    lastFrameBoundaryIssues: string[]
    /** Indicates whether strict mismatch mode is enabled in runtime-v2 worker checks. */
    strictModeEnabled: boolean
    /** Stores latest group consistency quick-check summary for debug panel quick triage. */
    groupConsistencyQuickCheck: {
      /** Indicates whether current document passed normalized group quick-check. */
      valid: boolean
      /** Stores latest quick-check diagnostic count for compact debug display. */
      diagnosticCount: number
      /** Stores latest unique quick-check diagnostic codes for quick lookup. */
      codes: Array<
        'group-missing-child' | 'group-child-parent-mismatch' | 'node-parent-invalid' | 'node-parent-missing-child'
      >
    }
    /** Stores adapter snapshot governance summary for runtime debug panel triage. */
    adapterSnapshotGovernance: {
      /** Indicates whether adapter governance snapshot could be computed in current runtime state. */
      available: boolean
      /** Stores normalized file element count from adapter governance snapshot. */
      normalizeElementCount: number
      /** Stores fileDocument adapter shape count from governance snapshot. */
      fileDocumentShapeCount: number
      /** Stores fileFormatScene adapter root-node count from governance snapshot. */
      fileFormatSceneRootCount: number
      /** Stores round-trip file element count from governance snapshot. */
      roundTripElementCount: number
      /** Indicates whether adapter governance baseline consistency checks passed. */
      consistent: boolean
      /** Stores mismatch count across adapter governance field-level comparisons. */
      mismatchCount: number
      /** Stores compact risk grading used by runtime debug panel triage. */
      riskLevel: 'low' | 'medium' | 'high'
      /** Stores deterministic field-level adapter governance diff rows for mismatch review. */
      fieldDiffs: Array<{
        /** Stores stable diff row identifier for deterministic consumer rendering and assertions. */
        field: 'normalize:fileDocument' | 'fileDocument:roundTrip' | 'fileDocument:sceneRoot'
        /** Stores baseline value used as left side in adapter governance comparison. */
        baseline: number
        /** Stores observed value used as right side in adapter governance comparison. */
        observed: number
        /** Stores arithmetic difference `observed - baseline` for compact debugging. */
        delta: number
        /** Indicates whether this diff row passed governance consistency expectation. */
        matches: boolean
      }>
      /** Stores stable issue labels when governance checks fail. */
      issues: string[]
    }
  }
}

/**
 * Applies file-boundary runtime bridge reset so singleton snapshots do not leak across files.
 * @param options Callback dependencies used by the file-boundary reset step.
 */
export function applyRuntimeBridgeFileBoundaryReset(options: Pick<
  EditorRuntimeBridgeSyncOptions,
  'setLastCommandType' | 'setLastCommandMeta'
>) {
  resetRuntimeEventSnapshots()
  // Reset command snapshot when switching files so bridge queries do not leak previous document activity.
  options.setLastCommandType(null)
  options.setLastCommandMeta(null)
}

/**
 * Applies selection synchronization to runtime bridge stores and event subscribers.
 * @param options Selection snapshot and bridge callbacks required for sync publication.
 */
export function applyRuntimeBridgeSelectionSync(options: Pick<
  EditorRuntimeBridgeSyncOptions,
  'selectedShapeIds' | 'setSelectedShapeIds' | 'dispatchRuntimeEvent'
>) {
  // Keep bridge selection snapshot in sync so query subscribers can read current selection ids.
  options.setSelectedShapeIds(options.selectedShapeIds)
  options.dispatchRuntimeEvent({
    type: 'runtime.selection.changed',
    selectedShapeIds: options.selectedShapeIds,
  })
}

/**
 * Applies shell synchronization to runtime shell snapshot and bridge observers.
 * @param options Shell counters and bridge callbacks required for shell sync publication.
 */
export function applyRuntimeBridgeShellSync(options: Pick<
  EditorRuntimeBridgeSyncOptions,
  | 'selectedShapeIds'
  | 'layerItemCount'
  | 'setShellSelectedCount'
  | 'setShellLayerCount'
  | 'dispatchRuntimeEvent'
>) {
  publishRuntimeShellSnapshot({
    selectedCount: options.selectedShapeIds.length,
    layerCount: options.layerItemCount,
  })
  // Keep bridge shell snapshot in sync so shell consumers can subscribe outside React tree.
  options.setShellSelectedCount(options.selectedShapeIds.length)
  options.setShellLayerCount(options.layerItemCount)
  options.dispatchRuntimeEvent({
    type: 'runtime.shell.changed',
    selectedCount: options.selectedShapeIds.length,
    layerCount: options.layerItemCount,
  })
}

/**
 * Applies runtime-v2 migration snapshot publication for debug subscribers.
 * @param runtimeV2 Runtime-v2 diagnostics payload sourced from runtime bridge state.
 */
export function applyRuntimeBridgeMigrationSync(runtimeV2: EditorRuntimeBridgeSyncOptions['runtimeV2']) {
  // Surface worker runtime-v2 diagnostics through shared runtime events for debug subscribers.
  publishRuntimeMigrationSnapshot({
    runtimeV2: {
      checks: runtimeV2.checks,
      mismatches: runtimeV2.mismatches,
      lastCommandType: runtimeV2.lastCommandType,
      lastIssues: runtimeV2.lastIssues,
      frameBoundaryChecks: runtimeV2.frameBoundaryChecks,
      frameBoundaryMismatches: runtimeV2.frameBoundaryMismatches,
      lastFrameBoundaryIssues: runtimeV2.lastFrameBoundaryIssues,
      strictModeEnabled: runtimeV2.strictModeEnabled,
      groupConsistencyQuickCheck: runtimeV2.groupConsistencyQuickCheck,
      adapterSnapshotGovernance: runtimeV2.adapterSnapshotGovernance,
    },
  })
}

/**
 * Runs side-effect synchronization between runtime state and shared diagnostics/event bridges.
 * @param options Runtime bridge snapshots and callbacks consumed by synchronization effects.
 */
export function useEditorRuntimeBridgeSync(options: EditorRuntimeBridgeSyncOptions) {
  useEffect(() => {
    applyRuntimeBridgeFileBoundaryReset(options)
  }, [options.fileId, options.setLastCommandMeta, options.setLastCommandType])

  useEffect(() => {
    applyRuntimeBridgeSelectionSync(options)
  }, [options.dispatchRuntimeEvent, options.selectedShapeIds, options.setSelectedShapeIds])

  useEffect(() => {
    applyRuntimeBridgeShellSync(options)
  }, [
    options.dispatchRuntimeEvent,
    options.layerItemCount,
    options.selectedShapeIds,
    options.setShellLayerCount,
    options.setShellSelectedCount,
  ])

  useEffect(() => {
    applyRuntimeBridgeMigrationSync(options.runtimeV2)
  }, [
    options.runtimeV2.checks,
    options.runtimeV2.frameBoundaryChecks,
    options.runtimeV2.frameBoundaryMismatches,
    options.runtimeV2.lastCommandType,
    options.runtimeV2.lastFrameBoundaryIssues,
    options.runtimeV2.lastIssues,
    options.runtimeV2.mismatches,
    options.runtimeV2.strictModeEnabled,
    options.runtimeV2.groupConsistencyQuickCheck,
    options.runtimeV2.adapterSnapshotGovernance,
  ])
}