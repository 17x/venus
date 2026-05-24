/**
 * Defines tunable config for adaptive hit-test tolerance scaling.
 */
export interface EngineAdaptiveHitToleranceConfig {
  /** Stores baseline tolerance in screen pixels at reference conditions. */
  basePx: number
  /** Stores minimum allowed screen-space tolerance. */
  minPx: number
  /** Stores maximum allowed screen-space tolerance. */
  maxPx: number
  /** Stores reference viewport diagonal used for screen-size normalization. */
  referenceViewportDiagonalPx: number
  /** Stores exponent controlling zoom sensitivity. */
  zoomExponent: number
  /** Stores exponent controlling viewport-size sensitivity. */
  screenExponent: number
}

/**
 * Defines adaptive tolerance resolve input.
 */
export interface ResolveEngineAdaptiveHitToleranceOptions {
  /** Stores viewport scale for world/screen conversion. */
  viewportScale?: number
  /** Stores viewport width in screen px. */
  viewportWidth?: number
  /** Stores viewport height in screen px. */
  viewportHeight?: number
  /** Stores optional base override in screen px. */
  basePx?: number
  /** Stores optional tuning overrides. */
  config?: Partial<EngineAdaptiveHitToleranceConfig>
}

/**
 * Defines adaptive tolerance resolve output.
 */
export interface EngineAdaptiveHitTolerance {
  /** Stores resolved screen-space tolerance in px. */
  screenPx: number
  /** Stores world-space tolerance in scene units. */
  worldPx: number
}

const DEFAULT_ADAPTIVE_HIT_TOLERANCE_CONFIG: EngineAdaptiveHitToleranceConfig = {
  basePx: 6,
  minPx: 2,
  maxPx: 10,
  referenceViewportDiagonalPx: 1400,
  zoomExponent: 0.35,
  screenExponent: 0.2,
}

/**
 * Resolves adaptive hit tolerance that shrinks under higher zoom and larger screens.
  * @param options Options object for this operation.
*/
export function resolveEngineAdaptiveHitTolerance(
  options?: ResolveEngineAdaptiveHitToleranceOptions,
): EngineAdaptiveHitTolerance {
  const config = {
    ...DEFAULT_ADAPTIVE_HIT_TOLERANCE_CONFIG,
    ...(options?.config ?? {}),
  }
  const viewportScale = Math.max(Number.EPSILON, options?.viewportScale ?? 1)
  const viewportDiagonal = Math.max(
    1,
    Math.hypot(options?.viewportWidth ?? 0, options?.viewportHeight ?? 0),
  )
  const referenceDiagonal = Math.max(1, config.referenceViewportDiagonalPx)
  const basePx = options?.basePx ?? config.basePx

  // Keep high zooms less sticky by shrinking tolerance in screen space.
  const zoomFactor = 1 / Math.pow(viewportScale, Math.max(0, config.zoomExponent))
  // Keep very large screens from over-inflating hit regions in physical pointer travel.
  const screenFactor = Math.pow(referenceDiagonal / viewportDiagonal, Math.max(0, config.screenExponent))
  const rawScreenPx = basePx * zoomFactor * screenFactor
  const screenPx = clamp(rawScreenPx, config.minPx, config.maxPx)

  return {
    screenPx,
    worldPx: screenPx / viewportScale,
  }
}

/**
 * Clamps one numeric value into [min, max] range.
  * @param value value parameter.
 * @param min min parameter.
 * @param max max parameter.
*/
function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
