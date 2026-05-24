import { DEFAULT_ENGINE_VIEWPORT, resolveEngineViewportState, type EngineCanvasViewportState } from '../../interaction/viewport/viewport.ts'
import type { EngineLodConfig } from '../../interaction/lodConfig.ts'
import type { EngineTileConfig } from '../../renderer/tileManager/index.ts'
import type {
  CreateEngineOptions,
  EngineOverscanOptions,
  EnginePerformanceOptionsObject,
  EngineViewportOptions,
  ResolvedEnginePerformanceOptions,
} from './createEngine.ts'

// Keep createEngine option resolution in a dedicated module so the main
// runtime facade stays centered on orchestration instead of config plumbing.
/**
 * Handles resolveEngineTileConfig.
 * @param tileConfig tileConfig parameter.
 * @param overscan overscan parameter.
 */
export function resolveEngineTileConfig(
  tileConfig: EngineTileConfig | undefined,
  overscan: EngineOverscanOptions | undefined,
) {
  if (!tileConfig || !overscan) {
    return tileConfig
  }

  // Merge top-level overscan knobs into tile config without changing any
  // unrelated tile-cache feature flags.
  return {
    ...tileConfig,
    overscanEnabled: overscan.enabled ?? tileConfig.overscanEnabled,
    overscanBorderPx: overscan.borderPx ?? tileConfig.overscanBorderPx,
  }
}

/**
 * Handles resolveEnginePerformanceOptions.
 * @param options Options object for this operation.
 */
export function resolveEnginePerformanceOptions(
  options: CreateEngineOptions,
): ResolvedEnginePerformanceOptions {
  const legacyCulling = options.culling
  const legacyLodConfig = options.lod ?? options.render?.lod
  const legacyTileConfig = options.render?.tileConfig
  const legacyOverscan = options.overscan
  const performance = options.performance

  // Default to all performance features enabled unless callers opt out.
  if (performance === undefined || performance === true) {
    return {
      culling: legacyCulling ?? true,
      lodConfig: legacyLodConfig ?? {enabled: true},
      tileConfig: resolveEngineTileConfig(
        legacyTileConfig ?? {enabled: true},
        legacyOverscan ?? {enabled: true},
      ),
    }
  }

  if (performance === false) {
    return {
      culling: false,
      lodConfig: {enabled: false},
      tileConfig: resolveEngineTileConfig(
        {enabled: false},
        {enabled: false},
      ),
    }
  }

  const culling = resolveEngineCullingEnabled(
    performance.culling,
    legacyCulling,
  )
  const lodConfig = resolveEngineLodConfig(
    performance.lod,
    legacyLodConfig,
  )
  const tileConfig = resolveEngineTileConfig(
    resolveEngineTileFeatureConfig(performance.tiles, legacyTileConfig),
    resolveEngineOverscanFeatureConfig(performance.overscan, legacyOverscan),
  )

  return {
    culling,
    lodConfig,
    tileConfig,
  }
}

/**
 * Handles resolveEnginePixelRatio.
 * @param configured configured parameter.
 * @param maxPixelRatio maxPixelRatio parameter.
 * @param resolveHostPixelRatio resolveHostPixelRatio parameter.
 */
export function resolveEnginePixelRatio(
  configured: number | 'auto' | undefined,
  maxPixelRatio: number,
  resolveHostPixelRatio?: () => number,
) {
  if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, maxPixelRatio)
  }

  const auto = resolveSystemPixelRatio(resolveHostPixelRatio)
  return Math.min(auto, maxPixelRatio)
}

/**
 * Handles resolveInitialViewport.
 * @param canvas canvas parameter.
 * @param next next parameter.
 */
export function resolveInitialViewport(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  next?: EngineViewportOptions,
): EngineCanvasViewportState {
  return resolveEngineViewportState({
    viewportWidth: next?.viewportWidth ?? canvas.width ?? 0,
    viewportHeight: next?.viewportHeight ?? canvas.height ?? 0,
    offsetX: next?.offsetX ?? DEFAULT_ENGINE_VIEWPORT.offsetX,
    offsetY: next?.offsetY ?? DEFAULT_ENGINE_VIEWPORT.offsetY,
    scale: next?.scale ?? DEFAULT_ENGINE_VIEWPORT.scale,
  })
}

/**
 * Handles resolveEngineCullingEnabled.
 * @param culling culling parameter.
 * @param legacyCulling legacyCulling parameter.
 */
function resolveEngineCullingEnabled(
  culling: EnginePerformanceOptionsObject['culling'],
  legacyCulling: boolean | undefined,
) {
  if (culling === undefined) {
    return legacyCulling ?? true
  }

  if (typeof culling === 'boolean') {
    return culling
  }

  return culling.enabled ?? legacyCulling ?? true
}

/**
 * Handles resolveEngineLodConfig.
 * @param lod lod parameter.
 * @param legacyLodConfig legacyLodConfig parameter.
 */
function resolveEngineLodConfig(
  lod: EnginePerformanceOptionsObject['lod'],
  legacyLodConfig: EngineLodConfig | undefined,
) {
  if (lod === undefined) {
    return legacyLodConfig ?? {enabled: true}
  }

  if (typeof lod === 'boolean') {
    return lod
      ? (legacyLodConfig ?? {enabled: true})
      : {enabled: false}
  }

  return {
    ...lod,
    enabled: lod.enabled ?? true,
  }
}

/**
 * Handles resolveEngineTileFeatureConfig.
 * @param tiles tiles parameter.
 * @param legacyTileConfig legacyTileConfig parameter.
 */
function resolveEngineTileFeatureConfig(
  tiles: EnginePerformanceOptionsObject['tiles'],
  legacyTileConfig: EngineTileConfig | undefined,
) {
  if (tiles === undefined) {
    return legacyTileConfig ?? {enabled: true}
  }

  if (typeof tiles === 'boolean') {
    return tiles
      ? (legacyTileConfig ?? {enabled: true})
      : {enabled: false}
  }

  return {
    ...tiles,
    enabled: tiles.enabled ?? true,
  }
}

/**
 * Handles resolveEngineOverscanFeatureConfig.
 * @param overscan overscan parameter.
 * @param legacyOverscan legacyOverscan parameter.
 */
function resolveEngineOverscanFeatureConfig(
  overscan: EnginePerformanceOptionsObject['overscan'],
  legacyOverscan: EngineOverscanOptions | undefined,
) {
  if (overscan === undefined) {
    return legacyOverscan ?? {enabled: true}
  }

  if (typeof overscan === 'boolean') {
    return overscan
      ? (legacyOverscan ?? {enabled: true})
      : {enabled: false}
  }

  return {
    ...overscan,
    enabled: overscan.enabled ?? true,
  }
}

/**
 * Handles resolveSystemPixelRatio.
 * @param resolveHostPixelRatio resolveHostPixelRatio parameter.
 */
function resolveSystemPixelRatio(resolveHostPixelRatio?: () => number) {
  // Host-provided DPR keeps engine detached from browser globals while preserving `auto`.
  const nextPixelRatio = resolveHostPixelRatio?.()
  if (typeof nextPixelRatio === 'number' && Number.isFinite(nextPixelRatio) && nextPixelRatio > 0) {
    return nextPixelRatio
  }

  return 1
}