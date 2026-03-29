/// <reference lib="webworker" />

import {
  createCollaborationManager,
  type CollaborationOperation,
} from '@venus/collaboration'
import type { EditorDocument, ShapeRecord } from '@venus/editor-core'
import {
  createHistoryManager,
  type HistoryEntry,
  type HistoryPatch,
} from '@venus/history'
import {
  attachSceneMemory,
  clearHoveredShape,
  readSceneStats,
  setHoveredShape,
  setSelectedShape,
  updatePointer,
  writeDocumentToScene,
  type SceneMemory,
} from '@venus/shared-memory'
import { createSpatialIndex } from '@venus/spatial-index'
import type {
  EditorRuntimeCommand,
  EditorWorkerMessage,
  SceneUpdateMessage,
} from '../protocol.ts'

/**
 * Development trace helper for worker-side execution. This keeps debug output
 * consistent while we are still wiring command/history/collaboration flow.
 */
function debugWorker(message: string, details?: unknown) {
  console.debug('EDITOR-WORKER', message, details)
}

type WorkerSpatialIndex = ReturnType<
  typeof createSpatialIndex<{ index: number; type: ShapeRecord['type'] }>
>

/**
 * Worker entry for the current vector editor implementation.
 *
 * Boundary:
 * - Receives low-level runtime messages from `canvas-base`
 * - Applies local commands and remote operations to the current scene
 * - Coordinates local history and collaboration state
 *
 * This file is intentionally worker-specific. `canvas-base` should only know
 * how to talk to a worker, not how this editor interprets commands.
 */
export function bindEditorWorkerScope(scope: DedicatedWorkerGlobalScope) {
  let scene: SceneMemory | null = null
  let documentState: EditorDocument | null = null
  // The worker owns the coarse spatial index because hit-testing belongs to
  // execution/data flow, not the UI shell or app layer.
  const spatialIndex = createSpatialIndex<{ index: number; type: ShapeRecord['type'] }>()
  const history = createHistoryManager([
    {
      id: 'init',
      label: 'Init',
      forward: [],
      backward: [],
    },
  ])
  const collaboration = createCollaborationManager()

  collaboration.connect('local-user')

  scope.addEventListener('message', (event: MessageEvent<EditorWorkerMessage>) => {
    const message = event.data

    if (message.type === 'init') {
      scene = attachSceneMemory(message.buffer, message.capacity)
      documentState = cloneDocument(message.document)
      debugWorker('init scene', {
        capacity: message.capacity,
        shapeCount: documentState.shapes.length,
      })
      writeDocumentToScene(scene, documentState)
      rebuildSpatialIndex(spatialIndex, documentState)
      history.pushLocalEntry({
        id: 'scene-ready',
        label: 'Load Scene',
        forward: [],
        backward: [],
      })
      postScene(scope, 'scene-ready', scene, documentState, history, collaboration)
      return
    }

    if (!scene || !documentState) {
      return
    }

    if (message.type === 'pointerleave') {
      const changed = clearHoveredShape(scene)
      if (changed) {
        postScene(scope, 'scene-update', scene, documentState, history, collaboration)
      }
      return
    }

    if (message.type === 'collaboration.receive') {
      handleRemoteOperation(
        message.operation,
        scene,
        documentState,
        spatialIndex,
        history,
        collaboration,
      )
      postScene(scope, 'scene-update', scene, documentState, history, collaboration)
      return
    }

    if (message.type === 'command') {
      handleLocalCommand(
        message.command,
        scene,
        documentState,
        spatialIndex,
        history,
        collaboration,
      )
      postScene(scope, 'scene-update', scene, documentState, history, collaboration)
      return
    }

    updatePointer(scene, message.pointer)
    const targetIndex = hitTestDocument(documentState, spatialIndex, message.pointer)

    if (message.type === 'pointermove') {
      const changed = setHoveredShape(scene, targetIndex)
      if (changed) {
        postScene(scope, 'scene-update', scene, documentState, history, collaboration)
      }
      return
    }

    const hoverChanged = setHoveredShape(scene, targetIndex)
    const selectionChanged = setSelectedShape(scene, targetIndex)

    if (hoverChanged || selectionChanged) {
      postScene(scope, 'scene-update', scene, documentState, history, collaboration)
    }
  })
}

