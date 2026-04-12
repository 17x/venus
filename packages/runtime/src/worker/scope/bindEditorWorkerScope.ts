/// <reference lib="webworker" />

import {
  createCollaborationManager,
  type CollaborationOperation,
} from '../collaboration.ts'
import {
  getBoundingRectFromBezierPoints,
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
  createEngineSpatialIndex,
  getNormalizedBoundsFromBox,
  intersectNormalizedBounds,
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
  toLegacyShapeTransformRecord,
  type EngineSpatialIndex,
  type EngineSpatialItem,
  type MatrixFirstNodeTransform,
  type ShapeTransformRecord,
} from '@venus/engine'
import {
  attachSceneMemory,
  getSelectedShapeIndices,
  incrementSceneVersion,
  insertShapeIntoScene,
  readSceneStats,
  removeShapeFromScene,
  reorderShapeInScene,
  setSelectedShape,
  setSelectedShapes,
  updatePointer,
  writeShapeToScene,
  writeDocumentToScene,
  type SceneSelectionMode,
  type SceneMemory,
} from '@venus/shared-memory'
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

type WorkerSpatialIndex = EngineSpatialIndex<{
  shapeId: string
  type: DocumentNode['type']
  order: number
}>

/**
 * Worker entry for the current vector editor implementation.
 *
 * Boundary:
 * - Receives low-level runtime messages from the shared runtime stack
 * - Applies local commands and remote operations to the current scene
 * - Coordinates local history and collaboration state
 *
 * This file is intentionally worker-specific. Shared runtime packages should
 * only know how to talk to a worker, not how this editor interprets commands.
 */
