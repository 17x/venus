/// <reference lib="webworker" />

import type { EnginePoint, EngineSceneSnapshot } from '../scene/types.ts'
import type { EngineHitTestResult } from '../scene/hitTest.ts'
import type { EngineScenePatch, EngineScenePatchBatch } from '../scene/patch.ts'
import { createEngineSceneStore } from '../scene/store.ts'

export type { EngineHitTestResult } from '../scene/hitTest.ts'
export type { EngineScenePatch, EngineScenePatchBatch } from '../scene/patch.ts'

export interface EngineHitTestRequest {
  requestId: number
  point: EnginePoint
  tolerance?: number
}

export interface EngineWorkerInitMessage {
  type: 'engine.init'
  mode: 'worker-postmessage' | 'worker-shared-memory'
  scene?: EngineSceneSnapshot
  sharedHitTestBuffer?: SharedArrayBuffer
}

export interface EngineWorkerScenePatchMessage {
  type: 'engine.scene.patch'
  patch: EngineScenePatch
}

export interface EngineWorkerScenePatchBatchMessage {
  type: 'engine.scene.patch.batch'
  batch: EngineScenePatchBatch
}

export interface EngineWorkerHitTestMessage {
  type: 'engine.hittest.request'
  request: EngineHitTestRequest
}

export interface EngineWorkerSharedHitTestSignalMessage {
  type: 'engine.hittest.signal'
  requestId: number
}

export interface EngineWorkerDisposeMessage {
  type: 'engine.dispose'
}

export type EngineWorkerMessage =
  | EngineWorkerInitMessage
  | EngineWorkerScenePatchMessage
  | EngineWorkerScenePatchBatchMessage
  | EngineWorkerHitTestMessage
  | EngineWorkerSharedHitTestSignalMessage
  | EngineWorkerDisposeMessage

export interface EngineWorkerReadyMessage {
  type: 'engine.ready'
  mode: 'worker-postmessage' | 'worker-shared-memory'
}

export interface EngineWorkerHitTestResponseMessage {
  type: 'engine.hittest.response'
  requestId: number
  result: EngineHitTestResult | null
}

export interface EngineWorkerSharedHitTestResponseMessage {
  type: 'engine.hittest.signal.response'
  requestId: number
}

export interface EngineWorkerErrorMessage {
  type: 'engine.error'
  requestId?: number
  message: string
}

export type EngineWorkerResponseMessage =
  | EngineWorkerReadyMessage
  | EngineWorkerHitTestResponseMessage
  | EngineWorkerSharedHitTestResponseMessage
  | EngineWorkerErrorMessage

export interface SharedHitTestViews {
  meta: Int32Array
}

/**
 * Shared layout for one hit-test request/response slot.
 *
 * meta[Int32]:
 * 0 requestToken
 * 1 responseToken
 * 2 status (0 pending, 1 hit, 2 miss)
 * 3 hitIndex
 * 4 pointX * 1000
 * 5 pointY * 1000
 * 6 tolerance * 1000
 * 7 reserved
 */
const SHARED_HIT_TEST_META_LENGTH = 8
const SCALE = 1000

const enum MetaIndex {
  RequestToken = 0,
  ResponseToken = 1,
  Status = 2,
  HitIndex = 3,
  PointX = 4,
  PointY = 5,
  Tolerance = 6,
}

const enum HitStatus {
  Pending = 0,
  Hit = 1,
  Miss = 2,
}

export function createSharedHitTestBuffer() {
  return new SharedArrayBuffer(
    SHARED_HIT_TEST_META_LENGTH * Int32Array.BYTES_PER_ELEMENT,
  )
}

export function attachSharedHitTestViews(buffer: SharedArrayBuffer): SharedHitTestViews {
  return {
    meta: new Int32Array(buffer, 0, SHARED_HIT_TEST_META_LENGTH),
  }
}

export function writeSharedHitTestRequest(
  views: SharedHitTestViews,
  requestToken: number,
  x: number,
  y: number,
  tolerance: number,
) {
  Atomics.store(views.meta, MetaIndex.PointX, Math.round(x * SCALE))
  Atomics.store(views.meta, MetaIndex.PointY, Math.round(y * SCALE))
  Atomics.store(views.meta, MetaIndex.Tolerance, Math.round(tolerance * SCALE))
  Atomics.store(views.meta, MetaIndex.Status, HitStatus.Pending)
  Atomics.store(views.meta, MetaIndex.RequestToken, requestToken)
}

export function readSharedHitTestRequest(views: SharedHitTestViews) {
  return {
    requestToken: Atomics.load(views.meta, MetaIndex.RequestToken),
    point: {
      x: Atomics.load(views.meta, MetaIndex.PointX) / SCALE,
      y: Atomics.load(views.meta, MetaIndex.PointY) / SCALE,
    },
    tolerance: Atomics.load(views.meta, MetaIndex.Tolerance) / SCALE,
  }
}

export function writeSharedHitTestResponse(
  views: SharedHitTestViews,
  requestToken: number,
  hitIndex: number,
) {
  if (hitIndex >= 0) {
    Atomics.store(views.meta, MetaIndex.HitIndex, hitIndex)
    Atomics.store(views.meta, MetaIndex.Status, HitStatus.Hit)
  } else {
    Atomics.store(views.meta, MetaIndex.HitIndex, -1)
    Atomics.store(views.meta, MetaIndex.Status, HitStatus.Miss)
  }

  Atomics.store(views.meta, MetaIndex.ResponseToken, requestToken)
}

export function readSharedHitTestResponse(views: SharedHitTestViews) {
  return {
    responseToken: Atomics.load(views.meta, MetaIndex.ResponseToken),
    status: Atomics.load(views.meta, MetaIndex.Status),
    hitIndex: Atomics.load(views.meta, MetaIndex.HitIndex),
  }
}

export function isSharedHit(views: SharedHitTestViews) {
  return Atomics.load(views.meta, MetaIndex.Status) === HitStatus.Hit
}

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
      // Reset worker-local scene state so reused workers do not leak prior documents.
      sceneStore.loadScene({
        revision: 0,
        width: 0,
        height: 0,
        nodes: [],
      })
      sharedViews = null
    }
  })
}