function postScene(
  scope: DedicatedWorkerGlobalScope,
  type: SceneUpdateMessage['type'],
  scene: SceneMemory,
  document: EditorDocument,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
) {
  scope.postMessage({
    type,
    document,
    stats: readSceneStats(scene),
    history: history.getSummary(),
    collaboration: collaboration.getState(),
  } satisfies SceneUpdateMessage)
}

/**
 * Local commands represent user intent coming from menu, keyboard, toolbar,
 * or pointer interactions. The worker turns those intents into:
 *
 * - state mutations
 * - reversible local history patches
 * - collaboration operations that could be sent to the server later
 */
function handleLocalCommand(
  command: EditorRuntimeCommand,
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
) {
  debugWorker('local command', command)

  if (command.type === 'selection.set') {
    const nextIndex =
      command.shapeId === null
        ? -1
        : document.shapes.findIndex((shape) => shape.id === command.shapeId)
    setSelectedShape(scene, nextIndex)
    return
  }

  if (command.type === 'history.undo') {
    const transition = history.undo()
    if (transition.appliedEntry) {
      applyPatches(scene, document, transition.appliedEntry.backward)
    }
    return
  }

  if (command.type === 'history.redo') {
    const transition = history.redo()
    if (transition.appliedEntry) {
      applyPatches(scene, document, transition.appliedEntry.forward)
    }
    return
  }

  const entry = createLocalHistoryEntry(command, scene, document)
  history.pushLocalEntry(entry)
  applyPatches(scene, document, entry.forward)
  rebuildSpatialIndex(spatialIndex, document)

  const operation = createLocalOperation(command, collaboration.getState().actorId)
  collaboration.recordLocalOperation(operation)
}

/**
 * Remote operations come from the collaboration layer, not the local undo
 * stack. They still mutate the same runtime state, but are recorded separately
 * so local undo does not roll back another user's work.
 */
function handleRemoteOperation(
  operation: CollaborationOperation,
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
) {
  debugWorker('remote operation', operation)
  collaboration.receiveRemoteOperation(operation)

  const patches = createRemotePatches(operation, scene, document)
  applyPatches(scene, document, patches)
  rebuildSpatialIndex(spatialIndex, document)

  history.pushRemoteEntry({
    id: operation.id,
    label: `Remote ${operation.type}`,
    forward: patches,
    backward: [],
  })
}

function createLocalHistoryEntry(
  command: EditorRuntimeCommand,
  scene: SceneMemory,
  document: EditorDocument,
): Omit<HistoryEntry, 'source'> {
  if (command.type === 'selection.delete') {
    const selectedIndex = readSceneStats(scene).selectedIndex
    return {
      id: 'selection.delete',
      label: 'Delete Selection',
      forward: [
        {
          type: 'set-selected-index',
          prev: selectedIndex,
          next: -1,
        },
      ],
      backward: [
        {
          type: 'set-selected-index',
          prev: -1,
          next: selectedIndex,
        },
      ],
    }
  }

  if (command.type === 'shape.move') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Move Missing Shape')
    }

    return {
      id: `shape.move.${shape.id}`,
      label: `Move ${shape.name}`,
      forward: [
        {
          type: 'move-shape',
          shapeId: shape.id,
          prevX: shape.x,
          prevY: shape.y,
          nextX: command.x,
          nextY: command.y,
        },
      ],
      backward: [
        {
          type: 'move-shape',
          shapeId: shape.id,
          prevX: command.x,
          prevY: command.y,
          nextX: shape.x,
          nextY: shape.y,
        },
      ],
    }
  }

  if (command.type === 'shape.resize') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Resize Missing Shape')
    }

    return {
      id: `shape.resize.${shape.id}`,
      label: `Resize ${shape.name}`,
      forward: [
        {
          type: 'resize-shape',
          shapeId: shape.id,
          prevWidth: shape.width,
          prevHeight: shape.height,
          nextWidth: command.width,
          nextHeight: command.height,
        },
      ],
      backward: [
        {
          type: 'resize-shape',
          shapeId: shape.id,
          prevWidth: command.width,
          prevHeight: command.height,
          nextWidth: shape.width,
          nextHeight: shape.height,
        },
      ],
    }
  }

  if (command.type === 'shape.insert') {
    const index = command.index ?? document.shapes.length
    debugWorker('prepare insert patch', {
      shapeId: command.shape.id,
      index,
    })
    return {
      id: `shape.insert.${command.shape.id}`,
      label: `Insert ${command.shape.name}`,
      forward: [
        {
          type: 'insert-shape',
          index,
          shape: command.shape,
        },
      ],
      backward: [
        {
          type: 'remove-shape',
          index,
          shape: command.shape,
        },
      ],
    }
  }

  if (command.type === 'shape.remove') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Remove Missing Shape')
    }

    const index = document.shapes.findIndex((item) => item.id === shape.id)
    return {
      id: `shape.remove.${shape.id}`,
      label: `Remove ${shape.name}`,
      forward: [
        {
          type: 'remove-shape',
          index,
          shape,
        },
      ],
      backward: [
        {
          type: 'insert-shape',
          index,
          shape,
        },
      ],
    }
  }

  if (command.type === 'viewport.zoomIn') {
    return createLogOnlyEntry('viewport.zoomIn', 'Zoom In')
  }

  if (command.type === 'viewport.zoomOut') {
    return createLogOnlyEntry('viewport.zoomOut', 'Zoom Out')
  }

  if (command.type === 'viewport.fit') {
    return createLogOnlyEntry('viewport.fit', 'Fit Content')
  }

  if (command.type === 'tool.select') {
    return createLogOnlyEntry(`tool.${command.tool}`, `Select Tool: ${command.tool}`)
  }

  if (command.type === 'selection.set') {
    return createLogOnlyEntry('selection.set', 'Set Selection')
  }

  return createLogOnlyEntry(command.type, command.type)
}

