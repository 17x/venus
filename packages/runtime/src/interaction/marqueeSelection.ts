import {
  containsEngineBounds,
  createEngineMarqueeState,
  getEngineNormalizedBounds,
  intersectsEngineBounds,
  resolveEngineMarqueeBounds,
  resolveEngineMarqueeSelection,
  updateEngineMarqueeState,
  type EngineMarqueeApplyMode,
  type EngineMarqueeBounds,
  type EngineMarqueePoint,
  type EngineMarqueeSelectableShape,
  type EngineMarqueeSelectionMatchMode,
  type EngineMarqueeSelectionMode,
  type EngineMarqueeState,
} from '@venus/engine'

// Shared marquee (box-select) primitives for app-level selector workflows.
export type MarqueePoint = EngineMarqueePoint
export type MarqueeBounds = EngineMarqueeBounds
export type MarqueeSelectionMode = EngineMarqueeSelectionMode
export type MarqueeSelectionMatchMode = EngineMarqueeSelectionMatchMode
export type MarqueeApplyMode = EngineMarqueeApplyMode
export type MarqueeState = EngineMarqueeState
export type MarqueeSelectableShape = EngineMarqueeSelectableShape & {
  type?: string
}

export function createMarqueeState(
  start: MarqueePoint,
  mode: MarqueeSelectionMode,
  options?: {
    applyMode?: MarqueeApplyMode
  },
): MarqueeState {
  return createEngineMarqueeState(start, mode, options)
}

export function updateMarqueeState(
  state: MarqueeState,
  current: MarqueePoint,
): MarqueeState {
  return updateEngineMarqueeState(state, current)
}

export function resolveMarqueeBounds(state: MarqueeState): MarqueeBounds {
  return resolveEngineMarqueeBounds(state)
}

export function resolveMarqueeSelection(
  shapes: MarqueeSelectableShape[],
  bounds: MarqueeBounds,
  options?: {
    matchMode?: MarqueeSelectionMatchMode
    excludeShape?: (shape: MarqueeSelectableShape) => boolean
  },
) {
  return resolveEngineMarqueeSelection(shapes, bounds, options)
}

export function getNormalizedBounds(
  x: number,
  y: number,
  width: number,
  height: number,
): MarqueeBounds {
  return getEngineNormalizedBounds(x, y, width, height)
}

export function intersectsBounds(
  left: MarqueeBounds,
  right: MarqueeBounds,
) {
  return intersectsEngineBounds(left, right)
}

export function containsBounds(
  container: MarqueeBounds,
  target: MarqueeBounds,
) {
  return containsEngineBounds(container, target)
}
