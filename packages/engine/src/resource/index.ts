/**
 * Resource domain barrel aligned with the 2D->3D architecture blueprint.
 */
export type {
  EngineCanvasSurfaceFactory,
  EngineResourceLoader,
  EngineTextLayout,
  EngineTextLayoutContext,
  EngineTextShaper,
} from '../renderer/types/index.ts'
export type {
  GeometryCache,
  GeometryCacheEntry,
  LayeredTileCache,
  LayeredTileCacheKey,
} from '../renderer/cache/index.ts'
export {
  toLayeredTileCacheSignature,
} from '../renderer/cache/index.ts'