function createLogOnlyEntry(id: string, label: string): Omit<HistoryEntry, 'source'> {
  return {
    id,
    label,
    forward: [],
    backward: [],
  }
}

function createLocalOperation(
  command: EditorRuntimeCommand,
  actorId: string,
): CollaborationOperation {
  return {
    id: `${command.type}:${Date.now()}`,
    type: command.type,
    actorId,
    payload: getCommandPayload(command),
  }
}

function createRemotePatches(
  operation: CollaborationOperation,
  scene: SceneMemory,
  document: EditorDocument,
): HistoryPatch[] {
  if (operation.type === 'selection.delete') {
    return [
      {
        type: 'set-selected-index',
        prev: readSceneStats(scene).selectedIndex,
        next: -1,
      },
    ]
  }

  if (operation.type === 'shape.move') {
    const shapeId = asString(operation.payload?.shapeId)
    const nextX = asNumber(operation.payload?.x)
    const nextY = asNumber(operation.payload?.y)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape || nextX === null || nextY === null) {
      return []
    }

    return [
      {
        type: 'move-shape',
        shapeId: shape.id,
        prevX: shape.x,
        prevY: shape.y,
        nextX,
        nextY,
      },
    ]
  }

  if (operation.type === 'shape.resize') {
    const shapeId = asString(operation.payload?.shapeId)
    const nextWidth = asNumber(operation.payload?.width)
    const nextHeight = asNumber(operation.payload?.height)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape || nextWidth === null || nextHeight === null) {
      return []
    }

    return [
      {
        type: 'resize-shape',
        shapeId: shape.id,
        prevWidth: shape.width,
        prevHeight: shape.height,
        nextWidth,
        nextHeight,
      },
    ]
  }

  if (operation.type === 'shape.insert') {
    const shape = asShapeRecord(operation.payload?.shape)
    const index = asNumber(operation.payload?.index) ?? document.shapes.length

    if (!shape) {
      return []
    }

    return [
      {
        type: 'insert-shape',
        index,
        shape,
      },
    ]
  }

  if (operation.type === 'shape.remove') {
    const shapeId = asString(operation.payload?.shapeId)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape) {
      return []
    }

    return [
      {
        type: 'remove-shape',
        index: document.shapes.findIndex((item) => item.id === shape.id),
        shape,
      },
    ]
  }

  return []
}

/**
 * Applies concrete state differences to the current worker scene.
 *
 * This is the shared execution point used by:
 * - local history redo
 * - local history undo
 * - remote collaboration apply
 *
 * Keeping all patch application here helps local and remote changes converge on
 * the same scene mutation path.
 */