export function bindEditorWorkerScope(scope: DedicatedWorkerGlobalScope) {
  let scene: SceneMemory | null = null
  let documentState: EditorDocument | null = null
  let allowFrameSelection = true
  let strictStrokeHitTest = false
  // The worker owns the coarse spatial index because hit-testing belongs to
  // execution/data flow, not the UI shell or app layer.
  const spatialIndex = createEngineSpatialIndex<{
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
      allowFrameSelection = message.interaction?.allowFrameSelection ?? true
      strictStrokeHitTest = message.interaction?.strictStrokeHitTest ?? false
      debugWorker('init scene', {
        capacity: message.capacity,
        shapeCount: documentState.shapes.length,
        allowFrameSelection,
        strictStrokeHitTest,
      })
      writeDocumentToScene(scene, documentState)
      rebuildSpatialIndex(spatialIndex, documentState)
      syncClippedImageRuntimeGeometry(scene, documentState, spatialIndex)
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
      // Hover state is overlay-owned; pointerleave should not mutate scene flags.
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

    if (message.type === 'pointermove') {
      // Hover feedback is app-layer only and should not trigger scene updates.
      return
    }

    const targetIndex = hitTestDocument(
      documentState,
      spatialIndex,
      message.pointer,
      {allowFrameSelection, strictStrokeHitTest},
    )

    const selectionMode = resolvePointerSelectionMode(message.modifiers)
    const selectionChanged =
      targetIndex < 0
        ? setSelectedShapes(scene, [], selectionMode === 'replace' ? 'clear' : selectionMode)
        : setSelectedShapes(scene, [targetIndex], selectionMode)

    if (selectionChanged) {
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

function cloneFill(fill?: DocumentNode['fill']) {
  return fill ? {...fill} : undefined
}

function cloneStroke(stroke?: DocumentNode['stroke']) {
  return stroke ? {...stroke} : undefined
}

function cloneShadow(shadow?: DocumentNode['shadow']) {
  return shadow ? {...shadow} : undefined
}

function cloneCornerRadii(cornerRadii?: DocumentNode['cornerRadii']) {
  return cornerRadii ? {...cornerRadii} : undefined
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

function resolvePointerSelectionMode(
  modifiers?: {shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean},
): SceneSelectionMode {
  if (modifiers?.altKey) {
    return 'remove'
  }

  if (modifiers?.shiftKey) {
    return 'add'
  }

  if (modifiers?.metaKey || modifiers?.ctrlKey) {
    return 'toggle'
  }

  return 'replace'
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
    const mode = command.mode ?? 'replace'
    const ids = Array.isArray(command.shapeIds)
      ? command.shapeIds
      : command.shapeId === undefined
        ? []
        : [command.shapeId]
    const indices = ids
      .map((shapeId) => (shapeId ? document.shapes.findIndex((shape) => shape.id === shapeId) : -1))
      .filter((index) => index >= 0)

    if (mode === 'clear' || (ids.length === 1 && ids[0] === null)) {
      setSelectedShapes(scene, [], 'clear')
      return
    }

    setSelectedShapes(scene, indices, mode)
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
    const selectedIndices = getSelectedShapeIndices(scene).sort((left, right) => left - right)
    const selectedShapes = selectedIndices
      .map((index) => ({index, shape: document.shapes[index]}))
      .filter((item): item is {index: number; shape: DocumentNode} => Boolean(item.shape))

    if (selectedShapes.length === 0) {
      return {
        id: 'selection.delete',
        label: 'Clear Selection',
        forward: [
          {
            type: 'set-selected-index',
            prev: readSceneStats(scene).selectedIndex,
            next: -1,
          },
        ],
        backward: [
          {
            type: 'set-selected-index',
            prev: -1,
            next: readSceneStats(scene).selectedIndex,
          },
        ],
      }
    }

    return {
      id: 'selection.delete',
      label: 'Delete Selection',
      forward: [
        ...selectedShapes
          .slice()
          .sort((left, right) => right.index - left.index)
          .map(({index, shape}) => ({
            type: 'remove-shape' as const,
            index,
            shape,
          })),
        {
          type: 'set-selected-index',
          prev: readSceneStats(scene).selectedIndex,
          next: -1,
        },
      ],
      backward: [
        ...selectedShapes.map(({index, shape}) => ({
          type: 'insert-shape' as const,
          index,
          shape,
        })),
        {
          type: 'set-selected-index',
          prev: -1,
          next: readSceneStats(scene).selectedIndex,
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

  if (command.type === 'shape.rotate') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Rotate Missing Shape')
    }

    const previousRotation = shape.rotation ?? 0

    return {
      id: `shape.rotate.${shape.id}`,
      label: `Rotate ${shape.name}`,
      forward: [
        {
          type: 'rotate-shape',
          shapeId: shape.id,
          prevRotation: previousRotation,
          nextRotation: command.rotation,
        },
      ],
      backward: [
        {
          type: 'rotate-shape',
          shapeId: shape.id,
          prevRotation: command.rotation,
          nextRotation: previousRotation,
        },
      ],
    }
  }

  if (command.type === 'shape.rotate.batch') {
    const candidates = command.rotations
      .map((item) => ({
        shape: findShapeById(document, item.shapeId),
        nextRotation: item.rotation,
      }))
      .filter((item): item is {shape: DocumentNode; nextRotation: number} => !!item.shape)

    if (candidates.length === 0) {
      return createLogOnlyEntry(command.type, 'Rotate Missing Shape')
    }

    const forward = candidates.map(({shape, nextRotation}) => ({
      type: 'rotate-shape' as const,
      shapeId: shape.id,
      prevRotation: shape.rotation ?? 0,
      nextRotation,
    }))
    const backward = candidates.map(({shape, nextRotation}) => ({
      type: 'rotate-shape' as const,
      shapeId: shape.id,
      prevRotation: nextRotation,
      nextRotation: shape.rotation ?? 0,
    }))

    return {
      id: `shape.rotate.batch.${Date.now()}`,
      label: `Rotate ${candidates.length} Shapes`,
      forward,
      backward,
    }
  }

  if (command.type === 'shape.transform.batch') {
    const forward: HistoryPatch[] = []
    const backward: HistoryPatch[] = []
    let touchedShapes = 0

    command.transforms.forEach((item) => {
      const shape = findShapeById(document, item.id)
      if (!shape) {
        return
      }
      const resolved = resolveTransformBatchItemToLegacy(item)
      if (!resolved) {
        return
      }
      touchedShapes += 1

      const forwardPatches = createTransformPatches(shape, resolved.from, resolved.to)
      const backwardPatches = createTransformPatches(shape, resolved.to, resolved.from)

      forward.push(...forwardPatches)
      backwardPatches.forEach((patch) => {
        backward.unshift(patch)
      })
    })

    if (forward.length === 0) {
      return createLogOnlyEntry(command.type, 'Transform Noop')
    }

    return {
      id: `shape.transform.batch.${Date.now()}`,
      label: `Transform ${touchedShapes} Shapes`,
      forward,
      backward,
    }
  }

  if (command.type === 'shape.patch') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Patch Missing Shape')
    }

    // `shape.patch` is partial by design; omitted keys must preserve the
    // current shape value instead of being treated as explicit clears.
    const nextFill = command.patch.fill === undefined ? cloneFill(shape.fill) : cloneFill(command.patch.fill)
    const nextStroke = command.patch.stroke === undefined ? cloneStroke(shape.stroke) : cloneStroke(command.patch.stroke)
    const nextShadow = command.patch.shadow === undefined ? cloneShadow(shape.shadow) : cloneShadow(command.patch.shadow)
    const nextCornerRadius = command.patch.cornerRadius === undefined ? shape.cornerRadius : command.patch.cornerRadius
    const nextCornerRadii = command.patch.cornerRadii === undefined
      ? cloneCornerRadii(shape.cornerRadii)
      : cloneCornerRadii(command.patch.cornerRadii)
    const nextEllipseStartAngle = command.patch.ellipseStartAngle === undefined
      ? shape.ellipseStartAngle
      : command.patch.ellipseStartAngle
    const nextEllipseEndAngle = command.patch.ellipseEndAngle === undefined
      ? shape.ellipseEndAngle
      : command.patch.ellipseEndAngle
    const nextFlipX = command.patch.flipX === undefined ? !!shape.flipX : command.patch.flipX
    const nextFlipY = command.patch.flipY === undefined ? !!shape.flipY : command.patch.flipY

    return {
      id: `shape.patch.${shape.id}`,
      label: `Patch ${shape.name}`,
      forward: [
        {
          type: 'patch-shape',
          shapeId: shape.id,
          prevFill: cloneFill(shape.fill),
          nextFill,
          prevStroke: cloneStroke(shape.stroke),
          nextStroke,
          prevShadow: cloneShadow(shape.shadow),
          nextShadow,
          prevCornerRadius: shape.cornerRadius,
          nextCornerRadius,
          prevCornerRadii: cloneCornerRadii(shape.cornerRadii),
          nextCornerRadii,
          prevEllipseStartAngle: shape.ellipseStartAngle,
          nextEllipseStartAngle,
          prevEllipseEndAngle: shape.ellipseEndAngle,
          nextEllipseEndAngle,
          prevFlipX: !!shape.flipX,
          nextFlipX,
          prevFlipY: !!shape.flipY,
          nextFlipY,
        },
      ],
      backward: [
        {
          type: 'patch-shape',
          shapeId: shape.id,
          prevFill: nextFill,
          nextFill: cloneFill(shape.fill),
          prevStroke: nextStroke,
          nextStroke: cloneStroke(shape.stroke),
          prevShadow: nextShadow,
          nextShadow: cloneShadow(shape.shadow),
          prevCornerRadius: nextCornerRadius,
          nextCornerRadius: shape.cornerRadius,
          prevCornerRadii: nextCornerRadii,
          nextCornerRadii: cloneCornerRadii(shape.cornerRadii),
          prevEllipseStartAngle: nextEllipseStartAngle,
          nextEllipseStartAngle: shape.ellipseStartAngle,
          prevEllipseEndAngle: nextEllipseEndAngle,
          nextEllipseEndAngle: shape.ellipseEndAngle,
          prevFlipX: nextFlipX,
          nextFlipX: !!shape.flipX,
          prevFlipY: nextFlipY,
          nextFlipY: !!shape.flipY,
        },
      ],
    }
  }

  if (command.type === 'shape.set-clip') {
    const shape = findShapeById(document, command.shapeId)
    if (!shape) {
      return createLogOnlyEntry(command.type, 'Clip Missing Shape')
    }

    return {
      id: `shape.set-clip.${shape.id}`,
      label: `Mask ${shape.name}`,
      forward: [
        {
          type: 'set-shape-clip',
          shapeId: shape.id,
          prevClipPathId: shape.clipPathId,
          nextClipPathId: command.clipPathId,
          prevClipRule: shape.clipRule,
          nextClipRule: command.clipRule,
        },
      ],
      backward: [
        {
          type: 'set-shape-clip',
          shapeId: shape.id,
          prevClipPathId: command.clipPathId,
          nextClipPathId: shape.clipPathId,
          prevClipRule: command.clipRule,
          nextClipRule: shape.clipRule,
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

  if (command.type === 'shape.insert.batch') {
    if (command.shapes.length === 0) {
      return createLogOnlyEntry(command.type, 'Insert Noop')
    }
    const baseIndex = command.index ?? document.shapes.length
    const forward: HistoryPatch[] = []
    const backward: HistoryPatch[] = []

    command.shapes.forEach((shape, index) => {
      const targetIndex = baseIndex + index
      forward.push({
        type: 'insert-shape',
        index: targetIndex,
        shape,
      })
      backward.unshift({
        type: 'remove-shape',
        index: targetIndex,
        shape,
      })
    })

    return {
      id: `shape.insert.batch.${Date.now()}`,
      label: `Insert ${command.shapes.length} Shapes`,
      forward,
      backward,
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

  if (operation.type === 'shape.rotate') {
    const shapeId = asString(operation.payload?.shapeId)
    const nextRotation = asNumber(operation.payload?.rotation)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape || nextRotation === null) {
      return []
    }

    return [
      {
        type: 'rotate-shape',
        shapeId: shape.id,
        prevRotation: shape.rotation ?? 0,
        nextRotation,
      },
    ]
  }

  if (operation.type === 'shape.rotate.batch') {
    const rotationItems = asRotateBatch(operation.payload?.rotations)
    if (rotationItems.length === 0) {
      return []
    }

    return rotationItems
      .map((item) => {
        const shape = findShapeById(document, item.shapeId)
        if (!shape) {
          return null
        }
        return {
          type: 'rotate-shape' as const,
          shapeId: shape.id,
          prevRotation: shape.rotation ?? 0,
          nextRotation: item.rotation,
        }
      })
      .filter((patch): patch is Extract<HistoryPatch, {type: 'rotate-shape'}> => patch !== null)
  }

  if (operation.type === 'shape.transform.batch') {
    const transformItems = asTransformBatch(operation.payload?.transforms)
    if (transformItems.length === 0) {
      return []
    }

    const patches: HistoryPatch[] = []
    transformItems.forEach((item) => {
      const shape = findShapeById(document, item.id)
      if (!shape) {
        return
      }
      patches.push(...createTransformPatches(shape, item.from, item.to))
    })

    return patches
  }

  if (operation.type === 'shape.patch') {
    const shapeId = asString(operation.payload?.shapeId)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape) {
      return []
    }

    const patchRecord =
      operation.payload?.patch && typeof operation.payload.patch === 'object'
        ? (operation.payload.patch as Record<string, unknown>)
        : {}
    const nextFill = Object.prototype.hasOwnProperty.call(patchRecord, 'fill')
      ? asFill(patchRecord.fill)
      : cloneFill(shape.fill)
    const nextStroke = Object.prototype.hasOwnProperty.call(patchRecord, 'stroke')
      ? asStroke(patchRecord.stroke)
      : cloneStroke(shape.stroke)
    const nextShadow = Object.prototype.hasOwnProperty.call(patchRecord, 'shadow')
      ? asShadow(patchRecord.shadow)
      : cloneShadow(shape.shadow)
    const nextCornerRadius = Object.prototype.hasOwnProperty.call(patchRecord, 'cornerRadius')
      ? asOptionalNumber(patchRecord.cornerRadius)
      : shape.cornerRadius
    const nextCornerRadii = Object.prototype.hasOwnProperty.call(patchRecord, 'cornerRadii')
      ? asCornerRadii(patchRecord.cornerRadii)
      : cloneCornerRadii(shape.cornerRadii)
    const nextEllipseStartAngle = Object.prototype.hasOwnProperty.call(patchRecord, 'ellipseStartAngle')
      ? asOptionalNumber(patchRecord.ellipseStartAngle)
      : shape.ellipseStartAngle
    const nextEllipseEndAngle = Object.prototype.hasOwnProperty.call(patchRecord, 'ellipseEndAngle')
      ? asOptionalNumber(patchRecord.ellipseEndAngle)
      : shape.ellipseEndAngle
    const nextFlipX = Object.prototype.hasOwnProperty.call(patchRecord, 'flipX')
      ? asBoolean(patchRecord.flipX) ?? !!shape.flipX
      : !!shape.flipX
    const nextFlipY = Object.prototype.hasOwnProperty.call(patchRecord, 'flipY')
      ? asBoolean(patchRecord.flipY) ?? !!shape.flipY
      : !!shape.flipY

    return [
      {
        type: 'patch-shape',
        shapeId: shape.id,
        prevFill: cloneFill(shape.fill),
        nextFill,
        prevStroke: cloneStroke(shape.stroke),
        nextStroke,
        prevShadow: cloneShadow(shape.shadow),
        nextShadow,
        prevCornerRadius: shape.cornerRadius,
        nextCornerRadius,
        prevCornerRadii: cloneCornerRadii(shape.cornerRadii),
        nextCornerRadii,
        prevEllipseStartAngle: shape.ellipseStartAngle,
        nextEllipseStartAngle,
        prevEllipseEndAngle: shape.ellipseEndAngle,
        nextEllipseEndAngle,
        prevFlipX: !!shape.flipX,
        nextFlipX,
        prevFlipY: !!shape.flipY,
        nextFlipY,
      },
    ]
  }

  if (operation.type === 'shape.set-clip') {
    const shapeId = asString(operation.payload?.shapeId)
    const shape = shapeId ? findShapeById(document, shapeId) : null

    if (!shape) {
      return []
    }

    return [
      {
        type: 'set-shape-clip',
        shapeId: shape.id,
        prevClipPathId: shape.clipPathId,
        nextClipPathId: asOptionalString(operation.payload?.clipPathId),
        prevClipRule: shape.clipRule,
        nextClipRule: asClipRule(operation.payload?.clipRule),
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

  if (operation.type === 'shape.insert.batch') {
    const shapes = asDocumentNodeList(operation.payload?.shapes)
    const baseIndex = asNumber(operation.payload?.index) ?? document.shapes.length
    if (shapes.length === 0) {
      return []
    }

    return shapes.map((shape, index) => ({
      type: 'insert-shape' as const,
      index: baseIndex + index,
      shape,
    }))
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
  let needsGroupBoundsSync = false
  const movedGroupIds = new Set<string>()
  const changedShapeIds = new Set<string>()
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const explicitlyMovedShapeIds = new Set(
    patches
      .filter((patch): patch is Extract<HistoryPatch, {type: 'move-shape'}> => patch.type === 'move-shape')
      .map((patch) => patch.shapeId),
  )

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
      if (hasMovedGroupAncestor(shape, movedGroupIds, shapeById)) {
        return
      }

      const deltaX = patch.nextX - patch.prevX
      const deltaY = patch.nextY - patch.prevY
      applyShapeMoveDelta(shape, deltaX, deltaY)
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      moveMaskedImagesWithClip(
        scene,
        document,
        spatialIndex,
        shape.id,
        deltaX,
        deltaY,
        explicitlyMovedShapeIds,
        changedShapeIds,
      )

      if (shape.type === 'group') {
        movedGroupIds.add(shape.id)
        const descendants = getDescendants(shape.id, document.shapes)
        descendants.forEach((child) => {
          applyShapeMoveDelta(child, deltaX, deltaY)
          const childIndex = document.shapes.findIndex((item) => item.id === child.id)
          writeRuntimeShapeToScene(scene, document, childIndex, child)
          updateSpatialShape(spatialIndex, document, child.id)
          changedShapeIds.add(child.id)
          moveMaskedImagesWithClip(
            scene,
            document,
            spatialIndex,
            child.id,
            deltaX,
            deltaY,
            explicitlyMovedShapeIds,
            changedShapeIds,
          )
        })
      }

      incrementSceneVersion(scene)
      needsGroupBoundsSync = true
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
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      return
    }

    if (patch.type === 'resize-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      const scaleX = patch.prevWidth === 0 ? 1 : patch.nextWidth / patch.prevWidth
      const scaleY = patch.prevHeight === 0 ? 1 : patch.nextHeight / patch.prevHeight

      if ((shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points && shape.points.length > 0) {
        shape.points = shape.points.map((point) => ({
          x: shape.x + (point.x - shape.x) * scaleX,
          y: shape.y + (point.y - shape.y) * scaleY,
        }))
      }
      if (shape.type === 'path' && shape.bezierPoints && shape.bezierPoints.length > 0) {
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
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'rotate-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.rotation = patch.nextRotation
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      return
    }

    if (patch.type === 'patch-shape') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.fill = cloneFill(patch.nextFill)
      shape.stroke = cloneStroke(patch.nextStroke)
      shape.shadow = cloneShadow(patch.nextShadow)
      shape.cornerRadius = patch.nextCornerRadius
      shape.cornerRadii = cloneCornerRadii(patch.nextCornerRadii)
      shape.ellipseStartAngle = patch.nextEllipseStartAngle
      shape.ellipseEndAngle = patch.nextEllipseEndAngle
      shape.flipX = patch.nextFlipX
      shape.flipY = patch.nextFlipY

      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      updateSpatialShape(spatialIndex, document, shape.id)
      changedShapeIds.add(shape.id)
      return
    }

    if (patch.type === 'set-shape-clip') {
      const shape = findShapeById(document, patch.shapeId)
      if (!shape) {
        return
      }

      shape.clipPathId = patch.nextClipPathId
      shape.clipRule = patch.nextClipRule
      const index = document.shapes.findIndex((item) => item.id === shape.id)
      writeRuntimeShapeToScene(scene, document, index, shape)
      incrementSceneVersion(scene)
      changedShapeIds.add(shape.id)
      return
    }

    if (patch.type === 'insert-shape') {
      document.shapes.splice(patch.index, 0, {
        ...patch.shape,
        type: patch.shape.type as DocumentNode['type'],
        text: patch.shape.text,
        assetId: patch.shape.assetId,
        assetUrl: patch.shape.assetUrl,
        clipPathId: patch.shape.clipPathId,
        clipRule: patch.shape.clipRule,
        rotation: patch.shape.rotation,
        flipX: patch.shape.flipX,
        flipY: patch.shape.flipY,
        fill: cloneFill(patch.shape.fill),
        stroke: cloneStroke(patch.shape.stroke),
        shadow: cloneShadow(patch.shape.shadow),
        cornerRadius: patch.shape.cornerRadius,
        cornerRadii: cloneCornerRadii(patch.shape.cornerRadii),
        ellipseStartAngle: patch.shape.ellipseStartAngle,
        ellipseEndAngle: patch.shape.ellipseEndAngle,
        points: clonePoints(patch.shape.points),
        bezierPoints: cloneBezierPoints(patch.shape.bezierPoints),
      })
      insertShapeIntoScene(scene, patch.index, document.shapes[patch.index])
      writeRuntimeShapeToScene(scene, document, patch.index, document.shapes[patch.index])
      syncSpatialRange(spatialIndex, document, patch.index)
      changedShapeIds.add(document.shapes[patch.index].id)
      needsGroupBoundsSync = true
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
      changedShapeIds.add(shape.id)
      needsGroupBoundsSync = true
      return
    }

    if (patch.type === 'remove-shape') {
      changedShapeIds.add(patch.shape.id)
      spatialIndex.remove(patch.shape.id)
      document.shapes.splice(patch.index, 1)
      removeShapeFromScene(scene, patch.index)
      syncSpatialRange(spatialIndex, document, patch.index)
      needsGroupBoundsSync = true
    }
  })

  if (needsGroupBoundsSync) {
    syncDerivedGroupBounds(scene, document, spatialIndex)
  }

  if (changedShapeIds.size > 0) {
    syncClippedImageRuntimeGeometry(scene, document, spatialIndex, changedShapeIds)
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
    document.shapes.map((shape, order) => createSpatialItem(shape, order)),
  )
}

function createSpatialItem(
  shape: DocumentNode,
  order: number,
): EngineSpatialItem<{
  shapeId: string
  type: DocumentNode['type']
  order: number
}> {
  const bounds = getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
  return {
    id: shape.id,
    minX: bounds.minX,
    minY: bounds.minY,
    maxX: bounds.maxX,
    maxY: bounds.maxY,
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
const POLYGON_EDGE_HIT_TOLERANCE = 6

function hitTestDocument(
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  pointer: { x: number; y: number },
  options?: {
    allowFrameSelection?: boolean
    strictStrokeHitTest?: boolean
  },
) {
  const allowFrameSelection = options?.allowFrameSelection ?? true
  const strictStrokeHitTest = options?.strictStrokeHitTest ?? false
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape]))
  const candidates = spatialIndex.search({
    minX: pointer.x - PATH_HIT_TOLERANCE,
    minY: pointer.y - PATH_HIT_TOLERANCE,
    maxX: pointer.x + PATH_HIT_TOLERANCE,
    maxY: pointer.y + PATH_HIT_TOLERANCE,
  })

  const sortedCandidates = [...candidates].sort((left, right) => right.meta.order - left.meta.order)

  for (const candidate of sortedCandidates) {
    const shape = findShapeById(document, candidate.meta.shapeId)
    if (!shape) {
      continue
    }
    if (!allowFrameSelection && shape.type === 'frame') {
      continue
    }
    // Masked images should not be directly hit-tested as interactive targets.
    if (shape.type === 'image' && shape.clipPathId) {
      continue
    }

    // For clipped elements, gate hit-test by clip source first so we do not
    // accidentally select through the unclipped host bounds.
    if (shape.clipPathId) {
      const clipSource = findShapeById(document, shape.clipPathId)
      if (clipSource && !isPointInsideClipSource(pointer, clipSource, shapeById)) {
        continue
      }
    }

    if (!isPointInsideEngineShapeHitArea(pointer, shape, {
      allowFrameSelection,
      tolerance: Math.max(LINE_HIT_TOLERANCE, PATH_HIT_TOLERANCE, POLYGON_EDGE_HIT_TOLERANCE),
      strictStrokeHitTest,
      shapeById,
    })) {
      continue
    }

    return document.shapes.findIndex((item) => item.id === shape.id)
  }

  return -1
}

function isPointInsideClipSource(
  pointer: {x: number; y: number},
  clipSource: DocumentNode,
  shapeById: Map<string, DocumentNode>,
) {
  return isPointInsideEngineClipShape(pointer, clipSource, {
    tolerance: 1.5,
    shapeById,
  })
}

function getNormalizedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  expand = 0,
) {
  const bounds = getNormalizedBoundsFromBox(x, y, width, height)

  return {
    minX: bounds.minX - expand,
    maxX: bounds.maxX + expand,
    minY: bounds.minY - expand,
    maxY: bounds.maxY + expand,
  }
}

function applyShapeMoveDelta(
  shape: DocumentNode,
  deltaX: number,
  deltaY: number,
) {
  shape.x += deltaX
  shape.y += deltaY

  if ((shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points) {
    shape.points = shape.points.map((point) => ({
      x: point.x + deltaX,
      y: point.y + deltaY,
    }))
  }

  if (shape.type === 'path' && shape.bezierPoints) {
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
}

function getDescendants(parentId: string, shapes: DocumentNode[]) {
  const childrenByParent = new Map<string, DocumentNode[]>()
  shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }
    const list = childrenByParent.get(shape.parentId)
    if (list) {
      list.push(shape)
      return
    }
    childrenByParent.set(shape.parentId, [shape])
  })

  const result: DocumentNode[] = []
  const queue = [...(childrenByParent.get(parentId) ?? [])]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }
    result.push(current)
    const children = childrenByParent.get(current.id)
    if (children && children.length > 0) {
      queue.push(...children)
    }
  }

  return result
}

function moveMaskedImagesWithClip(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  clipShapeId: string,
  deltaX: number,
  deltaY: number,
  explicitlyMovedShapeIds: Set<string>,
  changedShapeIds: Set<string>,
) {
  if (deltaX === 0 && deltaY === 0) {
    return
  }

  document.shapes.forEach((shape) => {
    if (shape.type !== 'image' || shape.clipPathId !== clipShapeId) {
      return
    }
    if (explicitlyMovedShapeIds.has(shape.id)) {
      return
    }

    applyShapeMoveDelta(shape, deltaX, deltaY)
    const imageIndex = document.shapes.findIndex((item) => item.id === shape.id)
    writeRuntimeShapeToScene(scene, document, imageIndex, shape)
    updateSpatialShape(spatialIndex, document, shape.id)
    changedShapeIds.add(shape.id)
  })
}

function hasMovedGroupAncestor(
  shape: DocumentNode,
  movedGroupIds: Set<string>,
  shapeById: Map<string, DocumentNode>,
) {
  if (!shape.parentId || movedGroupIds.size === 0) {
    return false
  }

  let currentParentId: string | null | undefined = shape.parentId
  while (currentParentId) {
    if (movedGroupIds.has(currentParentId)) {
      return true
    }
    const parent = shapeById.get(currentParentId)
    currentParentId = parent?.parentId
  }

  return false
}

function writeRuntimeShapeToScene(
  scene: SceneMemory,
  document: EditorDocument,
  index: number,
  shape: DocumentNode,
) {
  if (index < 0) {
    return
  }

  const runtimeBounds = resolveRuntimeShapeBounds(shape, document)
  if (!runtimeBounds) {
    writeShapeToScene(scene, index, shape)
    return
  }

  writeShapeToScene(scene, index, {
    ...shape,
    x: runtimeBounds.minX,
    y: runtimeBounds.minY,
    width: runtimeBounds.maxX - runtimeBounds.minX,
    height: runtimeBounds.maxY - runtimeBounds.minY,
  })
}

function syncClippedImageRuntimeGeometry(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
  changedShapeIds?: Set<string>,
) {
  document.shapes.forEach((shape, index) => {
    if (shape.type !== 'image') {
      return
    }
    const clipId = shape.clipPathId
    const shouldSync = !changedShapeIds ||
      changedShapeIds.has(shape.id) ||
      (!!clipId && changedShapeIds.has(clipId))
    if (!shouldSync) {
      return
    }

    writeRuntimeShapeToScene(scene, document, index, shape)
    updateSpatialShape(spatialIndex, document, shape.id)
  })
}

function resolveRuntimeShapeBounds(
  shape: DocumentNode,
  document: EditorDocument,
) {
  const shapeBounds = resolveShapeBounds(shape)
  if (shape.type !== 'image' || !shape.clipPathId) {
    return shapeBounds
  }

  const clipSource = findShapeById(document, shape.clipPathId)
  if (!clipSource) {
    return shapeBounds
  }
  const clipBounds = resolveShapeBounds(clipSource)
  const intersection = intersectNormalizedBounds(shapeBounds, clipBounds)
  if (!intersection) {
    return shapeBounds
  }

  return intersection
}

function resolveShapeBounds(shape: DocumentNode) {
  if (shape.type === 'path' && shape.bezierPoints && shape.bezierPoints.length > 0) {
    const bezierBounds = getBezierPathBounds(shape.bezierPoints)
    return getNormalizedBounds(
      bezierBounds.x,
      bezierBounds.y,
      bezierBounds.width,
      bezierBounds.height,
    )
  }

  if ((shape.type === 'path' || shape.type === 'polygon' || shape.type === 'star') && shape.points && shape.points.length > 0) {
    const pointBounds = getPathBounds(shape.points)
    return getNormalizedBounds(
      pointBounds.x,
      pointBounds.y,
      pointBounds.width,
      pointBounds.height,
    )
  }

  return getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
}

function syncDerivedGroupBounds(
  scene: SceneMemory,
  document: EditorDocument,
  spatialIndex: WorkerSpatialIndex,
) {
  const changedIds = deriveGroupBoundsFromChildren(document.shapes)
  if (changedIds.length === 0) {
    return
  }

  changedIds.forEach((shapeId) => {
    const index = document.shapes.findIndex((shape) => shape.id === shapeId)
    if (index < 0) {
      return
    }

    writeRuntimeShapeToScene(scene, document, index, document.shapes[index])
    updateSpatialShape(spatialIndex, document, shapeId)
  })

  incrementSceneVersion(scene)
}

function deriveGroupBoundsFromChildren(shapes: DocumentNode[]) {
  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const childrenByParent = new Map<string, DocumentNode[]>()
  const changed = new Set<string>()
  const visiting = new Set<string>()
  const cache = new Map<string, ReturnType<typeof getNormalizedBounds> | null>()

  shapes.forEach((shape) => {
    if (!shape.parentId) {
      return
    }
    const parent = shapeById.get(shape.parentId)
    if (!parent) {
      return
    }
    const list = childrenByParent.get(parent.id)
    if (list) {
      list.push(shape)
      return
    }
    childrenByParent.set(parent.id, [shape])
  })

  const visit = (shape: DocumentNode): ReturnType<typeof getNormalizedBounds> | null => {
    if (cache.has(shape.id)) {
      return cache.get(shape.id) ?? null
    }
    if (visiting.has(shape.id)) {
      return getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
    }

    visiting.add(shape.id)
    let bounds: ReturnType<typeof getNormalizedBounds> | null = null

    if (shape.type === 'group') {
      const children = childrenByParent.get(shape.id) ?? []
      for (const child of children) {
        const childBounds = visit(child)
        if (!childBounds) {
          continue
        }
        bounds = bounds
          ? {
              minX: Math.min(bounds.minX, childBounds.minX),
              minY: Math.min(bounds.minY, childBounds.minY),
              maxX: Math.max(bounds.maxX, childBounds.maxX),
              maxY: Math.max(bounds.maxY, childBounds.maxY),
            }
          : childBounds
      }

      if (bounds) {
        const nextBounds = bounds
        const epsilon = 0.0001
        const nextX = nextBounds.minX
        const nextY = nextBounds.minY
        const nextWidth = nextBounds.maxX - nextBounds.minX
        const nextHeight = nextBounds.maxY - nextBounds.minY
        if (
          Math.abs(shape.x - nextX) > epsilon ||
          Math.abs(shape.y - nextY) > epsilon ||
          Math.abs(shape.width - nextWidth) > epsilon ||
          Math.abs(shape.height - nextHeight) > epsilon
        ) {
          shape.x = nextX
          shape.y = nextY
          shape.width = nextWidth
          shape.height = nextHeight
          changed.add(shape.id)
        }
      }
    }

    if (!bounds) {
      bounds = getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
    }

    visiting.delete(shape.id)
    cache.set(shape.id, bounds)
    return bounds
  }

  shapes.forEach((shape) => {
    if (shape.type === 'group') {
      visit(shape)
    }
  })

  return Array.from(changed)
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
      clipPathId: shape.clipPathId,
      clipRule: shape.clipRule,
      fill: cloneFill(shape.fill),
      stroke: cloneStroke(shape.stroke),
      shadow: cloneShadow(shape.shadow),
      cornerRadius: shape.cornerRadius,
      cornerRadii: cloneCornerRadii(shape.cornerRadii),
      ellipseStartAngle: shape.ellipseStartAngle,
      ellipseEndAngle: shape.ellipseEndAngle,
      schema: shape.schema
        ? {
            ...shape.schema,
            sourceFeatureKinds: shape.schema.sourceFeatureKinds?.slice(),
          }
        : undefined,
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

  if (command.type === 'shape.rotate') {
    return {
      shapeId: command.shapeId,
      rotation: command.rotation,
    }
  }

  if (command.type === 'shape.rotate.batch') {
    return {
      rotations: command.rotations.map((item) => ({
        shapeId: item.shapeId,
        rotation: item.rotation,
      })),
    }
  }

  if (command.type === 'shape.transform.batch') {
    return {
      transforms: command.transforms
        .map((item) => {
          return {
            id: item.id,
            fromMatrix: item.fromMatrix,
            toMatrix: item.toMatrix,
          }
        })
        .filter((item): item is {id: string; fromMatrix: MatrixFirstNodeTransform; toMatrix: MatrixFirstNodeTransform} => item !== null),
    }
  }

  if (command.type === 'shape.patch') {
    const patchPayload: Record<string, unknown> = {}
    if (Object.prototype.hasOwnProperty.call(command.patch, 'fill')) {
      patchPayload.fill = cloneFill(command.patch.fill)
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'stroke')) {
      patchPayload.stroke = cloneStroke(command.patch.stroke)
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'shadow')) {
      patchPayload.shadow = cloneShadow(command.patch.shadow)
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'cornerRadius')) {
      patchPayload.cornerRadius = command.patch.cornerRadius
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'cornerRadii')) {
      patchPayload.cornerRadii = cloneCornerRadii(command.patch.cornerRadii)
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'ellipseStartAngle')) {
      patchPayload.ellipseStartAngle = command.patch.ellipseStartAngle
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'ellipseEndAngle')) {
      patchPayload.ellipseEndAngle = command.patch.ellipseEndAngle
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'flipX')) {
      patchPayload.flipX = command.patch.flipX
    }
    if (Object.prototype.hasOwnProperty.call(command.patch, 'flipY')) {
      patchPayload.flipY = command.patch.flipY
    }
    return {
      shapeId: command.shapeId,
      patch: patchPayload,
    }
  }

  if (command.type === 'shape.set-clip') {
    return {
      shapeId: command.shapeId,
      clipPathId: command.clipPathId,
      clipRule: command.clipRule,
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

  if (command.type === 'shape.insert.batch') {
    return {
      shapes: command.shapes,
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

function asOptionalNumber(value: unknown) {
  return typeof value === 'number' ? value : undefined
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function asRotateBatch(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const shapeId = asString((item as Record<string, unknown>).shapeId)
      const rotation = asNumber((item as Record<string, unknown>).rotation)
      if (!shapeId || rotation === null) {
        return null
      }
      return {shapeId, rotation}
    })
    .filter((item): item is {shapeId: string; rotation: number} => item !== null)
}

type ParsedTransformBatchItem = {
  id: string
  from: ShapeTransformRecord & {flipX: boolean; flipY: boolean}
  to: ShapeTransformRecord & {flipX: boolean; flipY: boolean}
}

function resolveTransformBatchItemToLegacy(item: {
  fromMatrix: MatrixFirstNodeTransform
  toMatrix: MatrixFirstNodeTransform
}) {
  // History patch vocabulary is still decomposed (move/resize/rotate/flip).
  // Convert matrix-first command payload into legacy records at this boundary.
  const from = toLegacyShapeTransformRecord(item.fromMatrix)
  const to = toLegacyShapeTransformRecord(item.toMatrix)

  if (!from || !to) {
    return null
  }

  return {
    from: {
      ...from,
      flipX: !!from.flipX,
      flipY: !!from.flipY,
    },
    to: {
      ...to,
      flipX: !!to.flipX,
      flipY: !!to.flipY,
    },
  }
}

function createTransformPatches(
  shape: DocumentNode,
  from: ShapeTransformRecord,
  to: ShapeTransformRecord,
): HistoryPatch[] {
  const patches: HistoryPatch[] = []

  if (from.x !== to.x || from.y !== to.y) {
    patches.push({
      type: 'move-shape',
      shapeId: shape.id,
      prevX: from.x,
      prevY: from.y,
      nextX: to.x,
      nextY: to.y,
    })
  }

  if (from.width !== to.width || from.height !== to.height) {
    patches.push({
      type: 'resize-shape',
      shapeId: shape.id,
      prevWidth: from.width,
      prevHeight: from.height,
      nextWidth: to.width,
      nextHeight: to.height,
    })
  }

  if (from.rotation !== to.rotation) {
    patches.push({
      type: 'rotate-shape',
      shapeId: shape.id,
      prevRotation: from.rotation,
      nextRotation: to.rotation,
    })
  }

  if (!!from.flipX !== !!to.flipX || !!from.flipY !== !!to.flipY) {
    patches.push({
      type: 'patch-shape',
      shapeId: shape.id,
      prevFill: cloneFill(shape.fill),
      nextFill: cloneFill(shape.fill),
      prevStroke: cloneStroke(shape.stroke),
      nextStroke: cloneStroke(shape.stroke),
      prevShadow: cloneShadow(shape.shadow),
      nextShadow: cloneShadow(shape.shadow),
      prevCornerRadius: shape.cornerRadius,
      nextCornerRadius: shape.cornerRadius,
      prevCornerRadii: cloneCornerRadii(shape.cornerRadii),
      nextCornerRadii: cloneCornerRadii(shape.cornerRadii),
      prevEllipseStartAngle: shape.ellipseStartAngle,
      nextEllipseStartAngle: shape.ellipseStartAngle,
      prevEllipseEndAngle: shape.ellipseEndAngle,
      nextEllipseEndAngle: shape.ellipseEndAngle,
      prevFlipX: !!from.flipX,
      nextFlipX: !!to.flipX,
      prevFlipY: !!from.flipY,
      nextFlipY: !!to.flipY,
    })
  }

  return patches
}

function asTransformBatch(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }
      const record = item as Record<string, unknown>
      const id = asString(record.id)
      const fromMatrix = record.fromMatrix && typeof record.fromMatrix === 'object'
        ? asMatrixFirstTransform(record.fromMatrix as Record<string, unknown>)
        : null
      const toMatrix = record.toMatrix && typeof record.toMatrix === 'object'
        ? asMatrixFirstTransform(record.toMatrix as Record<string, unknown>)
        : null
      // Matrix fields are required on the wire after matrix-first migration.
      if (!id || !fromMatrix || !toMatrix) {
        return null
      }
      return {
        id,
        from: toLegacyShapeTransformRecord(fromMatrix),
        to: toLegacyShapeTransformRecord(toMatrix),
      }
    })
    .filter((item): item is ParsedTransformBatchItem => item !== null)
}

