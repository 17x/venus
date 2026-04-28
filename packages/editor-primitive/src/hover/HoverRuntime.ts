import type {Point2D} from '@venus/lib'

/**
 * Stores hover hit state for scene and overlay channels.
 */
export interface HoverRuntime<TOverlayHit = unknown, TSceneHit = unknown> {
  /** Stores latest hover point in screen space. */
  screenPoint: Point2D
  /** Stores latest hover point in world space when projection exists. */
  worldPoint?: Point2D
  /** Stores latest overlay hit result. */
  overlayHit?: TOverlayHit | null
  /** Stores latest scene hit result. */
  sceneHit?: TSceneHit | null
  /** Stores previous overlay hit result for transition checks. */
  lastOverlayHit?: TOverlayHit | null
  /** Stores previous scene hit result for transition checks. */
  lastSceneHit?: TSceneHit | null
  /** Indicates whether hover target changed since previous update. */
  changed: boolean
}

/**
 * Creates initial hover runtime at a measured screen point.
 */
export function createHoverRuntime<TOverlayHit = unknown, TSceneHit = unknown>(
  screenPoint: Point2D,
  worldPoint?: Point2D,
): HoverRuntime<TOverlayHit, TSceneHit> {
  return {
    screenPoint,
    worldPoint,
    overlayHit: null,
    sceneHit: null,
    lastOverlayHit: null,
    lastSceneHit: null,
    changed: false,
  }
}

/**
 * Updates hover runtime and computes changed flag from previous hit values.
 */
export function updateHoverRuntime<TOverlayHit = unknown, TSceneHit = unknown>(
  runtime: HoverRuntime<TOverlayHit, TSceneHit>,
  input: {
    /** Stores next hover point in screen space. */
    screenPoint: Point2D
    /** Stores next hover point in world space when available. */
    worldPoint?: Point2D
    /** Stores next overlay hit result. */
    overlayHit?: TOverlayHit | null
    /** Stores next scene hit result. */
    sceneHit?: TSceneHit | null
  },
): HoverRuntime<TOverlayHit, TSceneHit> {
  const overlayHit = input.overlayHit ?? null
  const sceneHit = input.sceneHit ?? null
  const changed = runtime.overlayHit !== overlayHit || runtime.sceneHit !== sceneHit

  return {
    screenPoint: input.screenPoint,
    worldPoint: input.worldPoint,
    overlayHit,
    sceneHit,
    lastOverlayHit: runtime.overlayHit ?? null,
    lastSceneHit: runtime.sceneHit ?? null,
    changed,
  }
}

