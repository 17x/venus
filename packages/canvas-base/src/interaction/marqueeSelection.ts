// Shared marquee (box-select) primitives for app-level selector workflows.
export interface MarqueePoint {
  x: number
  y: number
}

export interface MarqueeBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type MarqueeSelectionMode = 'replace' | 'add' | 'toggle'
export type MarqueeSelectionMatchMode = 'intersect' | 'contain'

export interface MarqueeState {
  start: MarqueePoint
  current: MarqueePoint
  mode: MarqueeSelectionMode
}

export interface MarqueeSelectableShape {
  id: string
  x: number
  y: number
  width: number
  height: number
  type?: string
}

export function createMarqueeState(
  start: MarqueePoint,
  mode: MarqueeSelectionMode,
): MarqueeState {
  return {
    start,
    current: start,
    mode,
  }
}

export function updateMarqueeState(
  state: MarqueeState,
  current: MarqueePoint,
): MarqueeState {
  return {
    ...state,
    current,
  }
}

export function resolveMarqueeBounds(state: MarqueeState): MarqueeBounds {
  return getNormalizedBounds(
    state.start.x,
    state.start.y,
    state.current.x - state.start.x,
    state.current.y - state.start.y,
  )
}

export function resolveMarqueeSelection(
  shapes: MarqueeSelectableShape[],
  bounds: MarqueeBounds,
  options?: {
    matchMode?: MarqueeSelectionMatchMode
    excludeShape?: (shape: MarqueeSelectableShape) => boolean
  },
) {
  const matchMode = options?.matchMode ?? 'intersect'
  const excludeShape = options?.excludeShape

  return shapes
    .filter((shape) => !excludeShape?.(shape))
    .filter((shape) => {
      const shapeBounds = getNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
      return matchMode === 'contain'
        ? containsBounds(bounds, shapeBounds)
        : intersectsBounds(bounds, shapeBounds)
    })
    .map((shape) => shape.id)
}

export function getNormalizedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
): MarqueeBounds {
  return {
    minX: Math.min(x, x + width),
    minY: Math.min(y, y + height),
    maxX: Math.max(x, x + width),
    maxY: Math.max(y, y + height),
  }
}

export function intersectsBounds(
  left: MarqueeBounds,
  right: MarqueeBounds,
) {
  return !(
    left.maxX < right.minX ||
    right.maxX < left.minX ||
    left.maxY < right.minY ||
    right.maxY < left.minY
  )
}

export function containsBounds(
  container: MarqueeBounds,
  target: MarqueeBounds,
) {
  return (
    target.minX >= container.minX &&
    target.maxX <= container.maxX &&
    target.minY >= container.minY &&
    target.maxY <= container.maxY
  )
}
