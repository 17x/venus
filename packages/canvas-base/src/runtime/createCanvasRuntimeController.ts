import type { CollaborationOperation, CollaborationState } from '@venus/collaboration'
import type { EditorDocument } from '@venus/editor-core'
import type { EditorRuntimeCommand, SceneUpdateMessage } from '@venus/editor-worker'
import type { HistorySummary } from '@venus/history'
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
import {
  createViewportMatrix,
  invertViewportMatrix,
  type Point2D,
} from '../viewport/matrix.ts'
import type { CanvasViewportState } from '../viewport/types.ts'

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

export interface CanvasRuntimeControllerOptions<TDocument extends EditorDocument> {
  capacity: number
  createWorker: () => Worker
  document: TDocument
}

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

const DEFAULT_VIEWPORT: CanvasViewportState = {
  inverseMatrix: [
    1, 0, -48,
    0, 1, -48,
    0, 0, 1,
  ],
  matrix: [
    1, 0, 48,
    0, 1, 48,
    0, 0, 1,
  ],
  offsetX: 48,
  offsetY: 48,
  scale: 1,
  viewportWidth: 0,
  viewportHeight: 0,
}

function clampScale(scale: number) {
  return Math.min(8, Math.max(0.1, scale))
}

function resolveViewportState(
  viewport: Pick<CanvasViewportState, 'offsetX' | 'offsetY' | 'scale' | 'viewportWidth' | 'viewportHeight'>,
): CanvasViewportState {
  const matrix = createViewportMatrix(viewport.scale, viewport.offsetX, viewport.offsetY)

  return {
    ...viewport,
    matrix,
    inverseMatrix: invertViewportMatrix(matrix),
  }
}

function fitViewportToDocument(
  document: EditorDocument,
  viewport: CanvasViewportState,
): CanvasViewportState {
  const { viewportWidth, viewportHeight } = viewport

  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return viewport
  }

  const horizontalPadding = Math.max(32, viewportWidth * 0.08)
  const verticalPadding = Math.max(32, viewportHeight * 0.08)
  const availableWidth = Math.max(1, viewportWidth - horizontalPadding * 2)
  const availableHeight = Math.max(1, viewportHeight - verticalPadding * 2)
  const scale = clampScale(
    Math.min(availableWidth / document.width, availableHeight / document.height),
  )

  return {
    ...resolveViewportState({
      viewportWidth,
      viewportHeight,
      scale,
      offsetX: (viewportWidth - document.width * scale) / 2,
      offsetY: (viewportHeight - document.height * scale) / 2,
    }),
  }
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

  const updateViewport = (updater: (viewport: CanvasViewportState) => CanvasViewportState) => {
    snapshot.viewport = updater(snapshot.viewport)
    notify()
  }

  const fitViewport = () => {
    updateViewport((viewport) => fitViewportToDocument(snapshot.document, viewport))
  }

  const panViewport = (deltaX: number, deltaY: number) => {
    updateViewport((viewport) => resolveViewportState({
      offsetX: viewport.offsetX + deltaX,
      offsetY: viewport.offsetY + deltaY,
      scale: viewport.scale,
      viewportWidth: viewport.viewportWidth,
      viewportHeight: viewport.viewportHeight,
    }))
  }

  const resizeViewport = (width: number, height: number) => {
    if (
      width === snapshot.viewport.viewportWidth &&
      height === snapshot.viewport.viewportHeight
    ) {
      return
    }

    const hadViewport = snapshot.viewport.viewportWidth > 0 && snapshot.viewport.viewportHeight > 0

    updateViewport((viewport) => resolveViewportState({
      offsetX: viewport.offsetX,
      offsetY: viewport.offsetY,
      scale: viewport.scale,
      viewportWidth: width,
      viewportHeight: height,
    }))

    if (!hadViewport) {
      fitViewport()
    }
  }

  const zoomViewport = (nextScale: number, anchor?: Point2D) => {
    updateViewport((viewport) => {
      const scale = clampScale(nextScale)

      if (!anchor || viewport.scale === scale) {
        return resolveViewportState({
          offsetX: viewport.offsetX,
          offsetY: viewport.offsetY,
          scale,
          viewportWidth: viewport.viewportWidth,
          viewportHeight: viewport.viewportHeight,
        })
      }

      const worldX =
        viewport.inverseMatrix[0] * anchor.x +
        viewport.inverseMatrix[1] * anchor.y +
        viewport.inverseMatrix[2]
      const worldY =
        viewport.inverseMatrix[3] * anchor.x +
        viewport.inverseMatrix[4] * anchor.y +
        viewport.inverseMatrix[5]

      return resolveViewportState({
        scale,
        offsetX: anchor.x - worldX * scale,
        offsetY: anchor.y - worldY * scale,
        viewportWidth: viewport.viewportWidth,
        viewportHeight: viewport.viewportHeight,
      })
    })
  }

  const handleWorkerMessage = (event: MessageEvent<SceneUpdateMessage>) => {
    if (event.data.type === 'scene-ready') {
      snapshot.ready = true
    }

    if (!scene) {
      return
    }

    snapshot.document = event.data.document as TDocument
    snapshot.history = event.data.history
    snapshot.collaboration = event.data.collaboration
    snapshot.stats = readSceneStats(scene)
    snapshot.shapes = readSceneSnapshot(scene, snapshot.document)
    debugRuntime(`worker -> ${event.data.type}`, {
      shapeCount: snapshot.stats.shapeCount,
      historyEntries: snapshot.history.entries.length,
      lastOperationId: snapshot.collaboration.lastOperationId,
    })
    notify()
  }

  const start = () => {
    if (started || !sabSupported) {
      return
    }

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
