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
    checks: number
    mismatches: number
    lastCommandType: string | null
    lastIssues: string[]
    frameBoundaryChecks: number
    frameBoundaryMismatches: number
    lastFrameBoundaryIssues: string[]
    strictModeEnabled: boolean
  }
}

/**
 * Runs side-effect synchronization between runtime state and shared diagnostics/event bridges.
 */
export function useEditorRuntimeBridgeSync(options: EditorRuntimeBridgeSyncOptions) {
  useEffect(() => {
    resetRuntimeEventSnapshots()
    // Reset command snapshot when switching files so bridge queries do not leak previous document activity.
    options.setLastCommandType(null)
  }, [options.fileId, options.setLastCommandType])

  useEffect(() => {
    // Keep bridge selection snapshot in sync so query subscribers can read current selection ids.
    options.setSelectedShapeIds(options.selectedShapeIds)
    options.dispatchRuntimeEvent({
      type: 'runtime.selection.changed',
      selectedShapeIds: options.selectedShapeIds,
    })
  }, [options.dispatchRuntimeEvent, options.selectedShapeIds, options.setSelectedShapeIds])

  useEffect(() => {
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
  }, [
    options.dispatchRuntimeEvent,
    options.layerItemCount,
    options.selectedShapeIds,
    options.setShellLayerCount,
    options.setShellSelectedCount,
  ])

  useEffect(() => {
    // Surface worker runtime-v2 diagnostics through shared runtime events for debug subscribers.
    publishRuntimeMigrationSnapshot({
      runtimeV2: {
        checks: options.runtimeV2.checks,
        mismatches: options.runtimeV2.mismatches,
        lastCommandType: options.runtimeV2.lastCommandType,
        lastIssues: options.runtimeV2.lastIssues,
        frameBoundaryChecks: options.runtimeV2.frameBoundaryChecks,
        frameBoundaryMismatches: options.runtimeV2.frameBoundaryMismatches,
        lastFrameBoundaryIssues: options.runtimeV2.lastFrameBoundaryIssues,
        strictModeEnabled: options.runtimeV2.strictModeEnabled,
      },
    })
  }, [
    options.runtimeV2.checks,
    options.runtimeV2.frameBoundaryChecks,
    options.runtimeV2.frameBoundaryMismatches,
    options.runtimeV2.lastCommandType,
    options.runtimeV2.lastFrameBoundaryIssues,
    options.runtimeV2.lastIssues,
    options.runtimeV2.mismatches,
    options.runtimeV2.strictModeEnabled,
  ])
}