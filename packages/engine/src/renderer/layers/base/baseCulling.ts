import { doBoundsOverlap } from '../../../scene/geometry/bbox.ts'

/**
 * Resolves whether one command bounds should be culled by viewport bounds.
  * @param commandBounds commandBounds parameter.
 * @param viewportBounds viewportBounds parameter.
*/
export function shouldCullBaseCommand(
  commandBounds: { x: number; y: number; width: number; height: number },
  viewportBounds: { x: number; y: number; width: number; height: number } | undefined,
) {
  if (!viewportBounds) {
    return false
  }

  return !doBoundsOverlap(commandBounds, viewportBounds)
}
