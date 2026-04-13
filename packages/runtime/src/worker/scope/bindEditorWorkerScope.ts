/// <reference lib="webworker" />

import {createCollaborationManager} from '../collaboration.ts'
import type {EditorDocument} from '@venus/document-core'
import {createHistoryManager} from '../history.ts'
import {createEngineSpatialIndex} from '@venus/engine'
import {
  attachSceneMemory,
  readSceneStats,
  setSelectedShapes,
  updatePointer,
  writeDocumentToScene,
  type SceneMemory,
} from '@venus/shared-memory'
import type {
  EditorWorkerMessage,
  SceneUpdateMessage,
} from '../protocol.ts'
import {resolvePointerSelectionMode} from './pointerSelection.ts'
import {hitTestDocument} from './hitTest.ts'
import {cloneDocument} from './model.ts'
import {rebuildSpatialIndex, syncClippedImageRuntimeGeometry} from './scenePatches.ts'
import {handleLocalCommand, handleRemoteOperation} from './operations.ts'

function debugWorker(message: string, details?: unknown) {
  console.debug('EDITOR-WORKER', message, details)
}

export function bindEditorWorkerScope(scope: DedicatedWorkerGlobalScope) {
  let scene: SceneMemory | null = null
  let documentState: EditorDocument | null = null
  let allowFrameSelection = true
  let strictStrokeHitTest = false

  const spatialIndex = createEngineSpatialIndex<{
    shapeId: string
    type: import('@venus/document-core').DocumentNode['type']
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
      const updateKind = handleRemoteOperation(
        message.operation,
        scene,
        documentState,
        spatialIndex,
        history,
        collaboration,
      )
      if (updateKind) {
        postScene(scope, 'scene-update', updateKind, scene, documentState, history, collaboration)
      }
      return
    }

    if (message.type === 'command') {
      const updateKind = handleLocalCommand(
        message.command,
        scene,
        documentState,
        spatialIndex,
        history,
        collaboration,
      )
      if (updateKind) {
        postScene(scope, 'scene-update', updateKind, scene, documentState, history, collaboration)
      }
      return
    }

    updatePointer(scene, message.pointer)

    if (message.type === 'pointermove') {
      // Hover feedback is app-layer only and should not trigger scene updates.
      return
    }

    const targetIndex = hitTestDocument(documentState, spatialIndex, message.pointer, {
      allowFrameSelection,
      strictStrokeHitTest,
    })
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
