// Compatibility forwarding barrel; cache ownership lives in core/cache and
// renderer backends should import from core/cache or the public engine barrel.

export type {
  GeometryCacheEntry,
} from '../../core/cache/index.ts'

export {
  GeometryCache,
} from '../../core/cache/index.ts'

export type {
  LayeredTileCacheKey,
} from '../../core/cache/index.ts'

export {
  LayeredTileCache,
  toLayeredTileCacheSignature,
} from '../../core/cache/index.ts'
