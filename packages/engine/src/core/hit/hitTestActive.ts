// Core active-layer hit-test owns backend-neutral active command priority;
// renderer backends must not define interaction hit ordering.

import type { EngineDrawCommand } from '../types.ts'

/**
 * Resolves first active-layer command hit by world-space point.
 * @param commands Draw commands in composed or layer order.
 * @param point World-space point.
 */
export function hitTestActiveLayer(
  commands: readonly EngineDrawCommand[],
  point: { x: number; y: number },
): EngineDrawCommand | null {
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index]
    if (!command || command.layer !== 'active') {
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