function applyPatches(scene: SceneMemory, document: EditorDocument, patches: HistoryPatch[]) {
  debugWorker('apply patches', patches)
  let shouldRewriteScene = false
  const selectionPatches: HistoryPatch[] = []

  patches.forEach((patch) => {
    if (patch.type === 'set-selected-index') {
      selectionPatches.push(patch)
      return
    }

    if (patch.type === 'move-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.x = patch.nextX
      shape.y = patch.nextY
      shouldRewriteScene = true
      return
    }

    if (patch.type === 'resize-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.width = patch.nextWidth
      shape.height = patch.nextHeight
      shouldRewriteScene = true
      return
    }

    if (patch.type === 'insert-shape') {
      document.shapes.splice(patch.index, 0, {
        ...patch.shape,
        type: patch.shape.type as ShapeRecord['type'],
      })
      shouldRewriteScene = true
      return
    }

    if (patch.type === 'remove-shape') {
      document.shapes.splice(patch.index, 1)
      shouldRewriteScene = true
    }
  })

  if (shouldRewriteScene) {
    writeDocumentToScene(scene, document)
  }

  selectionPatches.forEach((patch) => {
    if (patch.type === 'set-selected-index') {
      setSelectedShape(scene, patch.next)
    }
  })
}

/**
 * Rebuilds the coarse spatial index from the current document state.
 *
 * This is intentionally simple for now. Once mutation volume grows, we can
 * move to incremental insert/update/remove instead of full rebuilds.
 */
function rebuildSpatialIndex(
  spatialIndex: WorkerSpatialIndex,
  document: EditorDocument,
) {
  spatialIndex.load(
    document.shapes.map((shape, index) => ({
      id: shape.id,
      minX: shape.x,
      minY: shape.y,
      maxX: shape.x + shape.width,
      maxY: shape.y + shape.height,
      meta: {
        index,
        type: shape.type,
      },
    })),
  )
}

/**
 * Two-stage hit test:
 * 1. R-tree gives candidate indices by bounding box
 * 2. worker performs exact shape filtering (ellipse vs rectangle/frame)
 *
 * If the index returns nothing useful, we gracefully fall back to `-1`.
 */
function hitTestDocument(
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  pointer: { x: number; y: number },
) {
  const candidates = spatialIndex.search({
    minX: pointer.x,
    minY: pointer.y,
    maxX: pointer.x,
    maxY: pointer.y,
  })

  const sortedCandidates = [...candidates].sort((left, right) => right.meta.index - left.meta.index)

  for (const candidate of sortedCandidates) {
    const shape = document.shapes[candidate.meta.index]
    if (!shape) {
      continue
    }

    const inBounds =
      pointer.x >= shape.x &&
      pointer.x <= shape.x + shape.width &&
      pointer.y >= shape.y &&
      pointer.y <= shape.y + shape.height

    if (!inBounds) {
      continue
    }

    if (shape.type === 'ellipse') {
      const radiusX = shape.width / 2
      const radiusY = shape.height / 2
      const centerX = shape.x + radiusX
      const centerY = shape.y + radiusY
      const normalized =
        ((pointer.x - centerX) * (pointer.x - centerX)) / (radiusX * radiusX) +
        ((pointer.y - centerY) * (pointer.y - centerY)) / (radiusY * radiusY)

      if (normalized > 1) {
        continue
      }
    }

    return candidate.meta.index
  }

  return -1
}

function cloneDocument(document: EditorDocument): EditorDocument {
  return {
    ...document,
    shapes: document.shapes.map((shape) => ({ ...shape })),
  }
}

function findShapeById(document: EditorDocument, shapeId: string) {
  return document.shapes.find((shape) => shape.id === shapeId) ?? null
}

function getCommandPayload(command: EditorRuntimeCommand): CollaborationOperation['payload'] {
  if (command.type === 'tool.select') {
    return { tool: command.tool }
  }

  if (command.type === 'shape.move') {
    return {
      shapeId: command.shapeId,
      x: command.x,
      y: command.y,
    }
  }

  if (command.type === 'shape.resize') {
    return {
      shapeId: command.shapeId,
      width: command.width,
      height: command.height,
    }
  }

  if (command.type === 'shape.insert') {
    return {
      shape: command.shape,
      index: command.index,
    }
  }

  if (command.type === 'shape.remove') {
    return {
      shapeId: command.shapeId,
    }
  }

  return undefined
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

function asShapeRecord(value: unknown): ShapeRecord | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const id = asString(record.id)
  const type = asString(record.type)
  const name = asString(record.name)
  const x = asNumber(record.x)
  const y = asNumber(record.y)
  const width = asNumber(record.width)
  const height = asNumber(record.height)

  if (!id || !type || !name || x === null || y === null || width === null || height === null) {
    return null
  }

  return {
    id,
    type: type as ShapeRecord['type'],
    name,
    x,
    y,
    width,
    height,
  }
}
