/// <reference lib="webworker" />

import type { EditorDocument } from '@venus/editor-core'
import {
  attachSceneMemory,
  clearHoveredShape,
  hitTestScene,
  readSceneStats,
  setHoveredShape,
  setSelectedShape,
  updatePointer,
  writeDocumentToScene,
  type PointerState,
  type SceneMemory,
} from '@venus/shared-memory'

export interface WorkerInitMessage {
  type: 'init'
  buffer: SharedArrayBuffer
  capacity: number
  document: EditorDocument
}

export interface WorkerPointerMessage {
  type: 'pointermove' | 'pointerdown'
  pointer: PointerState
}

export interface WorkerPointerLeaveMessage {
  type: 'pointerleave'
}

export type EditorWorkerMessage =
  | WorkerInitMessage
  | WorkerPointerMessage
  | WorkerPointerLeaveMessage

export interface SceneUpdateMessage {
  type: 'scene-ready' | 'scene-update'
  stats: ReturnType<typeof readSceneStats>
}

export function bindEditorWorkerScope(scope: DedicatedWorkerGlobalScope) {
  let scene: SceneMemory | null = null

  scope.addEventListener('message', (event: MessageEvent<EditorWorkerMessage>) => {
    const message = event.data

    if (message.type === 'init') {
      scene = attachSceneMemory(message.buffer, message.capacity)
      writeDocumentToScene(scene, message.document)
      postScene(scope, 'scene-ready', scene)
      return
    }

    if (!scene) {
      return
    }

    if (message.type === 'pointerleave') {
      const changed = clearHoveredShape(scene)
      if (changed) {
        postScene(scope, 'scene-update', scene)
      }
      return
    }

    updatePointer(scene, message.pointer)
    const targetIndex = hitTestScene(scene, message.pointer)

    if (message.type === 'pointermove') {
      const changed = setHoveredShape(scene, targetIndex)
      if (changed) {
        postScene(scope, 'scene-update', scene)
      }
      return
    }

    const hoverChanged = setHoveredShape(scene, targetIndex)
    const selectionChanged = setSelectedShape(scene, targetIndex)

    if (hoverChanged || selectionChanged) {
      postScene(scope, 'scene-update', scene)
    }
  })
}

function postScene(
  scope: DedicatedWorkerGlobalScope,
  type: SceneUpdateMessage['type'],
  scene: SceneMemory,
) {
  scope.postMessage({
    type,
    stats: readSceneStats(scene),
  } satisfies SceneUpdateMessage)
}
