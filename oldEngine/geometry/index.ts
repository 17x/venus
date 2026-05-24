/**
 * Geometry domain barrel aligned with the 2D->3D architecture blueprint.
 */
export type {
  EngineGeometryBounds,
} from '../scene/geometry/bbox.ts'
export {
  doBoundsOverlap,
  resolveGroupBounds,
  resolveRenderableNodeBounds,
  unionBounds,
} from '../scene/geometry/bbox.ts'
export {
  resolveLeafNodeWorldBounds,
  toWorldAxisAlignedBounds,
} from '../scene/worldBounds/worldBounds.ts'
