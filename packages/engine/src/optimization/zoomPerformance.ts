/**
 * Renderer zoom-performance strategy module.
 * Owns zoom bucket thresholds and render strategy resolution contracts.
 * Does not perform frame rendering, packet compilation, or resource management.
 */
export interface EngineZoomStrategyConfig {
  // Maximum zoom for overview rendering mode.
  overviewMaxZoom?: number
  // Maximum zoom for simplified tile rendering mode.
  simplifiedTileMaxZoom?: number
  // Maximum zoom for normal tile rendering mode.
  normalTileMaxZoom?: number
  // Maximum zoom for local tile + vector hybrid mode.
  localHybridMaxZoom?: number
  // Visible element count threshold for preferring local precise rendering.
  localRenderElementThreshold?: number
}

export interface EngineZoomPerformanceConfig {
  // Minimum camera zoom accepted by the dynamic bucket generator.
  minZoom?: number
  // Maximum camera zoom accepted by the dynamic bucket generator.
  maxZoom?: number
  // Multiplicative bucket step (must be greater than 1).
  bucketStep?: number
  // Number of neighboring buckets kept active around the current bucket.
  activeBucketRadius?: number
  // Strategy thresholds used to resolve render mode by zoom + density.
  strategy?: EngineZoomStrategyConfig
}

export type ZoomRenderStrategy =
  | 'overview'
  | 'simplified-tile'
  | 'normal-tile'
  | 'local-tile-vector-hybrid'
  | 'local-precise'

const ZOOM_STRATEGY_NORMAL_TILE_MAX_ZOOM_DEFAULT = 8
const ZOOM_STRATEGY_SIMPLIFIED_TILE_MAX_ZOOM_DENOMINATOR = 8
const ZOOM_STRATEGY_OVERVIEW_MAX_ZOOM_DENOMINATOR = 32
const ZOOM_BUCKET_STEP_DEFAULT = 2

export const DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG: Required<
  Omit<EngineZoomPerformanceConfig, 'strategy'>
> & {
  strategy: Required<EngineZoomStrategyConfig>
} = {
  minZoom: 0.01,
  maxZoom: 640,
  bucketStep: ZOOM_BUCKET_STEP_DEFAULT,
  activeBucketRadius: 1,
  strategy: {
    overviewMaxZoom: 1 / ZOOM_STRATEGY_OVERVIEW_MAX_ZOOM_DENOMINATOR,
    // Keep 10% zoom out of the aggressive simplified lane to reduce blur.
    simplifiedTileMaxZoom: 1 / ZOOM_STRATEGY_SIMPLIFIED_TILE_MAX_ZOOM_DENOMINATOR,
    normalTileMaxZoom: ZOOM_STRATEGY_NORMAL_TILE_MAX_ZOOM_DEFAULT,
    localHybridMaxZoom: 64,
    localRenderElementThreshold: 2000,
  },
}

// Normalize caller overrides so runtime math always uses finite positive values.
/**
 * Handles resolveEngineZoomPerformanceConfig.
 * @param input Input payload for this operation.
 */
export function resolveEngineZoomPerformanceConfig(
  input?: EngineZoomPerformanceConfig,
) {
  const minZoom = Number.isFinite(input?.minZoom) && (input?.minZoom ?? 0) > 0
    ? (input?.minZoom as number)
    : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.minZoom
  const maxZoom = Number.isFinite(input?.maxZoom) && (input?.maxZoom ?? 0) > minZoom
    ? (input?.maxZoom as number)
    : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.maxZoom
  const bucketStep = Number.isFinite(input?.bucketStep) && (input?.bucketStep ?? 0) > 1
    ? (input?.bucketStep as number)
    : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.bucketStep
  const activeBucketRadius = Number.isFinite(input?.activeBucketRadius) && (input?.activeBucketRadius ?? -1) >= 0
    ? Math.floor(input?.activeBucketRadius as number)
    : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.activeBucketRadius

  const strategyInput = input?.strategy
  const strategy = {
    overviewMaxZoom:
      Number.isFinite(strategyInput?.overviewMaxZoom) && (strategyInput?.overviewMaxZoom ?? 0) > 0
        ? (strategyInput?.overviewMaxZoom as number)
        : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.strategy.overviewMaxZoom,
    simplifiedTileMaxZoom:
      Number.isFinite(strategyInput?.simplifiedTileMaxZoom) && (strategyInput?.simplifiedTileMaxZoom ?? 0) > 0
        ? (strategyInput?.simplifiedTileMaxZoom as number)
        : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.strategy.simplifiedTileMaxZoom,
    normalTileMaxZoom:
      Number.isFinite(strategyInput?.normalTileMaxZoom) && (strategyInput?.normalTileMaxZoom ?? 0) > 0
        ? (strategyInput?.normalTileMaxZoom as number)
        : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.strategy.normalTileMaxZoom,
    localHybridMaxZoom:
      Number.isFinite(strategyInput?.localHybridMaxZoom) && (strategyInput?.localHybridMaxZoom ?? 0) > 0
        ? (strategyInput?.localHybridMaxZoom as number)
        : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.strategy.localHybridMaxZoom,
    localRenderElementThreshold:
        Number.isFinite(strategyInput?.localRenderElementThreshold) &&
          (strategyInput?.localRenderElementThreshold ?? -1) >= 0
            ? Math.floor(strategyInput?.localRenderElementThreshold as number)
            : DEFAULT_ENGINE_ZOOM_PERFORMANCE_CONFIG.strategy.localRenderElementThreshold,
  }

  return {
    minZoom,
    maxZoom,
    bucketStep,
    activeBucketRadius,
    strategy,
  }
}

