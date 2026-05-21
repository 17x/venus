import type { EngineSpatialBounds, EngineSpatialIndex, EngineSpatialItem } from './index.ts'

/**
 * Resolves spatial query results from index using one explicit bounds payload.
  * @param index Index value.
 * @param bounds Bounds data.
*/
export function querySpatialIndex<TMeta>(
  index: EngineSpatialIndex<TMeta>,
  bounds: EngineSpatialBounds,
): Array<EngineSpatialItem<TMeta>> {
  return index.search(bounds)
}
