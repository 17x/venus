import type { EngineRect } from '../../scene/types/types.ts'

/**
 * Minimal viewport state required to project screen-space coverage into world space.
 */
export interface EngineViewportBoundsState {
  /** Viewport width in CSS pixels. */
  viewportWidth: number
  /** Viewport height in CSS pixels. */
  viewportHeight: number
  /** Camera X translation in screen-space pixels. */
  offsetX: number
  /** Camera Y translation in screen-space pixels. */
  offsetY: number
  /** Camera zoom scale factor. */
  scale: number
}

/**
 * Directional viewport overscan in CSS pixels.
 */
export interface EngineViewportOverscanCssPx {
  /** Extra screen-space coverage before the viewport left edge. */
  left: number
  /** Extra screen-space coverage after the viewport right edge. */
  right: number
  /** Extra screen-space coverage before the viewport top edge. */
  top: number
  /** Extra screen-space coverage after the viewport bottom edge. */
  bottom: number
}

export type EngineViewportOverscanInput =
  | number
  | Partial<EngineViewportOverscanCssPx>

export interface ResolveEngineViewportWorldBoundsOptions {
  /** Extra viewport coverage in CSS pixels. Number values apply to all sides. */
  overscanCssPx?: EngineViewportOverscanInput
}

/**
 * Axis-aligned viewport coverage in world coordinates.
 */
export interface EngineViewportWorldBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Resolves viewport world coverage from the canonical world->screen camera state.
 * @param viewport Viewport camera state.
 * @param options Optional overscan settings.
 */
export function resolveEngineViewportWorldBounds(
  viewport: EngineViewportBoundsState,
  options: ResolveEngineViewportWorldBoundsOptions = {},
): EngineViewportWorldBounds {
  const overscan = normalizeEngineViewportOverscan(options.overscanCssPx)
  const safeScale = Number.isFinite(viewport.scale) && Math.abs(viewport.scale) > Number.EPSILON
    ? viewport.scale
    : 1
  const screenLeft = -overscan.left
  const screenRight = viewport.viewportWidth + overscan.right
  const screenTop = -overscan.top
  const screenBottom = viewport.viewportHeight + overscan.bottom
  const leftWorld = (screenLeft - viewport.offsetX) / safeScale
  const rightWorld = (screenRight - viewport.offsetX) / safeScale
  const topWorld = (screenTop - viewport.offsetY) / safeScale
  const bottomWorld = (screenBottom - viewport.offsetY) / safeScale

  return {
    minX: Math.min(leftWorld, rightWorld),
    minY: Math.min(topWorld, bottomWorld),
    maxX: Math.max(leftWorld, rightWorld),
    maxY: Math.max(topWorld, bottomWorld),
  }
}

/**
 * Resolves viewport world coverage as an engine rectangle for spatial indexes.
 * @param viewport Viewport camera state.
 * @param options Optional overscan settings.
 */
export function resolveEngineViewportWorldRect(
  viewport: EngineViewportBoundsState,
  options: ResolveEngineViewportWorldBoundsOptions = {},
): EngineRect {
  const bounds = resolveEngineViewportWorldBounds(viewport, options)
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  }
}

/**
 * Normalizes numeric and directional overscan into a complete side map.
 * @param overscanCssPx Overscan input in CSS pixels.
 */
export function normalizeEngineViewportOverscan(
  overscanCssPx: EngineViewportOverscanInput = 0,
): EngineViewportOverscanCssPx {
  if (typeof overscanCssPx === 'number') {
    const value = Math.max(0, Number.isFinite(overscanCssPx) ? overscanCssPx : 0)
    return {
      left: value,
      right: value,
      top: value,
      bottom: value,
    }
  }

  return {
    left: normalizeOverscanSide(overscanCssPx.left),
    right: normalizeOverscanSide(overscanCssPx.right),
    top: normalizeOverscanSide(overscanCssPx.top),
    bottom: normalizeOverscanSide(overscanCssPx.bottom),
  }
}

/**
 * Normalizes one overscan side value.
 * @param value Candidate side value.
 */
function normalizeOverscanSide(value: number | undefined) {
  return Math.max(0, Number.isFinite(value) ? value ?? 0 : 0)
}