function asMatrixFirstTransform(value: Record<string, unknown>): MatrixFirstNodeTransform | null {
  const bounds = value.bounds && typeof value.bounds === 'object'
    ? value.bounds as Record<string, unknown>
    : null
  const minX = bounds ? asNumber(bounds.minX) : null
  const minY = bounds ? asNumber(bounds.minY) : null
  const maxX = bounds ? asNumber(bounds.maxX) : null
  const maxY = bounds ? asNumber(bounds.maxY) : null
  const rotation = asNumber(value.rotation)
  const flipX = asBoolean(value.flipX)
  const flipY = asBoolean(value.flipY)

  if (
    minX === null ||
    minY === null ||
    maxX === null ||
    maxY === null ||
    rotation === null
  ) {
    return null
  }

  const matrix = Array.isArray(value.matrix) && value.matrix.length === 9
    ? value.matrix.map((entry) => asNumber(entry)).filter((entry): entry is number => entry !== null)
    : null

  if (!matrix || matrix.length !== 9) {
    return null
  }

  const center = value.center && typeof value.center === 'object'
    ? value.center as Record<string, unknown>
    : null
  const centerX = center ? asNumber(center.x) : null
  const centerY = center ? asNumber(center.y) : null

  return {
    matrix: [
      matrix[0], matrix[1], matrix[2],
      matrix[3], matrix[4], matrix[5],
    ],
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
    center: {
      x: centerX ?? (minX + maxX) / 2,
      y: centerY ?? (minY + maxY) / 2,
    },
    width: asNumber(value.width) ?? (maxX - minX),
    height: asNumber(value.height) ?? (maxY - minY),
    rotation,
    flipX: flipX ?? false,
    flipY: flipY ?? false,
  }
}

