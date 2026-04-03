import type {EditorDocument} from '@venus/document-core'
import type {EditorRuntimeCommand} from '@venus/editor-worker'
import type {PointerState, SceneShapeSnapshot, SceneStats} from '@venus/shared-memory'
import type {Point2D} from '../viewport/matrix.ts'
import {
  DEFAULT_VIEWPORT,
  fitViewportToDocument,
  panViewportState,
  resizeViewportState,
  zoomViewportState,
} from '../viewport/controller.ts'
import type {CanvasViewportState} from '../viewport/types.ts'

export interface CanvasViewerSnapshot<TDocument extends EditorDocument> {
  document: TDocument
  ready: boolean
  shapes: SceneShapeSnapshot[]
  stats: SceneStats
  viewport: CanvasViewportState
}

export interface CanvasViewerControllerOptions<TDocument extends EditorDocument> {
  document: TDocument
  enableHitTest?: boolean
  selectOnPointerDown?: boolean
}

export interface CanvasViewerController<TDocument extends EditorDocument> {
  clearHover: () => void
  destroy: () => void
  dispatchCommand: (command: EditorRuntimeCommand) => void
  fitViewport: () => void
  getSnapshot: () => CanvasViewerSnapshot<TDocument>
  panViewport: (deltaX: number, deltaY: number) => void
  postPointer: (type: 'pointermove' | 'pointerdown', pointer: PointerState) => void
  resizeViewport: (width: number, height: number) => void
  start: () => void
  subscribe: (listener: () => void) => () => void
  zoomViewport: (nextScale: number, anchor?: Point2D) => void
}

function debugViewer(message: string, details?: unknown) {
  console.debug('CANVAS-BASE-VIEWER', message, details)
}

export function createCanvasViewerController<TDocument extends EditorDocument>({
  document,
  enableHitTest = true,
  selectOnPointerDown = false,
}: CanvasViewerControllerOptions<TDocument>): CanvasViewerController<TDocument> {
  const listeners = new Set<VoidFunction>()
  let version = 0

  const snapshot: CanvasViewerSnapshot<TDocument> = {
    document,
    ready: true,
    shapes: document.shapes.map((shape) => ({
      ...shape,
      isHovered: false,
      isSelected: false,
    })),
    stats: {
      version,
      shapeCount: document.shapes.length,
      hoveredIndex: -1,
      selectedIndex: -1,
    },
    viewport: DEFAULT_VIEWPORT,
  }

  const notify = () => {
    listeners.forEach((listener) => listener())
  }

  const bumpVersion = () => {
    version += 1
    snapshot.stats = {
      ...snapshot.stats,
      version,
    }
  }

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
    if (width === snapshot.viewport.viewportWidth && height === snapshot.viewport.viewportHeight) {
      return
    }

    const hadViewport = snapshot.viewport.viewportWidth > 0 && snapshot.viewport.viewportHeight > 0

    if (!hadViewport) {
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

  const updateHoverSelection = (hoveredIndex: number, selectedIndex: number) => {
    if (
      hoveredIndex === snapshot.stats.hoveredIndex &&
      selectedIndex === snapshot.stats.selectedIndex
    ) {
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
    bumpVersion()
    notify()
  }

  const clearHover = () => {
    if (snapshot.stats.hoveredIndex < 0) {
      return
    }

    updateHoverSelection(-1, snapshot.stats.selectedIndex)
  }

  const postPointer = (type: 'pointermove' | 'pointerdown', pointer: PointerState) => {
    if (!enableHitTest) {
      return
    }

    const hoveredIndex = hitTestDocument(snapshot.shapes, pointer)
    if (type === 'pointermove') {
      updateHoverSelection(hoveredIndex, snapshot.stats.selectedIndex)
      return
    }

    if (type === 'pointerdown' && selectOnPointerDown) {
      updateHoverSelection(hoveredIndex, hoveredIndex)
      return
    }

    updateHoverSelection(hoveredIndex, snapshot.stats.selectedIndex)
  }

  const dispatchCommand = (command: EditorRuntimeCommand) => {
    if (command.type === 'viewport.zoomIn') {
      zoomViewport(snapshot.viewport.scale * 1.1)
      return
    }

    if (command.type === 'viewport.zoomOut') {
      zoomViewport(snapshot.viewport.scale / 1.1)
      return
    }

    if (command.type === 'viewport.fit') {
      fitViewport()
      return
    }

    debugViewer('ignore non-viewport command in viewer mode', command)
  }

  return {
    clearHover,
    destroy: () => {
      listeners.clear()
    },
    dispatchCommand,
    fitViewport,
    getSnapshot: () => snapshot,
    panViewport,
    postPointer,
    resizeViewport,
    start: () => {},
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    zoomViewport,
  }
}

function hitTestDocument(shapes: SceneShapeSnapshot[], pointer: PointerState) {
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    const shape = shapes[index]
    const left = Math.min(shape.x, shape.x + shape.width)
    const right = Math.max(shape.x, shape.x + shape.width)
    const top = Math.min(shape.y, shape.y + shape.height)
    const bottom = Math.max(shape.y, shape.y + shape.height)

    if (
      pointer.x >= left &&
      pointer.x <= right &&
      pointer.y >= top &&
      pointer.y <= bottom
    ) {
      return index
    }
  }

  return -1
}
