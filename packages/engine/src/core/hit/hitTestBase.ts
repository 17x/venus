// Core layered hit-test owns backend-neutral draw-command picking; renderer
// backends emit commands but must not own hit-test policy.

import type { EngineDrawCommand } from '../types.ts'

/**
 * Resolves first base-layer command hit by world-space point.
 * @param commands Draw commands in composed or layer order.
 * @param point World-space point.
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
 * @param point World-space point.
 * @param bounds Command bounds.
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
