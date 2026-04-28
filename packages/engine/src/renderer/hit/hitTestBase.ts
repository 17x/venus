import type { EngineDrawCommand } from '../../core/types.ts'

/**
 * Resolves first base-layer command hit by world-space point.
  * @param commands commands parameter.
 * @param point point parameter.
*/
export function hitTestBaseLayer(
  commands: readonly EngineDrawCommand[],
  point: { x: number; y: number },
): EngineDrawCommand | null {
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index]
    if (!command || command.layer !== 'base') {
      continue
    }

    if (isPointInsideBounds(point, command.bounds)) {
      return command
    }
  }

  return null
}

/**
 * Checks whether one point is inside axis-aligned bounds.
  * @param point point parameter.
 * @param bounds Bounds data.
*/
function isPointInsideBounds(
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number },
) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  )
}