function asDocumentNodeList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => asDocumentNode(item))
    .filter((item): item is DocumentNode => item !== null)
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
  const clipPathId = asOptionalString(record.clipPathId)
  const clipRule = asClipRule(record.clipRule)
  const rotation = asNumber(record.rotation)
  const flipX = asBoolean(record.flipX)
  const flipY = asBoolean(record.flipY)
  const strokeStartArrowhead = asArrowhead(record.strokeStartArrowhead)
  const strokeEndArrowhead = asArrowhead(record.strokeEndArrowhead)
  const fill = asFill(record.fill)
  const stroke = asStroke(record.stroke)
  const shadow = asShadow(record.shadow)
  const cornerRadius = asOptionalNumber(record.cornerRadius)
  const cornerRadii = asCornerRadii(record.cornerRadii)
  const ellipseStartAngle = asOptionalNumber(record.ellipseStartAngle)
  const ellipseEndAngle = asOptionalNumber(record.ellipseEndAngle)
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
  const nextBounds = type === 'path' && bezierPoints && bezierPoints.length > 0
    ? getBezierPathBounds(bezierPoints)
    : (type === 'path' || type === 'polygon' || type === 'star') && points && points.length > 0
      ? getPathBounds(points)
      : null

  return {
    id,
    type: type as DocumentNode['type'],
    name,
    text,
    assetId,
    assetUrl,
    clipPathId,
    clipRule,
    rotation: rotation === null ? undefined : rotation,
    flipX: flipX ?? undefined,
    flipY: flipY ?? undefined,
    strokeStartArrowhead,
    strokeEndArrowhead,
    fill,
    stroke,
    shadow,
    cornerRadius,
    cornerRadii,
    ellipseStartAngle,
    ellipseEndAngle,
    x: nextBounds?.x ?? x,
    y: nextBounds?.y ?? y,
    width: nextBounds?.width ?? width,
    height: nextBounds?.height ?? height,
    points,
    bezierPoints,
    schema:
      record.schema && typeof record.schema === 'object'
        ? {
            sourceNodeType: asOptionalString((record.schema as Record<string, unknown>).sourceNodeType),
            sourceNodeKind: asOptionalString((record.schema as Record<string, unknown>).sourceNodeKind),
            sourceFeatureKinds: Array.isArray((record.schema as Record<string, unknown>).sourceFeatureKinds)
              ? ((record.schema as Record<string, unknown>).sourceFeatureKinds as unknown[])
                  .map((item) => asOptionalString(item))
                  .filter((item): item is string => typeof item === 'string')
              : undefined,
          }
        : undefined,
  }
}

