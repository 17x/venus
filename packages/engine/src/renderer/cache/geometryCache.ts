// Compatibility forwarding module; geometry cache ownership lives in core/cache
// so renderer backends do not own backend-neutral cache contracts.

export type {
  GeometryCacheEntry,
} from '../../core/cache/geometryCache.ts'

export {
  GeometryCache,
} from '../../core/cache/geometryCache.ts'
