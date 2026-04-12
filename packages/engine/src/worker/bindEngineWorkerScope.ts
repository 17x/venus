/// <reference lib="webworker" />

import {
  createEngineSceneStore,
} from '../scene/store.ts'
import type {
  EngineWorkerMessage,
  EngineWorkerResponseMessage,
} from './protocol.ts'
import {
  attachSharedHitTestViews,
  readSharedHitTestRequest,
  writeSharedHitTestResponse,
} from './sharedHitTest.ts'

/**
 * Worker-side engine bridge entry.
 *
 * It keeps scene state local to the worker and exposes two hit-test paths:
 * - postmessage request/response
 * - shared-memory request slot + signal message
 */
export function bindEngineWorkerScope(scope: DedicatedWorkerGlobalScope) {
  const sceneStore = createEngineSceneStore()
  let mode: 'worker-postmessage' | 'worker-shared-memory' = 'worker-postmessage'
  let sharedViews: ReturnType<typeof attachSharedHitTestViews> | null = null

  const post = (message: EngineWorkerResponseMessage) => {
    scope.postMessage(message)
  }

  scope.addEventListener('message', (event: MessageEvent<EngineWorkerMessage>) => {
    const message = event.data

    if (message.type === 'engine.init') {
      mode = message.mode
      if (message.scene) {
        sceneStore.loadScene(message.scene)
      }
      if (message.sharedHitTestBuffer) {
        sharedViews = attachSharedHitTestViews(message.sharedHitTestBuffer)
      }
      post({
        type: 'engine.ready',
        mode,
      })
      return
    }

    if (message.type === 'engine.scene.patch') {
      sceneStore.applyScenePatch(message.patch)
      return
    }

    if (message.type === 'engine.scene.patch.batch') {
      sceneStore.applyScenePatchBatch(message.batch)
      return
    }

    if (message.type === 'engine.hittest.request') {
      const result = sceneStore.hitTest(
        message.request.point,
        message.request.tolerance ?? 0,
      )
      post({
        type: 'engine.hittest.response',
        requestId: message.request.requestId,
        result,
      })
      return
    }

    if (message.type === 'engine.hittest.signal') {
      if (!sharedViews) {
        post({
          type: 'engine.error',
          requestId: message.requestId,
          message: 'shared hit-test buffer is not initialized',
        })
        return
      }

      const request = readSharedHitTestRequest(sharedViews)
      const result = sceneStore.hitTest(request.point, request.tolerance)
      writeSharedHitTestResponse(sharedViews, request.requestToken, result?.index ?? -1)
      post({
        type: 'engine.hittest.signal.response',
        requestId: message.requestId,
      })
      return
    }

    if (message.type === 'engine.dispose') {
      sceneStore.loadScene({
        revision: 0,
        width: 0,
        height: 0,
        nodes: [],
      })
      sharedViews = null
      return
    }
  })
}
