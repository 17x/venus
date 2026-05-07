import type {DocumentNode} from '../../model/index.ts'
import type {EngineSpatialIndex} from '@venus/engine'

export type WorkerSpatialIndex = EngineSpatialIndex<{
  shapeId: string
  type: DocumentNode['type']
  order: number
}>
