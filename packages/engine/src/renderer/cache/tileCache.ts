// Compatibility forwarding module; tile cache ownership lives in core/cache so
// renderer backends do not own backend-neutral tile key contracts.

export type {
  LayeredTileCacheKey,
} from '../../core/cache/tileCache.ts'

export {
  LayeredTileCache,
  toLayeredTileCacheSignature,
} from '../../core/cache/tileCache.ts'
