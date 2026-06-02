import type {EngineMaterialEntity} from '@venus/engine'

/** Declares one minimal graph node contract accepted by playground scene builders. */
type PlaygroundSceneNode = {
  /** Stable node id required by engine graph ingestion. */
  id: string
  /** Pass-through node payload fields consumed by runtime adapters. */
  [key: string]: unknown
}

/**
 * Declares minimal scene snapshot contract used by playground demos.
 */
export interface PlaygroundSceneSnapshot {
  /** Monotonic scene revision forwarded to engine graph revision. */
  revision: string | number
  /** Logical scene width used for viewport fitting. */
  width: number
  /** Logical scene height used for viewport fitting. */
  height: number
  /** Renderable node list forwarded to engine setGraph/updateGraph calls. */
  nodes: PlaygroundSceneNode[]
  /** Optional engine material entities forwarded with graph nodes for native texture/material validation. */
  materials?: readonly EngineMaterialEntity[]
}
