import type {DocumentNode} from '@venus/document-core'
import type {EngineSpatialIndex} from '@venus/engine'

export type WorkerSpatialIndex = EngineSpatialIndex<{
  shapeId: string
  type: DocumentNode['type']
  order: number
}>
