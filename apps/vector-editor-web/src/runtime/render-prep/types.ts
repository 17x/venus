export type PreparedPassKind = 'scene' | 'overlay' | 'picking'

export interface PreparedBatchRange {
  start: number
  count: number
}

export interface PreparedBatch {
  batchId: string
  geometryKey: string
  pipelineKey: string
  instanceCount: number
  ranges?: PreparedBatchRange[]
}

export interface BufferRangeUpdate {
  batchId: string
  start: number
  count: number
  reason?: string
}

export interface UniformUpdate {
  scope: 'global' | PreparedPassKind
  name: string
  value: unknown
}

export interface PreparedPass {
  kind: PreparedPassKind
  dirty: boolean
  batches: PreparedBatch[]
  instanceUpdates: BufferRangeUpdate[]
  uniformUpdates: UniformUpdate[]
}

export interface PreparedDirtyState {
  sceneStructureDirty: boolean
  sceneInstanceIds: string[]
  previousFrameCandidateCount: number
  dirtyCandidateCount: number
  dirtyOffscreenCount: number
  overlayDirty: boolean
  pickingDirty: boolean
  cameraDirty: boolean
}

export interface PreparedRenderFrame {
  revision: number
  scene: PreparedPass
  overlay: PreparedPass
  picking?: PreparedPass
  dirtyState: PreparedDirtyState
}
