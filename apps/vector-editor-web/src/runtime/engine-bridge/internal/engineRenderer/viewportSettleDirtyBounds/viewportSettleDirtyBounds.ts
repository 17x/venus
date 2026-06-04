/**
 * Declares viewport inputs required to compute settle-phase dirty bounds.
 */
export interface ViewportSettleDirtyBoundsInput {
  /** Current viewport width in pixels. */
  viewportWidth: number
  /** Current viewport height in pixels. */
  viewportHeight: number
  /** Current viewport world offset X. */
  offsetX: number
  /** Current viewport world offset Y. */
  offsetY: number
  /** Current zoom scale. */
  scale: number
}

/**
 * Declares one dirty-rectangle payload in world coordinates.
 */
export interface ViewportWorldDirtyBounds {
  /** Dirty rectangle origin X in world coordinates. */
  x: number
  /** Dirty rectangle origin Y in world coordinates. */
  y: number
  /** Dirty rectangle width in world coordinates. */
  width: number
  /** Dirty rectangle height in world coordinates. */
  height: number
}

/**
 * Declares tunable thresholds used by settle-phase dirty-bounds computation.
 */
export interface ViewportSettleDirtyBoundsThresholds {
  /**
   * Minimum allowed absolute scale before settle dirty marking is skipped.
   */
  minScaleForDirtyMark: number
  /**
   * Maximum allowed dirty width/height in world coordinates.
   */
  maxWorldExtent: number
}

/**
 * Default minimum scale used to avoid exploding world dirty extents at extreme zoom-out.
 */
export const DEFAULT_MIN_SCALE_FOR_SETTLE_DIRTY_MARK = 0.02

/**
 * Default world extent clamp for settle-phase forced dirty marking.
 */
export const DEFAULT_MAX_SETTLE_DIRTY_WORLD_EXTENT = 40_000

/**
 * Resolves whether a viewport commit changes zoom sampling and therefore must
 * invalidate the newly visible world region.
 */
export function shouldInvalidateViewportForScaleChange(
  previousScale: number | null,
  nextScale: number,
): boolean {
  return previousScale === null || Math.abs(previousScale - nextScale) > Number.EPSILON
}

/**
 * Resolves one viewport-settle dirty rectangle while guarding extreme low-scale expansion.
 * @param input Viewport dimensions, offsets, and scale for the current settle frame.
 * @param thresholds Optional thresholds for low-scale skip and world-extent clamp.
 */
export function resolveViewportSettleDirtyBounds(
  input: ViewportSettleDirtyBoundsInput,
  thresholds: ViewportSettleDirtyBoundsThresholds = {
    minScaleForDirtyMark: DEFAULT_MIN_SCALE_FOR_SETTLE_DIRTY_MARK,
    maxWorldExtent: DEFAULT_MAX_SETTLE_DIRTY_WORLD_EXTENT,
  },
): ViewportWorldDirtyBounds | null {
  const safeScale = Math.max(Number.EPSILON, Math.abs(input.scale))
  if (safeScale < thresholds.minScaleForDirtyMark) {
    return null
  }

  const rawWorldWidth = input.viewportWidth / safeScale
  const rawWorldHeight = input.viewportHeight / safeScale
  const worldWidth = Math.min(rawWorldWidth, thresholds.maxWorldExtent)
  const worldHeight = Math.min(rawWorldHeight, thresholds.maxWorldExtent)

  // Preserve dirty-rectangle center while clamping extent so settle redraw stays
  // spatially aligned to current viewport even when extent is bounded.
  const worldCenterX = -input.offsetX / safeScale + rawWorldWidth * 0.5
  const worldCenterY = -input.offsetY / safeScale + rawWorldHeight * 0.5

  return {
    x: worldCenterX - worldWidth * 0.5,
    y: worldCenterY - worldHeight * 0.5,
    width: worldWidth,
    height: worldHeight,
  }
}
