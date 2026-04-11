export interface EngineMarqueePoint {
  x: number
  y: number
}

export interface EngineMarqueeBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type EngineMarqueeSelectionMode = 'replace' | 'add' | 'remove' | 'toggle'
export type EngineMarqueeSelectionMatchMode = 'intersect' | 'contain'
export type EngineMarqueeApplyMode = 'on-pointer-up' | 'while-pointer-move'

export interface EngineMarqueeState {
  start: EngineMarqueePoint
  current: EngineMarqueePoint
  mode: EngineMarqueeSelectionMode
  applyMode: EngineMarqueeApplyMode
}

export interface EngineMarqueeSelectableShape {
  id: string
  x: number
  y: number
  width: number
  height: number
  type?: string
}

export function createEngineMarqueeState(
  start: EngineMarqueePoint,
  mode: EngineMarqueeSelectionMode,
  options?: {
    applyMode?: EngineMarqueeApplyMode
  },
): EngineMarqueeState {
  return {
    start,
    current: start,
    mode,
    applyMode: options?.applyMode ?? 'on-pointer-up',
  }
}

export function updateEngineMarqueeState(
  state: EngineMarqueeState,
  current: EngineMarqueePoint,
): EngineMarqueeState {
  return {
    ...state,
    current,
  }
}

export function resolveEngineMarqueeBounds(state: EngineMarqueeState): EngineMarqueeBounds {
  return getEngineNormalizedBounds(
    state.start.x,
    state.start.y,
    state.current.x - state.start.x,
    state.current.y - state.start.y,
  )
}

export function resolveEngineMarqueeSelection(
  shapes: EngineMarqueeSelectableShape[],
  bounds: EngineMarqueeBounds,
  options?: {
    matchMode?: EngineMarqueeSelectionMatchMode
    excludeShape?: (shape: EngineMarqueeSelectableShape) => boolean
  },
) {
  const matchMode = options?.matchMode ?? 'intersect'
  const excludeShape = options?.excludeShape

  return shapes
    .filter((shape) => !excludeShape?.(shape))
    .filter((shape) => {
      const shapeBounds = getEngineNormalizedBounds(shape.x, shape.y, shape.width, shape.height)
      return matchMode === 'contain'
        ? containsEngineBounds(bounds, shapeBounds)
        : intersectsEngineBounds(bounds, shapeBounds)
    })
    .map((shape) => shape.id)
}

export function getEngineNormalizedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
): EngineMarqueeBounds {
  const maxX = x + width
  const maxY = y + height
  return {
    minX: Math.min(x, maxX),
    minY: Math.min(y, maxY),
    maxX: Math.max(x, maxX),
    maxY: Math.max(y, maxY),
  }
}

export function intersectsEngineBounds(
  left: EngineMarqueeBounds,
  right: EngineMarqueeBounds,
) {
  return !(
    left.maxX < right.minX ||
    right.maxX < left.minX ||
    left.maxY < right.minY ||
    right.maxY < left.minY
  )
}

export function containsEngineBounds(
  container: EngineMarqueeBounds,
  target: EngineMarqueeBounds,
) {
  return (
    target.minX >= container.minX &&
    target.maxX <= container.maxX &&
    target.minY >= container.minY &&
    target.maxY <= container.maxY
  )
}