// Generate logarithmic zoom buckets from runtime config instead of fixed constants.
/**
 * Handles createZoomBuckets.
 * @param input Input payload for this operation.
 */
export function createZoomBuckets(input: {
  minZoom: number
  maxZoom: number
  bucketStep?: number
}) {
  const minZoom = input.minZoom
  const maxZoom = input.maxZoom
  const bucketStep = input.bucketStep ?? ZOOM_BUCKET_STEP_DEFAULT

  if (!(Number.isFinite(minZoom) && minZoom > 0)) {
    throw new Error('minZoom must be greater than 0')
  }
  if (!(Number.isFinite(maxZoom) && maxZoom > minZoom)) {
    throw new Error('maxZoom must be greater than minZoom')
  }
  if (!(Number.isFinite(bucketStep) && bucketStep > 1)) {
    throw new Error('bucketStep must be greater than 1')
  }

  const startPower = Math.floor(Math.log(minZoom) / Math.log(bucketStep))
  const endPower = Math.ceil(Math.log(maxZoom) / Math.log(bucketStep))
  const buckets: number[] = []
  for (let power = startPower; power <= endPower; power += 1) {
    buckets.push(bucketStep ** power)
  }

  return buckets
}

// Resolve nearest bucket in log-space so zoom ratios map consistently.
/**
 * Handles resolveNearestZoomBucket.
 * @param zoom zoom parameter.
 * @param buckets buckets parameter.
 */
export function resolveNearestZoomBucket(
  zoom: number,
  buckets: readonly number[],
) {
  if (buckets.length === 0) {
    throw new Error('buckets must not be empty')
  }

  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : buckets[0]
  let best = buckets[0]
  let bestDiff = Math.abs(Math.log2(safeZoom / best))
  for (const bucket of buckets) {
    const diff = Math.abs(Math.log2(safeZoom / bucket))
    if (diff < bestDiff) {
      best = bucket
      bestDiff = diff
    }
  }

  return best
}

// Keep only current bucket and configured neighboring buckets active.
/**
 * Handles resolveActiveZoomBuckets.
 * @param input Input payload for this operation.
 */
export function resolveActiveZoomBuckets(input: {
  zoom: number
  buckets: readonly number[]
  activeBucketRadius?: number
}) {
  if (input.buckets.length === 0) {
    return [] as number[]
  }

  const current = resolveNearestZoomBucket(input.zoom, input.buckets)
  const index = input.buckets.indexOf(current)
  const radius = Math.max(0, Math.floor(input.activeBucketRadius ?? 1))
  const result: number[] = []
  for (let nextIndex = index - radius; nextIndex <= index + radius; nextIndex += 1) {
    if (nextIndex >= 0 && nextIndex < input.buckets.length) {
      result.push(input.buckets[nextIndex])
    }
  }

  return result
}

// Resolve render strategy from zoom + scene density + interaction state.
/**
 * Handles getZoomRenderStrategy.
 * @param input Input payload for this operation.
 */
export function getZoomRenderStrategy(input: {
  zoom: number
  visibleElementCount: number
  interactionState: 'idle' | 'zooming' | 'panning' | 'dragging'
  strategy: Required<EngineZoomStrategyConfig>
}): ZoomRenderStrategy {
  const zoom = Number.isFinite(input.zoom) && input.zoom > 0 ? input.zoom : 1
  const visibleElementCount = Number.isFinite(input.visibleElementCount)
    ? Math.max(0, Math.floor(input.visibleElementCount))
    : 0

  if (input.interactionState !== 'idle') {
    if (zoom < input.strategy.overviewMaxZoom) return 'overview'
    if (zoom < input.strategy.simplifiedTileMaxZoom) return 'simplified-tile'
    return 'normal-tile'
  }

  if (zoom < input.strategy.overviewMaxZoom) return 'overview'
  if (zoom < input.strategy.simplifiedTileMaxZoom) return 'simplified-tile'
  if (zoom < input.strategy.normalTileMaxZoom) return 'normal-tile'

  if (visibleElementCount < input.strategy.localRenderElementThreshold) {
    return 'local-precise'
  }

  if (zoom < input.strategy.localHybridMaxZoom) {
    return 'local-tile-vector-hybrid'
  }

  return 'local-precise'
}