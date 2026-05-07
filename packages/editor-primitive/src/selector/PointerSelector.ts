import type {Point2D} from '@venus/lib'
import {
  createDefaultSelectorQueryOptions,
  type SelectorEngine,
  type SelectorMatchMode,
  type SelectorOverlayItem,
  type SelectorQueryOptions,
  type SelectorRect,
  type SelectorSelectionMode,
} from './SelectorContracts.ts'

/**
 * Defines pointer-selector state phases.
 */
export type PointerSelectorPhase = 'idle' | 'pending' | 'marquee'

/**
 * Defines pointer selector runtime state.
 */
export interface PointerSelectorState {
  /** Stores current state phase. */
  phase: PointerSelectorPhase
  /** Stores pointer-down start in world coordinates. */
  startWorld: Point2D | null
  /** Stores current pointer in world coordinates. */
  currentWorld: Point2D | null
}

/**
 * Defines pointer selector runtime configuration.
 */
export interface PointerSelectorConfig {
  /** Stores drag threshold in screen pixels used to enter marquee mode. */
  dragThresholdPx: number
  /** Stores default rectangle match policy for marquee selection. */
  defaultRectMode: SelectorMatchMode
}

/**
 * Defines normalized modifier keys consumed by pointer selector.
 */
export interface PointerSelectorModifiers {
  /** Indicates additive selection modifier. */
  shiftKey?: boolean
  /** Indicates toggle selection modifier (macOS cmd). */
  metaKey?: boolean
  /** Indicates toggle selection modifier (Windows/Linux ctrl). */
  ctrlKey?: boolean
  /** Indicates subtractive selection modifier. */
  altKey?: boolean
}

/**
 * Defines pointer-selector state transition output.
 */
export interface PointerSelectorTransition {
  /** Stores next runtime state. */
  state: PointerSelectorState
  /** Stores optional selection ids and mode emitted on pointer-up. */
  selection?: {
    /** Stores selected target ids resolved by selector engine. */
    targetIds: string[]
    /** Stores selection mutation mode. */
    mode: SelectorSelectionMode
  }
  /** Stores overlay items emitted for renderer adapters. */
  overlays: SelectorOverlayItem[]
}

/**
 * Creates default pointer selector configuration.
 */
export function createDefaultPointerSelectorConfig(): PointerSelectorConfig {
  return {
    dragThresholdPx: 3,
    defaultRectMode: 'contain',
  }
}

/**
 * Creates idle pointer selector state.
 */
export function createPointerSelectorState(): PointerSelectorState {
  return {
    phase: 'idle',
    startWorld: null,
    currentWorld: null,
  }
}

/**
 * Applies pointer-down transition and enters pending phase.
 */
export function resolvePointerSelectorPointerDown(
  pointWorld: Point2D,
): PointerSelectorTransition {
  return {
    state: {
      phase: 'pending',
      startWorld: pointWorld,
      currentWorld: pointWorld,
    },
    overlays: [],
  }
}

/**
 * Applies pointer-move transition and emits marquee overlay when threshold is crossed.
 */
export function resolvePointerSelectorPointerMove(
  state: PointerSelectorState,
  input: {
    pointWorld: Point2D
    pointScreen: Point2D
    startScreen: Point2D | null
    config?: Partial<PointerSelectorConfig>
  },
): PointerSelectorTransition {
  if (state.phase === 'idle' || !state.startWorld) {
    return {
      state,
      overlays: [],
    }
  }

  const config = {
    ...createDefaultPointerSelectorConfig(),
    ...input.config,
  }
  const nextState: PointerSelectorState = {
    ...state,
    currentWorld: input.pointWorld,
  }

  const startScreen = input.startScreen
  const dragDistance = startScreen
    ? Math.hypot(input.pointScreen.x - startScreen.x, input.pointScreen.y - startScreen.y)
    : Number.POSITIVE_INFINITY
  const shouldMarquee = state.phase === 'marquee' || dragDistance > config.dragThresholdPx

  if (!shouldMarquee) {
    return {
      state: nextState,
      overlays: [],
    }
  }

  const marqueeRect = normalizeSelectorRect(state.startWorld, input.pointWorld)

  return {
    state: {
      ...nextState,
      phase: 'marquee',
    },
    overlays: [createMarqueeOverlayItem(marqueeRect)],
  }
}

/**
 * Applies pointer-up transition and resolves click/rect selection output.
 */
export function resolvePointerSelectorPointerUp<TTargetId extends string>(
  state: PointerSelectorState,
  input: {
    pointWorld: Point2D
    selector: SelectorEngine<TTargetId>
    modifiers?: PointerSelectorModifiers
    queryOptions?: Partial<SelectorQueryOptions>
    config?: Partial<PointerSelectorConfig>
  },
): PointerSelectorTransition {
  const nextState = createPointerSelectorState()

  if (!state.startWorld) {
    return {
      state: nextState,
      overlays: [],
    }
  }

  const selectionMode = resolveSelectionModeFromModifiers(input.modifiers)
  const queryOptions = {
    ...createDefaultSelectorQueryOptions(),
    ...input.queryOptions,
  }

  if (state.phase === 'marquee' && state.currentWorld) {
    const config = {
      ...createDefaultPointerSelectorConfig(),
      ...input.config,
    }
    const rect = normalizeSelectorRect(state.startWorld, state.currentWorld)
    const targetIds = input.selector.selectRect(rect, {
      ...queryOptions,
      mode: input.modifiers?.shiftKey ? 'intersect' : config.defaultRectMode,
    })

    return {
      state: nextState,
      overlays: [],
      selection: {
        targetIds,
        mode: selectionMode,
      },
    }
  }

  const targetIds = input.selector.selectPoint(input.pointWorld, queryOptions)

  return {
    state: nextState,
    overlays: [],
    selection: {
      targetIds,
      mode: selectionMode,
    },
  }
}

/**
 * Resolves normalized rectangle from two world points.
 */
export function normalizeSelectorRect(from: Point2D, to: Point2D): SelectorRect {
  return {
    minX: Math.min(from.x, to.x),
    minY: Math.min(from.y, to.y),
    maxX: Math.max(from.x, to.x),
    maxY: Math.max(from.y, to.y),
  }
}

/**
 * Resolves selection mutation mode from keyboard modifiers.
 */
export function resolveSelectionModeFromModifiers(
  modifiers?: PointerSelectorModifiers,
): SelectorSelectionMode {
  if (modifiers?.shiftKey) {
    return 'add'
  }

  if (modifiers?.altKey) {
    return 'remove'
  }

  if (modifiers?.metaKey || modifiers?.ctrlKey) {
    return 'toggle'
  }

  return 'replace'
}

/**
 * Creates marquee overlay descriptor from world-space rectangle.
 */
function createMarqueeOverlayItem(rect: SelectorRect): SelectorOverlayItem {
  return {
    type: 'marquee',
    geometry: {
      primitive: 'rect',
      points: [
        {x: rect.minX, y: rect.minY},
        {x: rect.maxX, y: rect.maxY},
      ],
    },
    style: {
      stroke: 'rgba(37, 99, 235, 0.95)',
      fill: 'rgba(37, 99, 235, 0.12)',
      dash: [4, 2],
      width: 1,
    },
    zIndex: 30,
  }
}
