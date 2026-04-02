import type { EditorDocument } from '@venus/document-core'
import type {
  CollaborationOperation,
  CollaborationState,
  EditorRuntimeCommand,
  HistorySummary,
  SceneUpdateMessage,
} from '@venus/editor-worker'
import {
  attachSceneMemory,
  createSceneMemory,
  readSceneSnapshot,
  readSceneStats,
  type PointerState,
  type SceneMemory,
  type SceneShapeSnapshot,
  type SceneStats,
} from '@venus/shared-memory'
import type {Point2D} from '../viewport/matrix.ts'
import {
  DEFAULT_VIEWPORT,
  fitViewportToDocument,
  panViewportState,
  resizeViewportState,
  zoomViewportState,
} from '../viewport/controller.ts'
import type {CanvasViewportState} from '../viewport/types.ts'

/**
 * Snapshot shape consumed by app shells.
 *
 * It merges:
 * - source document state
 * - worker-produced scene stats/history/collaboration state
 * - local viewport state owned by canvas-base
 */
export interface CanvasRuntimeSnapshot<TDocument extends EditorDocument> {
  collaboration: CollaborationState
  document: TDocument
  history: HistorySummary
  ready: boolean
  sabSupported: boolean
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
}

/**
 * Minimal boot contract needed to create a runtime instance.
 *
 * Apps provide the initial document and a worker factory; canvas-base owns the
 * lifecycle, viewport, and snapshot subscription model on top of that.
 */
export interface CanvasRuntimeControllerOptions<TDocument extends EditorDocument> {
  capacity: number
  createWorker: () => Worker
  document: TDocument
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
  dispatchCommand: (command: EditorRuntimeCommand) => void
  fitViewport: () => void
  getSnapshot: () => CanvasRuntimeSnapshot<TDocument>
  panViewport: (deltaX: number, deltaY: number) => void
  postPointer: (type: 'pointermove' | 'pointerdown', pointer: PointerState) => void
  receiveRemoteOperation: (operation: CollaborationOperation) => void
  resizeViewport: (width: number, height: number) => void
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
  cursor: -1,
  canUndo: false,
  canRedo: false,
}

/**
 * Development-only trace helper for following the runtime bridge without
 * sprinkling raw `console.log` calls throughout the code.
 */
function debugRuntime(message: string, details?: unknown) {
  console.debug('CANVAS-BASE', message, details)
}

export function createCanvasRuntimeController<TDocument extends EditorDocument>({
  capacity,
  createWorker,
  document,
}: CanvasRuntimeControllerOptions<TDocument>): CanvasRuntimeController<TDocument> {
  let scene: SceneMemory | null = null
  let worker: Worker | null = null
  let started = false

  const listeners = new Set<VoidFunction>()
  const sabSupported =
    typeof SharedArrayBuffer !== 'undefined' &&
    typeof crossOriginIsolated !== 'undefined' &&
    crossOriginIsolated

  // `snapshot` is the single mutable runtime record. React hooks subscribe to
  // controller updates and receive shallow-copied views of this object.
  const snapshot: CanvasRuntimeSnapshot<TDocument> = {
    collaboration: DEFAULT_COLLABORATION_STATE,
    document,
    history: DEFAULT_HISTORY_STATE,
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

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  // Viewport updates stay local to canvas-base and do not round-trip through
  // the worker because they only affect presentation, not document truth.
  const updateViewport = (updater: (viewport: CanvasViewportState) => CanvasViewportState) => {
    snapshot.viewport = updater(snapshot.viewport)
    notify()
  }

  const fitViewport = () => {
    updateViewport((viewport) => fitViewportToDocument(snapshot.document, viewport))
  }

  const panViewport = (deltaX: number, deltaY: number) => {
    updateViewport((viewport) => panViewportState(viewport, deltaX, deltaY))
  }

  const resizeViewport = (width: number, height: number) => {
    if (
      width === snapshot.viewport.viewportWidth &&
      height === snapshot.viewport.viewportHeight
    ) {
      return
    }

    const hadViewport = snapshot.viewport.viewportWidth > 0 && snapshot.viewport.viewportHeight > 0

    updateViewport((viewport) => resizeViewportState(viewport, width, height))

    if (!hadViewport) {
      fitViewport()
    }
  }

  const zoomViewport = (nextScale: number, anchor?: Point2D) => {
    updateViewport((viewport) => zoomViewportState(viewport, nextScale, anchor))
  }

  const handleWorkerMessage = (event: MessageEvent<SceneUpdateMessage>) => {
    if (event.data.type === 'scene-ready') {
      snapshot.ready = true
    }

    if (!scene) {
      return
    }

    // The worker owns scene mutation. canvas-base rebuilds a render-friendly
    // snapshot from SAB + worker metadata after every update.
    const nextStats = readSceneStats(scene)
    snapshot.history = event.data.history
    snapshot.collaboration = event.data.collaboration

    if (event.data.updateKind === 'full' && event.data.document) {
      snapshot.document = event.data.document as TDocument
      snapshot.shapes = readSceneSnapshot(scene, snapshot.document)
    } else {
      snapshot.shapes = patchSnapshotFlags(snapshot.shapes, snapshot.stats, nextStats)
    }

    snapshot.stats = nextStats
    debugRuntime(`worker -> ${event.data.type}`, {
      shapeCount: nextStats.shapeCount,
      historyEntries: snapshot.history.entries.length,
      lastOperationId: snapshot.collaboration.lastOperationId,
      updateKind: event.data.updateKind,
    })
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
    })
    worker.addEventListener('message', handleWorkerMessage as EventListener)
    worker.postMessage({
      type: 'init',
      buffer,
      capacity,
      document,
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
    clearHover: () => worker?.postMessage({ type: 'pointerleave' }),
    destroy,
    dispatchCommand: (command) => {
      if (command.type === 'viewport.zoomIn') {
        zoomViewport(snapshot.viewport.scale * 1.1)
      } else if (command.type === 'viewport.zoomOut') {
        zoomViewport(snapshot.viewport.scale / 1.1)
      } else if (command.type === 'viewport.fit') {
        fitViewport()
      }

      debugRuntime('dispatch command', command)
      worker?.postMessage({ type: 'command', command })
    },
    fitViewport,
    getSnapshot: () => snapshot,
    panViewport,
    postPointer: (type, pointer) => {
      if (type === 'pointerdown') {
        debugRuntime('dispatch pointerdown', pointer)
      }
      worker?.postMessage({ type, pointer })
    },
    receiveRemoteOperation: (operation) => {
      debugRuntime('dispatch remote operation', operation)
      worker?.postMessage({ type: 'collaboration.receive', operation })
    },
    resizeViewport,
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

function patchSnapshotFlags(
  shapes: SceneShapeSnapshot[],
  previousStats: SceneStats,
  nextStats: SceneStats,
) {
  if (shapes.length !== nextStats.shapeCount) {
    return shapes
  }

  const changedIndices = new Set(
    [
      previousStats.hoveredIndex,
      previousStats.selectedIndex,
      nextStats.hoveredIndex,
      nextStats.selectedIndex,
    ].filter((index) => index >= 0 && index < shapes.length),
  )

  if (changedIndices.size === 0) {
    return shapes
  }

  const nextShapes = shapes.slice()
  changedIndices.forEach((index) => {
    const shape = shapes[index]
    if (!shape) {
      return
    }

    nextShapes[index] = {
      ...shape,
      isHovered: index === nextStats.hoveredIndex,
      isSelected: index === nextStats.selectedIndex,
    }
  })

  return nextShapes
}
