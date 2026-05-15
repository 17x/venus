import type { EngineFrustum, EngineRect2 } from '../../math/dimension/types.ts'
import type { EngineNodeId, EngineSceneSnapshot } from '../types/types.ts'

/**
 * Declares the query mode consumed by visibility resolver entry points.
 */
export type EngineVisibilityQueryMode = 'bounds-2d' | 'frustum-3d'

/**
 * Declares one 2D bounds query payload for visibility candidate collection.
 */
export interface EngineVisibilityBounds2DQuery {
  /** Query mode discriminant used by resolver narrowing. */
  mode: 'bounds-2d'
  /** Axis-aligned world-space bounds used by current 2D coarse culling. */
  bounds: EngineRect2
}

/**
 * Declares one 3D frustum query payload for visibility candidate collection.
 */
export interface EngineVisibilityFrustum3DQuery {
  /** Query mode discriminant used by resolver narrowing. */
  mode: 'frustum-3d'
  /** Camera frustum used by 3D culling implementations. */
  frustum: EngineFrustum
}

/**
 * Declares supported visibility query inputs.
 */
export type EngineVisibilityQuery =
  | EngineVisibilityBounds2DQuery
  | EngineVisibilityFrustum3DQuery

/**
 * Declares minimal viewport payload required to build 2D visibility bounds.
 */
export interface EngineVisibilityViewport2D {
  /** Viewport width in CSS pixels. */
  viewportWidth: number
  /** Viewport height in CSS pixels. */
  viewportHeight: number
  /** Camera X offset in screen space. */
  offsetX: number
  /** Camera Y offset in screen space. */
  offsetY: number
  /** Camera scale factor. */
  scale: number
}

/**
 * Declares one resolved visible-set snapshot consumed by planners and runtime.
 */
export interface EngineVisibleSet {
  /** Source scene revision used when the visible set was resolved. */
  revision: string | number
  /** Query mode used to collect the visible ids. */
  mode: EngineVisibilityQueryMode
  /** Visible node ids produced by coarse visibility evaluation. */
  nodeIds: readonly EngineNodeId[]
  /** Count of visible ids in this visible set. */
  visibleCount: number
  /** Total flattened scene node count used to compute culling diagnostics. */
  sceneNodeCount: number
  /** Coarse culling count computed as sceneNodeCount - visibleCount. */
  culledCount: number
  /** Optional source bounds when the query mode is bounds-2d. */
  bounds2D?: EngineRect2
}

/**
 * Declares one 2D bounds query callback contract.
 */
export type EngineVisibilityBounds2DResolver = (bounds: EngineRect2) => EngineNodeId[]

/**
 * Declares one 3D frustum query callback contract.
 */
export type EngineVisibilityFrustum3DResolver = (
  scene: EngineSceneSnapshot,
  frustum: EngineFrustum,
) => EngineNodeId[]
