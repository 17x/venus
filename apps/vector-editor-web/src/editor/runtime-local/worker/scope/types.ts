import type {DocumentNode} from '@vector/model'
import type {EngineSpatialIndex} from '@venus/engine'

export type WorkerSpatialIndex = EngineSpatialIndex<{
  shapeId: string
  type: DocumentNode['type']
  order: number
}>
