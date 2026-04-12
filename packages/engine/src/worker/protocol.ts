import type { EnginePoint, EngineSceneSnapshot } from '../scene/types.ts'
import type { EngineHitTestResult } from '../scene/hitTest.ts'
import type { EngineScenePatch, EngineScenePatchBatch } from '../scene/patch.ts'

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