function asClipRule(value: unknown): 'nonzero' | 'evenodd' | undefined {
  return value === 'evenodd' || value === 'nonzero' ? value : undefined
}

function asArrowhead(value: unknown): DocumentNode['strokeStartArrowhead'] {
  if (
    value === 'none' ||
    value === 'triangle' ||
    value === 'diamond' ||
    value === 'circle' ||
    value === 'bar'
  ) {
    return value
  }
  return undefined
}

function asFill(value: unknown): DocumentNode['fill'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
  }
}

function asStroke(value: unknown): DocumentNode['stroke'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    weight: typeof record.weight === 'number' ? record.weight : undefined,
  }
}

function asShadow(value: unknown): DocumentNode['shadow'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    offsetX: typeof record.offsetX === 'number' ? record.offsetX : undefined,
    offsetY: typeof record.offsetY === 'number' ? record.offsetY : undefined,
    blur: typeof record.blur === 'number' ? record.blur : undefined,
  }
}

function asCornerRadii(value: unknown): DocumentNode['cornerRadii'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    topLeft: typeof record.topLeft === 'number' ? record.topLeft : undefined,
    topRight: typeof record.topRight === 'number' ? record.topRight : undefined,
    bottomRight: typeof record.bottomRight === 'number' ? record.bottomRight : undefined,
    bottomLeft: typeof record.bottomLeft === 'number' ? record.bottomLeft : undefined,
  }
}
