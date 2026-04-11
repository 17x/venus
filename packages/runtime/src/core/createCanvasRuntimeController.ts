import {isPointInsideClipShape, isPointInsideShapeHitArea, type EditorDocument} from '@venus/document-core'
import { resolveEngineWorkerMode } from '@venus/engine'
import type {
  CollaborationOperation,
  CollaborationState,
  EditorRuntimeCommand,
  HistorySummary,
  SceneUpdateMessage,
} from '../worker/index.ts'
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
 * - local viewport state owned by `@venus/runtime`
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
 * Apps provide the initial document and a worker factory; `@venus/runtime` owns the
 * lifecycle, viewport, and snapshot subscription model on top of that.
 */
export interface CanvasRuntimeControllerOptions<TDocument extends EditorDocument> {
  capacity: number
  createWorker: () => Worker
  document: TDocument
  allowFrameSelection?: boolean
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
  cursor: -1,
  canUndo: false,
  canRedo: false,
}

const SLOW_MESSAGE_HANDLER_MS = 16
const HIT_TEST_TOLERANCE = 6

/**
 * Development-only trace helper for following the runtime bridge without
 * sprinkling raw `console.log` calls throughout the code.
 */
function debugRuntime(_message: string, _details?: unknown) {
  // console.debug('CANVAS-BASE', _message, _details)
}

export function createCanvasRuntimeController<TDocument extends EditorDocument>({
  capacity,
  createWorker,
  document,
  allowFrameSelection = true,
}: CanvasRuntimeControllerOptions<TDocument>): CanvasRuntimeController<TDocument> {
  let scene: SceneMemory | null = null
  let worker: Worker | null = null
  let started = false

  const listeners = new Set<VoidFunction>()
  const workerModeResolution = resolveEngineWorkerMode({
    preferWorker: true,
    preferSharedMemory: true,
  })
  const sabSupported = workerModeResolution.mode === 'worker-shared-memory'

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

  // Viewport updates stay local to runtime and do not round-trip through
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

    if (!hadViewport) {
      // First measured viewport previously triggered two notifications:
      // 1) resize viewport
      // 2) fit viewport
      // Collapse both into one state transition to avoid an extra full redraw.
      updateViewport((viewport) =>
        fitViewportToDocument(
          snapshot.document,
          resizeViewportState(viewport, width, height),
        ),
      )
      return
    }

    updateViewport((viewport) => resizeViewportState(viewport, width, height))
  }

  const zoomViewport = (nextScale: number, anchor?: Point2D) => {
    updateViewport((viewport) => zoomViewportState(viewport, nextScale, anchor))
  }

  const setViewport = (viewport: CanvasViewportState) => {
    snapshot.viewport = viewport
    notify()
  }

  const updateLocalHoverSelection = (hoveredIndex: number, selectedIndex: number) => {
    if (hoveredIndex === snapshot.stats.hoveredIndex && selectedIndex === snapshot.stats.selectedIndex) {
      return
    }

    snapshot.stats = {
      ...snapshot.stats,
      hoveredIndex,
      selectedIndex,
      version: snapshot.stats.version + 1,
    }

    snapshot.shapes = snapshot.shapes.map((shape, index) => ({
      ...shape,
      isHovered: index === hoveredIndex,
      isSelected: index === selectedIndex,
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
    const nextStats = readSceneStats(scene)
    snapshot.history = event.data.history
    snapshot.collaboration = event.data.collaboration

    if (event.data.updateKind === 'full' && event.data.document) {
      snapshot.document = event.data.document as TDocument
      const snapshotReadStart = performance.now()
      snapshot.shapes = readSceneSnapshot(scene, snapshot.document)
      snapshotReadMs = performance.now() - snapshotReadStart
    } else {
      snapshot.shapes = readSceneSnapshot(scene, snapshot.document)
    }

    snapshot.stats = nextStats
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
      interaction: {
        allowFrameSelection,
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
    clearHover: () => {
      if (!sabSupported) {
        if (snapshot.stats.hoveredIndex >= 0) {
          updateLocalHoverSelection(-1, snapshot.stats.selectedIndex)
        }
        return
      }

      worker?.postMessage({ type: 'pointerleave' })
    },
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
    postPointer: (type, pointer, modifiers) => {
      if (!sabSupported) {
        const hoveredIndex = hitTestSnapshot(snapshot.document, snapshot.shapes, pointer, allowFrameSelection)
        if (type === 'pointerdown') {
          updateLocalHoverSelection(hoveredIndex, hoveredIndex)
          return
        }

        updateLocalHoverSelection(hoveredIndex, snapshot.stats.selectedIndex)
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

function hitTestSnapshot(
  document: EditorDocument,
  shapes: SceneShapeSnapshot[],
  pointer: PointerState,
  allowFrameSelection = true,
) {
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    const shape = shapes[index]
    const source = document.shapes[index] ?? shapeById.get(shape?.id ?? '')
    if (!shape || !source) {
      continue
    }

    if (source.type === 'image' && source.clipPathId) {
      continue
    }
    if (source.clipPathId) {
      const clipSource = shapeById.get(source.clipPathId)
      if (clipSource && !isPointInsideClipShape(pointer, clipSource, {tolerance: 1.5})) {
        continue
      }
    }
    if (isPointInsideShapeHitArea(pointer, source, {
      allowFrameSelection,
      tolerance: HIT_TEST_TOLERANCE,
    })) {
      return index
    }
  }

  return -1
}
