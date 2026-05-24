/**
 * Renderer/WebGL tile ROI preload policy module.
 * Owns ROI-first ordering for preload tile candidates under limited frame budgets.
 * Does not own tile generation or scheduler lifecycle.
 */

/**
 * Stores one tile candidate used by ROI preload prioritization.
 */
export interface TileRoiPreloadCandidate {
  /** Tile zoom level resolved by tile cache bucket selection. */
  zoomLevel: number
  /** Tile grid coordinate on X axis. */
  gridX: number
  /** Tile grid coordinate on Y axis. */
  gridY: number
  /** Tile world-space bounds in scene coordinates. */
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Stores viewport payload required for ROI distance scoring.
 */
export interface TileRoiViewport {
  /** Viewport offset on X axis in screen-space transform. */
  offsetX: number
  /** Viewport offset on Y axis in screen-space transform. */
  offsetY: number
  /** Viewport scale for world-to-screen conversion. */
  scale: number
  /** Viewport width in CSS pixels. */
  viewportWidth: number
  /** Viewport height in CSS pixels. */
  viewportHeight: number
}

/**
 * Orders preload candidates by ROI priority (center-first) for progressive sharpening.
 * @param tiles Candidate preload tiles from ring expansion.
 * @param viewport Current frame viewport used to resolve center ROI.
 */
export function resolveRoiPrioritizedPreloadTiles(
  tiles: readonly TileRoiPreloadCandidate[],
  viewport: TileRoiViewport,
): TileRoiPreloadCandidate[] {
  if (tiles.length <= 1) {
    return [...tiles]
  }

  const safeScale = Number.isFinite(viewport.scale) && Math.abs(viewport.scale) > Number.EPSILON
    ? viewport.scale
    : 1
  const roiCenterXWorld = ((viewport.viewportWidth * 0.5) - viewport.offsetX) / safeScale
  const roiCenterYWorld = ((viewport.viewportHeight * 0.5) - viewport.offsetY) / safeScale

  return [...tiles].sort((leftTile, rightTile) => {
    const leftCenterX = leftTile.bounds.x + leftTile.bounds.width * 0.5
    const leftCenterY = leftTile.bounds.y + leftTile.bounds.height * 0.5
    const rightCenterX = rightTile.bounds.x + rightTile.bounds.width * 0.5
    const rightCenterY = rightTile.bounds.y + rightTile.bounds.height * 0.5

    const leftDistanceSq =
      (leftCenterX - roiCenterXWorld) * (leftCenterX - roiCenterXWorld) +
      (leftCenterY - roiCenterYWorld) * (leftCenterY - roiCenterYWorld)
    const rightDistanceSq =
      (rightCenterX - roiCenterXWorld) * (rightCenterX - roiCenterXWorld) +
      (rightCenterY - roiCenterYWorld) * (rightCenterY - roiCenterYWorld)

    if (leftDistanceSq !== rightDistanceSq) {
      return leftDistanceSq - rightDistanceSq
    }

    if (leftTile.gridY !== rightTile.gridY) {
      return leftTile.gridY - rightTile.gridY
    }

    return leftTile.gridX - rightTile.gridX
  })
}
