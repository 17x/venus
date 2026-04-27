import { DEFAULT_ENGINE_VIEWPORT, resolveEngineViewportState, type EngineCanvasViewportState } from '../../interaction/viewport.ts'
import type { EngineLodConfig, EngineTileConfig } from '../../index.ts'
import type {
  CreateEngineOptions,
  EngineOverscanOptions,
  EnginePerformanceOptionsObject,
  EngineViewportOptions,
  ResolvedEnginePerformanceOptions,
} from '../createEngine.ts'

// Keep createEngine option resolution in a dedicated module so the main
// runtime facade stays centered on orchestration instead of config plumbing.
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

function resolveSystemPixelRatio(resolveHostPixelRatio?: () => number) {
  // Host-provided DPR keeps engine detached from browser globals while preserving `auto`.
  const nextPixelRatio = resolveHostPixelRatio?.()
  if (typeof nextPixelRatio === 'number' && Number.isFinite(nextPixelRatio) && nextPixelRatio > 0) {
    return nextPixelRatio
  }

  return 1
}