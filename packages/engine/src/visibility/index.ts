/**
 * Visibility domain barrel aligned with the 2D->3D architecture blueprint.
 */
export type {
  EngineVisibleSet,
  EngineVisibilityBounds2DQuery,
  EngineVisibilityBounds2DResolver,
  EngineVisibilityFrustum3DQuery,
  EngineVisibilityFrustum3DResolver,
  EngineVisibilityQuery,
  EngineVisibilityQueryMode,
  EngineVisibilityViewport2D,
} from '../scene/visibility/contracts.ts'
export type {
  CreateEngineVisibilityResolverOptions,
  EngineVisibilityResolver,
} from '../scene/visibility/visibility.ts'
export {
  createEngineVisibilityResolver,
  resolveEngineBounds2DVisibilityQuery,
} from '../scene/visibility/visibility.ts'
