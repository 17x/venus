/// <reference lib="webworker" />

import {
  createCollaborationManager,
  type CollaborationOperation,
} from '../collaboration.ts'
import {
  getBoundingRectFromBezierPoints,
  nearestPointOnCurve,
  type BezierPoint,
  type DocumentNode,
  type EditorDocument,
} from '@venus/document-core'
import {
  createHistoryManager,
  type HistoryEntry,
  type HistoryPatch,
} from '../history.ts'
import {
  attachSceneMemory,
  clearHoveredShape,
  incrementSceneVersion,
  insertShapeIntoScene,
  readSceneStats,
  removeShapeFromScene,
  reorderShapeInScene,
  setHoveredShape,
  setSelectedShape,
  updatePointer,
  writeShapeToScene,
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
  typeof createSpatialIndex<{ shapeId: string; type: DocumentNode['type']; order: number }>
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
  const spatialIndex = createSpatialIndex<{
    shapeId: string
    type: DocumentNode['type']
    order: number
  }>()
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
      // The main thread already bootstraps from the initial document passed to
      // the controller, so init does not need to force an extra full snapshot
      // rebuild on the first worker message.
      postScene(scope, 'scene-ready', 'flags', scene, documentState, history, collaboration)
      return
    }

    if (!scene || !documentState) {
      return
    }

    if (message.type === 'pointerleave') {
      const changed = clearHoveredShape(scene)
      if (changed) {
        postScene(scope, 'scene-update', 'flags', scene, documentState, history, collaboration)
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
      postScene(scope, 'scene-update', 'full', scene, documentState, history, collaboration)
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
      postScene(scope, 'scene-update', 'full', scene, documentState, history, collaboration)
      return
    }

    updatePointer(scene, message.pointer)
    const targetIndex = hitTestDocument(documentState, spatialIndex, message.pointer)

    if (message.type === 'pointermove') {
      const changed = setHoveredShape(scene, targetIndex)
      if (changed) {
        postScene(scope, 'scene-update', 'flags', scene, documentState, history, collaboration)
      }
      return
    }

    const hoverChanged = setHoveredShape(scene, targetIndex)
    const selectionChanged = setSelectedShape(scene, targetIndex)

    if (hoverChanged || selectionChanged) {
      postScene(scope, 'scene-update', 'flags', scene, documentState, history, collaboration)
    }
  })
}

function clonePoints(points?: Array<{x: number; y: number}>) {
  return points?.map((point) => ({...point}))
}

function cloneBezierPoints(points?: BezierPoint[]) {
  return points?.map((point) => ({
    anchor: {...point.anchor},
    cp1: point.cp1 ? {...point.cp1} : point.cp1,
    cp2: point.cp2 ? {...point.cp2} : point.cp2,
  }))
}

function asPoint(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as {x?: unknown}).x !== 'number' ||
    typeof (value as {y?: unknown}).y !== 'number'
  ) {
    return null
  }

  return {
    x: Number((value as {x: number}).x),
    y: Number((value as {y: number}).y),
  }
}

function asBezierPoint(value: unknown): BezierPoint | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const anchor = asPoint(record.anchor)
  if (!anchor) {
    return null
  }

  return {
    anchor,
    cp1: asPoint(record.cp1),
    cp2: asPoint(record.cp2),
  }
}

