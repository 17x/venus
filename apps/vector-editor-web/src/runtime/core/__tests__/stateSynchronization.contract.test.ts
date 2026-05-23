import assert from 'node:assert/strict'
import test from 'node:test'

import {createCanvasRuntimeController} from '../createCanvasRuntimeController.ts'
import {
  attachSceneMemory,
  readSceneStats,
  setSelectedShapes,
  writeDocumentToScene,
} from '../../shared-memory/index.ts'
import type {
  EditorWorkerMessage,
  SceneUpdateMessage,
  WorkerInitMessage,
} from '../../worker/index.ts'

/**
 * Creates one compact document fixture for runtime synchronization contract tests.
 */
function createRuntimeSynchronizationFixtureDocument() {
  return {
    id: 'doc-sync',
    name: 'runtime sync fixture',
    width: 800,
    height: 600,
    shapes: [
      {
        id: 'rect-sync-1',
        type: 'rectangle' as const,
        name: 'Rect Sync 1',
        parentId: null,
        x: 10,
        y: 10,
        width: 100,
        height: 80,
      },
    ],
  }
}

/**
 * Declares one worker mock used to feed runtime controller scene messages.
 */
interface RuntimeControllerWorkerMock {
  // Stores worker instance passed into runtime controller factory.
  worker: Worker
  // Stores latest init message posted by runtime controller start().
  getInitMessage: () => WorkerInitMessage | null
  // Emits one worker->runtime scene message.
  emitSceneMessage: (message: SceneUpdateMessage) => void
}

/**
 * Creates one worker mock with explicit init capture and message replay support.
 */
function createRuntimeControllerWorkerMock(): RuntimeControllerWorkerMock {
  let messageListener: ((event: MessageEvent<SceneUpdateMessage>) => void) | null = null
  let initMessage: WorkerInitMessage | null = null

  const worker = {
    /**
     * Captures the runtime controller message listener.
     * @param type Event name requested by runtime controller.
     * @param listener Listener callback for worker messages.
     */
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (type !== 'message') {
        return
      }
      if (typeof listener === 'function') {
        messageListener = listener as (event: MessageEvent<SceneUpdateMessage>) => void
      }
    },
    /**
     * Clears the captured worker message listener during runtime destroy.
     * @param type Event name requested by runtime controller.
     */
    removeEventListener(type: string) {
      if (type === 'message') {
        messageListener = null
      }
    },
    /**
     * Captures init payload posted by runtime controller.
     * @param message Worker inbound message from runtime controller.
     */
    postMessage(message: EditorWorkerMessage) {
      if (message.type === 'init') {
        initMessage = message
      }
    },
    // Keeps worker termination a no-op for deterministic contract tests.
    terminate() {},
  }

  return {
    worker: worker as unknown as Worker,
    getInitMessage: () => initMessage,
    emitSceneMessage: (message) => {
      if (!messageListener) {
        throw new Error('runtime controller message listener is not registered')
      }
      messageListener({data: message} as MessageEvent<SceneUpdateMessage>)
    },
  }
}

/**
 * Asserts runtime state synchronization diagnostics split revisions and invalidation codes deterministically.
 */
test('runtime synchronization diagnostics split scene/selection/viewport revisions with standardized invalidation reasons', () => {
  const workerMock = createRuntimeControllerWorkerMock()
  const document = createRuntimeSynchronizationFixtureDocument()

  const controller = createCanvasRuntimeController({
    capacity: 16,
    createWorker: () => workerMock.worker,
    document,
  })

  controller.start()

  const initMessage = workerMock.getInitMessage()
  assert.ok(initMessage)
  if (!initMessage) {
    throw new Error('runtime controller did not post init message')
  }

  const scene = attachSceneMemory(initMessage.buffer, initMessage.capacity)
  writeDocumentToScene(scene, initMessage.document)

  workerMock.emitSceneMessage({
    type: 'scene-ready',
    updateKind: 'full',
    document: initMessage.document,
    stats: readSceneStats(scene),
    history: controller.getSnapshot().history,
    collaboration: controller.getSnapshot().collaboration,
    runtimeV2: controller.getSnapshot().runtimeV2,
  })

  assert.deepEqual(controller.getSnapshot().synchronization.revisions, {
    sceneRevision: 1,
    selectionRevision: 0,
    viewportRevision: 0,
  })
  assert.equal(controller.getSnapshot().synchronization.lastInvalidationReason, 'worker.scene-ready')

  setSelectedShapes(scene, [0], 'replace')
  workerMock.emitSceneMessage({
    type: 'scene-update',
    updateKind: 'flags',
    stats: readSceneStats(scene),
    history: controller.getSnapshot().history,
    collaboration: controller.getSnapshot().collaboration,
    runtimeV2: controller.getSnapshot().runtimeV2,
  })

  assert.deepEqual(controller.getSnapshot().synchronization.revisions, {
    sceneRevision: 1,
    selectionRevision: 1,
    viewportRevision: 0,
  })
  assert.equal(controller.getSnapshot().synchronization.lastInvalidationReason, 'worker.scene-flags')

  controller.setViewport({
    ...controller.getSnapshot().viewport,
    viewportWidth: 640,
    viewportHeight: 480,
  })
  controller.panViewport(10, 0)

  assert.deepEqual(controller.getSnapshot().synchronization.revisions, {
    sceneRevision: 1,
    selectionRevision: 1,
    viewportRevision: 2,
  })
  assert.equal(controller.getSnapshot().synchronization.lastInvalidationReason, 'viewport.pan')

  workerMock.emitSceneMessage({
    type: 'scene-update',
    updateKind: 'full',
    document: initMessage.document,
    stats: readSceneStats(scene),
    history: controller.getSnapshot().history,
    collaboration: controller.getSnapshot().collaboration,
    runtimeV2: controller.getSnapshot().runtimeV2,
  })

  assert.deepEqual(controller.getSnapshot().synchronization.revisions, {
    sceneRevision: 2,
    selectionRevision: 1,
    viewportRevision: 2,
  })
  assert.equal(controller.getSnapshot().synchronization.lastInvalidationReason, 'worker.scene-full')

  controller.destroy()
})
