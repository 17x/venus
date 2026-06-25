// Core cache barrel exposes backend-neutral cache contracts; renderer-specific
// resource caches must stay in renderer backend modules.

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
