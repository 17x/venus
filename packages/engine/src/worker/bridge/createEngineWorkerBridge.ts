import type { EnginePoint, EngineSceneSnapshot } from '../../scene/types.ts'
import {
  applyEngineScenePatch,
  createMutableEngineSceneState,
  resolveNodeByFlattenedIndex,
} from '../../scene/patch.ts'
import { hitTestEngineSceneState } from '../../scene/hitTest.ts'
import type {
  EngineWorkerMode,
  EngineWorkerModeResolution,
  ResolveEngineWorkerModeOptions,
} from '../capabilities.ts'
import { resolveEngineWorkerMode } from '../capabilities.ts'
import type {
  EngineHitTestResult,
  EngineScenePatch,
  EngineWorkerResponseMessage,
} from '../protocol.ts'
import {
  attachSharedHitTestViews,
  createSharedHitTestBuffer,
  isSharedHit,
  readSharedHitTestResponse,
  writeSharedHitTestRequest,
} from '../sharedHitTest.ts'

export interface EngineWorkerBridgeOptions extends ResolveEngineWorkerModeOptions {
  createWorker?: () => Worker
  initialScene?: EngineSceneSnapshot
}

export interface EngineWorkerBridge {
  mode: EngineWorkerMode
  resolution: EngineWorkerModeResolution
  start(): Promise<void>
  applyScenePatch(patch: EngineScenePatch): void
  hitTest(point: EnginePoint, tolerance?: number): Promise<EngineHitTestResult | null>
  dispose(): void
}

/**
 * Unified engine worker bridge with automatic fallback.
 *
 * API is stable across:
 * - main-thread fallback
 * - postmessage worker
 * - shared-memory worker
 */
export function createEngineWorkerBridge(
  options: EngineWorkerBridgeOptions = {},
): EngineWorkerBridge {
  const sceneState = createMutableEngineSceneState(options.initialScene)
  const pendingHitTests = new Map<number, (value: EngineHitTestResult | null) => void>()
  const requestedMode = resolveEngineWorkerMode(options)
  const resolution = resolveBridgeMode(requestedMode, options)
  const mode = resolution.mode

  let nextRequestId = 1
  let started = false
  let worker: Worker | null = null
  let sharedViews: ReturnType<typeof attachSharedHitTestViews> | null = null
  let sharedQueue = Promise.resolve<EngineHitTestResult | null>(null)

  const onWorkerMessage = (event: MessageEvent<EngineWorkerResponseMessage>) => {
    const message = event.data

    if (message.type === 'engine.hittest.response') {
      const resolve = pendingHitTests.get(message.requestId)
      if (!resolve) {
        return
      }
      pendingHitTests.delete(message.requestId)
      resolve(message.result)
      return
    }

    if (message.type === 'engine.hittest.signal.response') {
      const resolve = pendingHitTests.get(message.requestId)
      if (!resolve || !sharedViews) {
        return
      }

      const sharedResult = readSharedHitTestResponse(sharedViews)
      if (sharedResult.status === 0) {
        return
      }

      pendingHitTests.delete(message.requestId)
      if (!isSharedHit(sharedViews)) {
        resolve(null)
        return
      }

      const hitNode = resolveNodeByFlattenedIndex(sceneState.nodes, sharedResult.hitIndex)
      if (!hitNode) {
        resolve(null)
        return
      }

      resolve({
        index: sharedResult.hitIndex,
        nodeId: hitNode.id,
        nodeType: hitNode.type,
      })
    }
  }

  const start = async () => {
    if (started) {
      return
    }

    if (mode === 'main-thread') {
      started = true
      return
    }

    const createWorker = options.createWorker
    if (!createWorker) {
      started = true
      return
    }

    worker = createWorker()
    worker.addEventListener('message', onWorkerMessage as EventListener)

    const initMessage: {
      type: 'engine.init'
      mode: 'worker-postmessage' | 'worker-shared-memory'
      scene?: EngineSceneSnapshot
      sharedHitTestBuffer?: SharedArrayBuffer
    } = {
      type: 'engine.init',
      mode: mode === 'worker-shared-memory' ? 'worker-shared-memory' : 'worker-postmessage',
      scene: {
        revision: sceneState.revision,
        width: sceneState.width,
        height: sceneState.height,
        nodes: sceneState.nodes,
      },
    }

    if (mode === 'worker-shared-memory') {
      const buffer = createSharedHitTestBuffer()
      sharedViews = attachSharedHitTestViews(buffer)
      initMessage.sharedHitTestBuffer = buffer
    }

    worker.postMessage(initMessage)
    started = true
  }

  const applyPatch = (patch: EngineScenePatch) => {
    applyEngineScenePatch(sceneState, patch)
    if (!worker || mode === 'main-thread') {
      return
    }

    worker.postMessage({
      type: 'engine.scene.patch',
      patch,
    })
  }

  const hitTest = async (point: EnginePoint, tolerance = 0) => {
    if (mode === 'main-thread' || !worker) {
      return hitTestEngineSceneState(sceneState, point, tolerance)
    }

    const requestId = nextRequestId
    nextRequestId += 1

    if (mode === 'worker-shared-memory' && sharedViews) {
      const sharedChannel = sharedViews
      sharedQueue = sharedQueue.then(
        () =>
          new Promise<EngineHitTestResult | null>((resolve) => {
            pendingHitTests.set(requestId, resolve)
            writeSharedHitTestRequest(sharedChannel, requestId, point.x, point.y, tolerance)
            worker?.postMessage({
              type: 'engine.hittest.signal',
              requestId,
            })
          }),
      )
      return sharedQueue
    }

    return new Promise<EngineHitTestResult | null>((resolve) => {
      pendingHitTests.set(requestId, resolve)
      worker?.postMessage({
        type: 'engine.hittest.request',
        request: {
          requestId,
          point,
          tolerance,
        },
      })
    })
  }

  const dispose = () => {
    pendingHitTests.forEach((resolve) => resolve(null))
    pendingHitTests.clear()

    if (!worker) {
      return
    }

    worker.postMessage({ type: 'engine.dispose' })
    worker.removeEventListener('message', onWorkerMessage as EventListener)
    worker.terminate()
    worker = null
    sharedViews = null
  }

  return {
    mode,
    resolution,
    start,
    applyScenePatch: applyPatch,
    hitTest,
    dispose,
  }
}

function resolveBridgeMode(
  base: EngineWorkerModeResolution,
  options: EngineWorkerBridgeOptions,
): EngineWorkerModeResolution {
  if (base.mode === 'main-thread') {
    return base
  }

  if (!options.createWorker) {
    return {
      mode: 'main-thread',
      capabilities: base.capabilities,
      reason: 'worker mode was selected but createWorker was not provided',
    }
  }

  return base
}
