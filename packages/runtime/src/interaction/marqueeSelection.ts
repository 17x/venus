// Shared marquee (box-select) primitives for app-level selector workflows.
export type {
  EngineMarqueeApplyMode as MarqueeApplyMode,
  EngineMarqueeBounds as MarqueeBounds,
  EngineMarqueePoint as MarqueePoint,
  EngineMarqueeSelectionMatchMode as MarqueeSelectionMatchMode,
  EngineMarqueeSelectionMode as MarqueeSelectionMode,
  EngineMarqueeState as MarqueeState,
} from '@venus/engine'

import type {EngineMarqueeSelectableShape} from '@venus/engine'

export type MarqueeSelectableShape = EngineMarqueeSelectableShape & {
  type?: string
}

export {
  containsEngineBounds as containsBounds,
  createEngineMarqueeState as createMarqueeState,
  getEngineNormalizedBounds as getNormalizedBounds,
  intersectsEngineBounds as intersectsBounds,
  resolveEngineMarqueeBounds as resolveMarqueeBounds,
  resolveEngineMarqueeSelection as resolveMarqueeSelection,
  updateEngineMarqueeState as updateMarqueeState,
} from '@venus/engine'
