import { type EditorDocument } from '../model/index.ts'
import type {
  CollaborationOperation,
  CollaborationState,
  EditorRuntimeCommand,
  HistorySummary,
  RuntimeCommandEnvelopeMeta,
  RuntimeV2DiagnosticsMessage,
  SceneUpdateMessage,
} from '../worker/index.ts'
import type {
  EditorFileHistoryRecoveryReplayMode,
  EditorFileHistoryRecoveryReplaySnapshot,
} from '../types/editorFile.ts'
import {
  attachSceneMemory,
  createSceneMemory,
  readSceneSnapshot,
  readSceneStats,
  type PointerState,
  type SceneMemory,
  type SceneShapeSnapshot,
  type SceneStats,
} from '../shared-memory/index.ts'
import type {Point2D} from '../viewport/matrix.ts'
import {
  DEFAULT_VIEWPORT,
  DEFAULT_VIEWPORT_SCALE_RANGE,
  type CanvasViewportScaleRange,
  fitViewportToDocument,
  panViewportState,
  resizeViewportState,
  zoomViewportState,
} from '../viewport/controller.ts'
import type {CanvasViewportState} from '../viewport/types.ts'
import {
  DEFAULT_RUNTIME_SYNCHRONIZATION_DIAGNOSTICS,
  resolveWorkerInvalidationReason,
  type CanvasRuntimeInvalidationReasonCode,
  type CanvasRuntimeSynchronizationDiagnostics,
} from './runtimeSynchronization.ts'
import {resolveFallbackSelectionIndex} from './runtimeControllerFallbackHitTest.ts'
import {resolveRuntimeWorkerMode} from './runtimeControllerWorkerMode.ts'

export type {
  CanvasRuntimeInvalidationReasonCode,
  CanvasRuntimeRevisions,
  CanvasRuntimeSynchronizationDiagnostics,
} from './runtimeSynchronization.ts'

/**
 * Snapshot shape consumed by app shells.
 *
 * It merges:
 * - source document state
 * - worker-produced scene stats/history/collaboration state
 * - local viewport state owned by `@vector/runtime`
 */
export interface CanvasRuntimeSnapshot<TDocument extends EditorDocument> {
  collaboration: CollaborationState
  document: TDocument
  history: HistorySummary
  // Stores split revisions and standardized invalidation reason for state synchronization diagnostics.
  synchronization: CanvasRuntimeSynchronizationDiagnostics
  // Stores worker-reported runtime-v2 migration diagnostics for debug/event consumers.
  runtimeV2: RuntimeV2DiagnosticsMessage
  ready: boolean
  sabSupported: boolean
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
}

/**
 * Minimal boot contract needed to create a runtime instance.
 *
 * Apps provide the initial document and a worker factory; `@vector/runtime` owns the
 * lifecycle, viewport, and snapshot subscription model on top of that.
 */
export interface CanvasRuntimeControllerOptions<TDocument extends EditorDocument> {
  capacity: number
  createWorker: () => Worker
  document: TDocument
  /** Stores optional crash-recovery replay payload consumed during worker startup. */
  crashRecoveryReplay?: EditorFileHistoryRecoveryReplaySnapshot
  /** Stores startup replay mode used while consuming crash-recovery snapshots. */
  crashRecoveryReplayMode?: EditorFileHistoryRecoveryReplayMode
  allowFrameSelection?: boolean
  strictStrokeHitTest?: boolean
  /** Stores optional viewport min/max zoom bounds for runtime-owned zoom/fit operations. */
  viewportScaleRange?: CanvasViewportScaleRange
}

/**
 * Imperative runtime surface used by React hooks and tests.
 *
 * The controller intentionally hides worker message details so app code only
 * deals with higher-level actions such as pointer dispatch, commands, and
 * viewport operations.
 */
export interface CanvasRuntimeController<TDocument extends EditorDocument> {
  clearHover: () => void
  destroy: () => void
  dispatchCommand: (command: EditorRuntimeCommand, commandMeta?: RuntimeCommandEnvelopeMeta) => void
  fitViewport: () => void
  getSnapshot: () => CanvasRuntimeSnapshot<TDocument>
  panViewport: (deltaX: number, deltaY: number) => void
  postPointer: (
    type: 'pointermove' | 'pointerdown',
    pointer: PointerState,
    modifiers?: {shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean},
  ) => void
  receiveRemoteOperation: (operation: CollaborationOperation) => void
  resizeViewport: (width: number, height: number) => void
  setViewport: (viewport: CanvasViewportState) => void
  start: () => void
  subscribe: (listener: () => void) => () => void
  zoomViewport: (nextScale: number, anchor?: Point2D) => void
}

