/**
 * Renderer cache barrel.
 * Re-exports geometry and tile cache contracts for renderer/runtime callers.
 */
export type {
  GeometryCacheEntry,
} from './geometryCache.ts'

export {
  GeometryCache,
} from './geometryCache.ts'

export type {
  LayeredTileCacheKey,
} from './tileCache.ts'

export {
  LayeredTileCache,
  toLayeredTileCacheSignature,
} from './tileCache.ts'