function getPathBounds(points: Array<{x: number; y: number}>) {
  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function getBezierPathBounds(points: BezierPoint[]) {
  const bounds = getBoundingRectFromBezierPoints(points)

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function postScene(
  scope: DedicatedWorkerGlobalScope,
  type: SceneUpdateMessage['type'],
  updateKind: SceneUpdateMessage['updateKind'],
  scene: SceneMemory,
  document: EditorDocument,
  history: ReturnType<typeof createHistoryManager>,
  collaboration: ReturnType<typeof createCollaborationManager>,
) {
  scope.postMessage({
    type,
    updateKind,
    document: updateKind === 'full' ? document : undefined,
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
      applyPatches(scene, document, spatialIndex, transition.appliedEntry.backward)
    }
    return
  }

  if (command.type === 'history.redo') {
    const transition = history.redo()
    if (transition.appliedEntry) {
      applyPatches(scene, document, spatialIndex, transition.appliedEntry.forward)
    }
    return
  }

  const entry = createLocalHistoryEntry(command, scene, document)
  history.pushLocalEntry(entry)
  applyPatches(scene, document, spatialIndex, entry.forward)

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
  applyPatches(scene, document, spatialIndex, patches)

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
    const selectedShape = selectedIndex >= 0 ? document.shapes[selectedIndex] : null

    if (!selectedShape || selectedIndex <= 0) {
      return {
        id: 'selection.delete',
        label: 'Clear Selection',
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

    return {
      id: 'selection.delete',
      label: 'Delete Selection',
      forward: [
        {
          type: 'remove-shape',
          index: selectedIndex,
          shape: selectedShape,
        },
        {
          type: 'set-selected-index',
          prev: selectedIndex,
          next: -1,
        },
      ],
      backward: [
        {
          type: 'insert-shape',
          index: selectedIndex,
          shape: selectedShape,
        },
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

  if (command.type === 'shape.rename') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Rename Missing Shape')
    }

    const nextText = command.text ?? (shape.type === 'text' ? command.name : shape.text)
    return {
      id: `shape.rename.${shape.id}`,
      label: `Rename ${shape.name}`,
      forward: [
        {
          type: 'rename-shape',
          shapeId: shape.id,
          prevName: shape.name,
          nextName: command.name,
          prevText: shape.text,
          nextText,
        },
      ],
      backward: [
        {
          type: 'rename-shape',
          shapeId: shape.id,
          prevName: command.name,
          nextName: shape.name,
          prevText: nextText,
          nextText: shape.text,
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

  if (command.type === 'shape.reorder') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Reorder Missing Shape')
    }

    const fromIndex = document.shapes.findIndex((item) => item.id === shape.id)
    if (fromIndex < 0 || fromIndex === command.toIndex) {
      return createLogOnlyEntry(command.type, 'Reorder Shape')
    }

    return {
      id: `shape.reorder.${shape.id}`,
      label: `Reorder ${shape.name}`,
      forward: [
        {
          type: 'reorder-shape',
          shapeId: shape.id,
          fromIndex,
          toIndex: command.toIndex,
        },
      ],
      backward: [
        {
          type: 'reorder-shape',
          shapeId: shape.id,
          fromIndex: command.toIndex,
          toIndex: fromIndex,
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

  if (operation.type === 'shape.rename') {
    const shapeId = asString(operation.payload?.shapeId)
    const nextName = asString(operation.payload?.name)
    const nextText = asOptionalString(operation.payload?.text)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape || nextName === null) {
      return []
    }

    return [
      {
        type: 'rename-shape',
        shapeId: shape.id,
        prevName: shape.name,
        nextName,
        prevText: shape.text,
        nextText: nextText ?? (shape.type === 'text' ? nextName : shape.text),
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
    const shape = asDocumentNode(operation.payload?.shape)
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

  if (operation.type === 'shape.reorder') {
    const shapeId = asString(operation.payload?.shapeId)
    const toIndex = asNumber(operation.payload?.toIndex)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape || toIndex === null) {
      return []
    }

    return [
      {
        type: 'reorder-shape',
        shapeId: shape.id,
        fromIndex: document.shapes.findIndex((item) => item.id === shape.id),
        toIndex,
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
function applyPatches(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  patches: HistoryPatch[],
) {
  debugWorker('apply patches', patches)
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
      if (shape.type === 'path' && shape.points) {
        const deltaX = patch.nextX - patch.prevX
        const deltaY = patch.nextY - patch.prevY
        shape.points = shape.points.map((point) => ({
          x: point.x + deltaX,
          y: point.y + deltaY,
        }))
      }
      if (shape.type === 'path' && shape.bezierPoints) {
        const deltaX = patch.nextX - patch.prevX
        const deltaY = patch.nextY - patch.prevY
        shape.bezierPoints = shape.bezierPoints.map((point) => ({
          anchor: {
            x: point.anchor.x + deltaX,
            y: point.anchor.y + deltaY,
          },
          cp1: point.cp1
            ? {
                x: point.cp1.x + deltaX,
                y: point.cp1.y + deltaY,
              }
            : point.cp1,
          cp2: point.cp2
            ? {
                x: point.cp2.x + deltaX,
                y: point.cp2.y + deltaY,
              }
            : point.cp2,
        }))
      }
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeShapeToScene(scene, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      return
    }

    if (patch.type === 'rename-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.name = patch.nextName
      shape.text = patch.nextText
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeShapeToScene(scene, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      return
    }

    if (patch.type === 'resize-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      if (shape.type === 'path' && shape.points && shape.points.length > 0) {
        const scaleX = patch.prevWidth === 0 ? 1 : patch.nextWidth / patch.prevWidth
        const scaleY = patch.prevHeight === 0 ? 1 : patch.nextHeight / patch.prevHeight
        shape.points = shape.points.map((point) => ({
          x: shape.x + (point.x - shape.x) * scaleX,
          y: shape.y + (point.y - shape.y) * scaleY,
        }))
      }
      if (shape.type === 'path' && shape.bezierPoints && shape.bezierPoints.length > 0) {
        const scaleX = patch.prevWidth === 0 ? 1 : patch.nextWidth / patch.prevWidth
        const scaleY = patch.prevHeight === 0 ? 1 : patch.nextHeight / patch.prevHeight
        shape.bezierPoints = shape.bezierPoints.map((point) => ({
          anchor: {
            x: shape.x + (point.anchor.x - shape.x) * scaleX,
            y: shape.y + (point.anchor.y - shape.y) * scaleY,
          },
          cp1: point.cp1
            ? {
                x: shape.x + (point.cp1.x - shape.x) * scaleX,
                y: shape.y + (point.cp1.y - shape.y) * scaleY,
              }
            : point.cp1,
          cp2: point.cp2
            ? {
                x: shape.x + (point.cp2.x - shape.x) * scaleX,
                y: shape.y + (point.cp2.y - shape.y) * scaleY,
              }
            : point.cp2,
        }))
      }

      shape.width = patch.nextWidth
      shape.height = patch.nextHeight
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeShapeToScene(scene, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      return
    }

    if (patch.type === 'insert-shape') {
      document.shapes.splice(patch.index, 0, {
        ...patch.shape,
        type: patch.shape.type as DocumentNode['type'],
        text: patch.shape.text,
        assetId: patch.shape.assetId,
        assetUrl: patch.shape.assetUrl,
        points: clonePoints(patch.shape.points),
        bezierPoints: cloneBezierPoints(patch.shape.bezierPoints),
      })
      insertShapeIntoScene(scene, patch.index, document.shapes[patch.index])
      syncSpatialRange(spatialIndex, document, patch.index)
      return
    }

    if (patch.type === 'reorder-shape') {
      const currentIndex = document.shapes.findIndex((item) => item.id === patch.shapeId)
      if (currentIndex < 0) {
        return
      }

      const [shape] = document.shapes.splice(currentIndex, 1)
      const boundedIndex = Math.max(0, Math.min(patch.toIndex, document.shapes.length))
      document.shapes.splice(boundedIndex, 0, shape)
      reorderShapeInScene(scene, currentIndex, boundedIndex)
      syncSpatialRange(
        spatialIndex,
        document,
        Math.min(currentIndex, boundedIndex),
        Math.max(currentIndex, boundedIndex),
      )
      return
    }

    if (patch.type === 'remove-shape') {
      spatialIndex.remove(patch.shape.id)
      document.shapes.splice(patch.index, 1)
      removeShapeFromScene(scene, patch.index)
      syncSpatialRange(spatialIndex, document, patch.index)
    }
  })

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
    document.shapes.map((shape, order) => createSpatialItem(shape, order)),
  )
}

function createSpatialItem(shape: DocumentNode, order: number) {
  return {
    id: shape.id,
    minX: shape.x,
    minY: shape.y,
    maxX: shape.x + shape.width,
    maxY: shape.y + shape.height,
    meta: {
      shapeId: shape.id,
      type: shape.type,
      order,
    },
  }
}

function updateSpatialShape(
  spatialIndex: WorkerSpatialIndex,
  document: EditorDocument,
  shapeId: string,
) {
  const index = document.shapes.findIndex((shape) => shape.id === shapeId)
  if (index < 0) {
    return
  }

  spatialIndex.update(createSpatialItem(document.shapes[index], index))
}

function syncSpatialRange(
  spatialIndex: WorkerSpatialIndex,
  document: EditorDocument,
  startIndex: number,
  endIndex = document.shapes.length - 1,
) {
  const boundedStart = Math.max(0, startIndex)
  const boundedEnd = Math.min(endIndex, document.shapes.length - 1)

  if (boundedEnd < boundedStart) {
    return
  }

  for (let index = boundedStart; index <= boundedEnd; index += 1) {
    spatialIndex.update(createSpatialItem(document.shapes[index], index))
  }
}

/**
 * Two-stage hit test:
 * 1. R-tree gives candidate indices by bounding box
 * 2. worker performs exact shape filtering (ellipse / line segment / rect)
 *
 * If the index returns nothing useful, we gracefully fall back to `-1`.
 */
const LINE_HIT_TOLERANCE = 6
const PATH_HIT_TOLERANCE = 6

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

  const sortedCandidates = [...candidates].sort((left, right) => right.meta.order - left.meta.order)

  for (const candidate of sortedCandidates) {
    const shape = findShapeById(document, candidate.meta.shapeId)
    if (!shape) {
      continue
    }

    const hitTolerance =
      shape.type === 'lineSegment'
        ? LINE_HIT_TOLERANCE
        : shape.type === 'path'
          ? PATH_HIT_TOLERANCE
          : 0
    const inBounds =
      pointer.x >= shape.x - hitTolerance &&
      pointer.x <= shape.x + shape.width + hitTolerance &&
      pointer.y >= shape.y - hitTolerance &&
      pointer.y <= shape.y + shape.height + hitTolerance

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

    if (shape.type === 'lineSegment') {
      const lineHit = isPointNearLineSegment(pointer, {
        x1: shape.x,
        y1: shape.y,
        x2: shape.x + shape.width,
        y2: shape.y + shape.height,
      }, LINE_HIT_TOLERANCE)

      if (!lineHit) {
        continue
      }
    }

    if (shape.type === 'path') {
      const hasBezierPath = !!shape.bezierPoints && shape.bezierPoints.length >= 2
      const hasPolylinePath = !!shape.points && shape.points.length >= 2

      if (hasBezierPath) {
        const curveHit = isPointNearBezierPath(
          pointer,
          shape.bezierPoints!,
          PATH_HIT_TOLERANCE,
        )

        if (!curveHit) {
          continue
        }
      } else if (hasPolylinePath) {
        const lineHit = isPointNearPolyline(
          pointer,
          shape.points!,
          PATH_HIT_TOLERANCE,
        )

        if (!lineHit) {
          continue
        }
      }
    }

    return document.shapes.findIndex((item) => item.id === shape.id)
  }

  return -1
}

function isPointNearLineSegment(
  pointer: {x: number; y: number},
  line: {x1: number; y1: number; x2: number; y2: number},
  tolerance = 6,
) {
  const dx = line.x2 - line.x1
  const dy = line.y2 - line.y1
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    const distanceSquared =
      (pointer.x - line.x1) * (pointer.x - line.x1) +
      (pointer.y - line.y1) * (pointer.y - line.y1)
    return distanceSquared <= tolerance * tolerance
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((pointer.x - line.x1) * dx + (pointer.y - line.y1) * dy) / lengthSquared,
    ),
  )
  const nearestX = line.x1 + t * dx
  const nearestY = line.y1 + t * dy
  const distanceSquared =
    (pointer.x - nearestX) * (pointer.x - nearestX) +
    (pointer.y - nearestY) * (pointer.y - nearestY)

  return distanceSquared <= tolerance * tolerance
}

function isPointNearPolyline(
  pointer: {x: number; y: number},
  points: Array<{x: number; y: number}>,
  tolerance = 6,
) {
  for (let index = 1; index < points.length; index += 1) {
    if (
      isPointNearLineSegment(pointer, {
        x1: points[index - 1].x,
        y1: points[index - 1].y,
        x2: points[index].x,
        y2: points[index].y,
      }, tolerance)
    ) {
      return true
    }
  }

  return false
}

function isPointNearBezierPath(
  pointer: {x: number; y: number},
  points: BezierPoint[],
  tolerance = 6,
) {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const nearest = nearestPointOnCurve(
      previous.anchor,
      previous.cp2 ?? null,
      current.cp1 ?? null,
      current.anchor,
      pointer,
      32,
    )
    const dx = nearest.x - pointer.x
    const dy = nearest.y - pointer.y

    if (dx * dx + dy * dy <= tolerance * tolerance) {
      return true
    }
  }

  return false
}

function cloneDocument(document: EditorDocument): EditorDocument {
  return {
    ...document,
    shapes: document.shapes.map((shape) => ({
      ...shape,
      points: clonePoints(shape.points),
      bezierPoints: cloneBezierPoints(shape.bezierPoints),
      assetId: shape.assetId,
      assetUrl: shape.assetUrl,
    })),
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

  if (command.type === 'shape.rename') {
    return {
      shapeId: command.shapeId,
      name: command.name,
      text: command.text,
    }
  }

  if (command.type === 'shape.resize') {
    return {
      shapeId: command.shapeId,
      width: command.width,
      height: command.height,
    }
  }

  if (command.type === 'shape.reorder') {
    return {
      shapeId: command.shapeId,
      toIndex: command.toIndex,
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

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

function asDocumentNode(value: unknown): DocumentNode | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const id = asString(record.id)
  const type = asString(record.type)
  const name = asString(record.name)
  const text = asOptionalString(record.text)
  const assetId = asOptionalString(record.assetId)
  const assetUrl = asOptionalString(record.assetUrl)
  const x = asNumber(record.x)
  const y = asNumber(record.y)
  const width = asNumber(record.width)
  const height = asNumber(record.height)

  if (!id || !type || !name || x === null || y === null || width === null || height === null) {
    return null
  }

  const points = Array.isArray(record.points)
    ? record.points
        .map((point) =>
          point && typeof point === 'object' &&
          typeof (point as {x?: unknown}).x === 'number' &&
          typeof (point as {y?: unknown}).y === 'number'
            ? {
                x: Number((point as {x: number}).x),
                y: Number((point as {y: number}).y),
              }
            : null,
        )
        .filter((point): point is {x: number; y: number} => point !== null)
    : undefined
  const bezierPoints = Array.isArray(record.bezierPoints)
    ? record.bezierPoints
        .map((point) => asBezierPoint(point))
        .filter((point): point is BezierPoint => point !== null)
    : undefined
  const nextBounds = type === 'path' && points && points.length > 0
    ? getPathBounds(points)
    : type === 'path' && bezierPoints && bezierPoints.length > 0
      ? getBezierPathBounds(bezierPoints)
      : null

  return {
    id,
    type: type as DocumentNode['type'],
    name,
    text,
    assetId,
    assetUrl,
    x: nextBounds?.x ?? x,
    y: nextBounds?.y ?? y,
    width: nextBounds?.width ?? width,
    height: nextBounds?.height ?? height,
    points,
    bezierPoints,
  }
}