const DEFAULT_COLLABORATION_STATE: CollaborationState = {
  connected: false,
  actorId: 'local-user',
  pendingLocalCount: 0,
  pendingRemoteCount: 0,
  lastOperationId: null,
}

const DEFAULT_HISTORY_STATE: HistorySummary = {
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

const DEFAULT_RUNTIME_V2_DIAGNOSTICS: RuntimeV2DiagnosticsMessage = {
  checks: 0,
  mismatches: 0,
  lastCommandType: null,
  lastIssues: [],
  frameBoundaryChecks: 0,
  frameBoundaryMismatches: 0,
  lastFrameBoundaryIssues: [],
  strictModeEnabled: false,
}

const SLOW_MESSAGE_HANDLER_MS = 16

/**
 * Development-only trace helper for following the runtime bridge without
 * sprinkling raw `console.log` calls throughout the code.
 */
function debugRuntime(_message: string, _details?: unknown) {
  // console.debug('CANVAS-BASE', _message, _details)
}

/**
 * Creates one canvas runtime controller and wires worker startup lifecycle.
 * @param options Runtime boot options including document and optional replay payload.
 */
export function createCanvasRuntimeController<TDocument extends EditorDocument>({
  capacity,
  createWorker,
  document,
  crashRecoveryReplay,
  crashRecoveryReplayMode = 'merged',
  allowFrameSelection = true,
  strictStrokeHitTest = false,
  viewportScaleRange = DEFAULT_VIEWPORT_SCALE_RANGE,
}: CanvasRuntimeControllerOptions<TDocument>): CanvasRuntimeController<TDocument> {
  let scene: SceneMemory | null = null
  let worker: Worker | null = null
  let started = false

  const listeners = new Set<VoidFunction>()
  const sabSupported = typeof SharedArrayBuffer !== 'undefined'
  const workerModeResolution = resolveRuntimeWorkerMode({
    hasSharedArrayBuffer: sabSupported,
  })

  // `snapshot` is the single mutable runtime record. React hooks subscribe to
  // controller updates and receive shallow-copied views of this object.
  const snapshot: CanvasRuntimeSnapshot<TDocument> = {
    collaboration: DEFAULT_COLLABORATION_STATE,
    document,
    history: DEFAULT_HISTORY_STATE,
    synchronization: DEFAULT_RUNTIME_SYNCHRONIZATION_DIAGNOSTICS,
    runtimeV2: DEFAULT_RUNTIME_V2_DIAGNOSTICS,
    ready: false,
    sabSupported,
    shapes: document.shapes.map((shape) => ({
      ...shape,
      isHovered: false,
      isSelected: false,
    })),
    stats: {
      version: 0,
      shapeCount: document.shapes.length,
      hoveredIndex: -1,
      selectedIndex: -1,
    },
    viewport: DEFAULT_VIEWPORT,
  }
  let shouldAutoFitOnFirstResize = true

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  /**
   * Applies one runtime synchronization diagnostics patch for split revision/invalidation updates.
   * @param updater Diagnostics updater resolving the next synchronization payload.
   */
  const updateSynchronizationDiagnostics = (
    updater: (
      diagnostics: CanvasRuntimeSynchronizationDiagnostics,
    ) => CanvasRuntimeSynchronizationDiagnostics,
  ) => {
    snapshot.synchronization = updater(snapshot.synchronization)
  }

  /**
   * Advances synchronization diagnostics for viewport-only updates.
   * @param reason Standardized invalidation reason code for this viewport update.
   */
  const markViewportInvalidation = (reason: CanvasRuntimeInvalidationReasonCode) => {
    updateSynchronizationDiagnostics((diagnostics) => ({
      revisions: {
        ...diagnostics.revisions,
        viewportRevision: diagnostics.revisions.viewportRevision + 1,
      },
      lastInvalidationReason: reason,
      lastWorkerUpdateKind: diagnostics.lastWorkerUpdateKind,
    }))
  }

  // Keep first-resize auto-fit enabled until runtime has a measured viewport.
  // Cold-start zoom/pan can otherwise disable auto-fit before dimensions are
  // known, leaving the scene outside the initial visible bounds.
  const hasMeasuredViewport = () => (
    snapshot.viewport.viewportWidth > 0 &&
    snapshot.viewport.viewportHeight > 0
  )

  // Viewport updates stay local to runtime and do not round-trip through
  // the worker because they only affect presentation, not document truth.
  /**
   * Applies one viewport state update and emits one synchronized runtime snapshot notification.
   * @param updater Viewport updater returning next viewport state.
   * @param reason Standardized invalidation reason for this viewport update.
   */
  const updateViewport = (
    updater: (viewport: CanvasViewportState) => CanvasViewportState,
    reason: CanvasRuntimeInvalidationReasonCode,
  ) => {
    snapshot.viewport = updater(snapshot.viewport)
    markViewportInvalidation(reason)
    notify()
  }

  const fitViewport = () => {
    shouldAutoFitOnFirstResize = false
    updateViewport(
      (viewport) => fitViewportToDocument(snapshot.document, viewport, viewportScaleRange),
      'viewport.fit',
    )
  }

  const panViewport = (deltaX: number, deltaY: number) => {
    // Ignore early pan gestures until viewport dimensions are measured.
    // Applying deltas against a 0x0 viewport can push first-fit framing off.
    if (!hasMeasuredViewport()) {
      return
    }
    shouldAutoFitOnFirstResize = false
    updateViewport((viewport) => panViewportState(viewport, deltaX, deltaY), 'viewport.pan')
  }

  const resizeViewport = (width: number, height: number) => {
    if (
      width === snapshot.viewport.viewportWidth &&
      height === snapshot.viewport.viewportHeight
    ) {
      return
    }

    const hadViewport = snapshot.viewport.viewportWidth > 0 && snapshot.viewport.viewportHeight > 0

    if (!hadViewport) {
      if (shouldAutoFitOnFirstResize) {
        // First measured viewport previously triggered two notifications:
        // 1) resize viewport
        // 2) fit viewport
        // Collapse both into one state transition to avoid an extra full redraw.
        updateViewport((viewport) =>
          fitViewportToDocument(
            snapshot.document,
            resizeViewportState(viewport, width, height),
            viewportScaleRange,
          ),
          'viewport.resize',
        )
      } else {
        updateViewport((viewport) => resizeViewportState(viewport, width, height), 'viewport.resize')
      }

      shouldAutoFitOnFirstResize = false
      return
    }

    updateViewport((viewport) => resizeViewportState(viewport, width, height), 'viewport.resize')
  }

  const zoomViewport = (nextScale: number, anchor?: Point2D) => {
    // Ignore cold-start zoom before first measured viewport. Zooming a
    // zero-sized viewport can freeze an invalid transform baseline.
    if (!hasMeasuredViewport()) {
      return
    }
    shouldAutoFitOnFirstResize = false
    updateViewport(
      (viewport) => zoomViewportState(viewport, nextScale, anchor, viewportScaleRange),
      'viewport.zoom',
    )
  }

  const setViewport = (viewport: CanvasViewportState) => {
    // Ignore pre-measure viewport writes when both current and incoming
    // dimensions are unresolved. Let first resize+fit establish baseline.
    if (
      !hasMeasuredViewport() &&
      (viewport.viewportWidth <= 0 || viewport.viewportHeight <= 0)
    ) {
      return
    }

    if (viewport.viewportWidth > 0 && viewport.viewportHeight > 0) {
      shouldAutoFitOnFirstResize = false
    }
    snapshot.viewport = viewport
    markViewportInvalidation('viewport.set')
    notify()
  }

  // Keep hover/selection markers overlay-local so they do not advance document revision.
  const updateLocalHoverSelection = (hoveredIndex: number, selectedIndex: number) => {
    if (hoveredIndex === snapshot.stats.hoveredIndex && selectedIndex === snapshot.stats.selectedIndex) {
      return
    }

    snapshot.stats = {
      ...snapshot.stats,
      hoveredIndex,
      selectedIndex,
    }

    snapshot.shapes = snapshot.shapes.map((shape, index) => ({
      ...shape,
      isHovered: index === hoveredIndex,
      isSelected: index === selectedIndex,
    }))

    updateSynchronizationDiagnostics((diagnostics) => ({
      revisions: {
        ...diagnostics.revisions,
        selectionRevision: diagnostics.revisions.selectionRevision + 1,
      },
      lastInvalidationReason: 'fallback.selection.local',
      lastWorkerUpdateKind: diagnostics.lastWorkerUpdateKind,
    }))

    notify()
  }

  const handleWorkerMessage = (event: MessageEvent<SceneUpdateMessage>) => {
    const handlerStart = performance.now()
    let snapshotReadMs = 0

    if (event.data.type === 'scene-ready') {
      snapshot.ready = true
    }

    if (!scene) {
      return
    }

    // The worker owns scene mutation. Runtime rebuilds a render-friendly
    // snapshot from SAB + worker metadata after every update.
    const previousStats = snapshot.stats
    const nextStats = readSceneStats(scene)
    snapshot.history = event.data.history
    snapshot.collaboration = event.data.collaboration
    snapshot.runtimeV2 = event.data.runtimeV2 ?? DEFAULT_RUNTIME_V2_DIAGNOSTICS

    if (event.data.updateKind === 'full' && event.data.document) {
      snapshot.document = event.data.document as TDocument
      const snapshotReadStart = performance.now()
      snapshot.shapes = readSceneSnapshot(scene, snapshot.document)
      snapshotReadMs = performance.now() - snapshotReadStart
    } else {
      snapshot.shapes = readSceneSnapshot(scene, snapshot.document)
    }

    snapshot.stats = nextStats
    updateSynchronizationDiagnostics((diagnostics) => ({
      revisions: {
        sceneRevision: diagnostics.revisions.sceneRevision + (event.data.updateKind === 'full' ? 1 : 0),
        selectionRevision: diagnostics.revisions.selectionRevision + (
          previousStats.selectedIndex !== nextStats.selectedIndex ||
          previousStats.hoveredIndex !== nextStats.hoveredIndex
            ? 1
            : 0
        ),
        viewportRevision: diagnostics.revisions.viewportRevision,
      },
      lastInvalidationReason: resolveWorkerInvalidationReason(event.data),
      lastWorkerUpdateKind: event.data.updateKind,
    }))
    debugRuntime(`worker -> ${event.data.type}`, {
      shapeCount: nextStats.shapeCount,
      historyEntries: snapshot.history.entries.length,
      lastOperationId: snapshot.collaboration.lastOperationId,
      updateKind: event.data.updateKind,
    })
    const totalHandlerMs = performance.now() - handlerStart
    if (totalHandlerMs >= SLOW_MESSAGE_HANDLER_MS) {
      debugRuntime('slow message handler', {
        totalMs: Number(totalHandlerMs.toFixed(2)),
        snapshotReadMs: Number(snapshotReadMs.toFixed(2)),
        updateKind: event.data.updateKind,
        shapeCount: nextStats.shapeCount,
      })
    }
    notify()
  }

  const start = () => {
    if (started || !sabSupported) {
      return
    }

    // SAB memory is created on the main thread, then attached on both sides so
    // worker writes and renderer reads stay zero-copy.
    const buffer = createSceneMemory(capacity)
    scene = attachSceneMemory(buffer, capacity)
    worker = createWorker()
    debugRuntime('starting runtime', {
      capacity,
      initialShapeCount: document.shapes.length,
      workerMode: workerModeResolution.mode,
      workerModeReason: workerModeResolution.reason,
    })
    worker.addEventListener('message', handleWorkerMessage as EventListener)
    worker.postMessage({
      type: 'init',
      buffer,
      capacity,
      document,
      crashRecoveryReplay,
      crashRecoveryReplayMode,
      interaction: {
        allowFrameSelection,
        strictStrokeHitTest,
      },
    })
    started = true
  }

  const destroy = () => {
    worker?.removeEventListener('message', handleWorkerMessage as EventListener)
    worker?.terminate()
    worker = null
    scene = null
    started = false
  }

  return {
    // Hover is owned by overlay/app-layer state. Runtime no longer mutates
    // scene flags for pointer hover transitions.
    clearHover: () => {},
    destroy,
    dispatchCommand: (command, commandMeta) => {
      if (command.type === 'viewport.zoomIn') {
        zoomViewport(snapshot.viewport.scale * 1.1)
      } else if (command.type === 'viewport.zoomOut') {
        zoomViewport(snapshot.viewport.scale / 1.1)
      } else if (command.type === 'viewport.fit') {
        fitViewport()
      }

      debugRuntime('dispatch command', command)
      worker?.postMessage({ type: 'command', command, commandMeta })
    },
    fitViewport,
    getSnapshot: () => snapshot,
    panViewport,
    postPointer: (type, pointer, modifiers) => {
      if (!sabSupported) {
        if (type === 'pointerdown') {
          const selectedIndex = resolveFallbackSelectionIndex(
            snapshot.document,
            snapshot.shapes,
            pointer,
            allowFrameSelection,
            strictStrokeHitTest,
          )
          updateLocalHoverSelection(snapshot.stats.hoveredIndex, selectedIndex)
          return
        }
        // Ignore pointermove hover mutation in no-SAB fallback as well.
        return
      }

      if (type === 'pointermove') {
        // Keep worker scene stable on hover; overlay handles hover affordance.
        return
      }

      if (type === 'pointerdown') {
        debugRuntime('dispatch pointerdown', pointer)
      }
      worker?.postMessage({ type, pointer, modifiers })
    },
    receiveRemoteOperation: (operation) => {
      debugRuntime('dispatch remote operation', operation)
      worker?.postMessage({ type: 'collaboration.receive', operation })
    },
    resizeViewport,
    setViewport,
    start,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    zoomViewport,
  }
}

