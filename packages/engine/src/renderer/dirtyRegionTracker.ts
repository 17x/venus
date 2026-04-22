/**
 * Dirty region tracking for incremental tile invalidation.
 *
 * Tracks which tiles need re-rendering when scene elements change.
 * Supports three update modes:
 * - hover: Element hover state changed (overlay only, no tile update needed)
 * - selection: Element selection state changed (overlay only, no tile update needed)
 * - shape: Element geometry/content changed (requires tile re-render)
 */

import type { EngineRect } from '../scene/types.ts'
import type { TileZoomLevel } from './tileManager.ts'
import { getTileSizeForZoom, getTilesIntersectingBounds } from './tileManager.ts'

export type DirtyUpdateMode = 'hover' | 'selection' | 'shape' | 'transform'

export interface DirtyRegionUpdate {
  mode: DirtyUpdateMode
  /**
   * World-space bounds of the changed region.
   * For single element: use element's world bounds.
   * For batch: use union of all affected bounds.
   */
  bounds: EngineRect
  /**
   * Zoom level at which this update occurred.
   * Used to invalidate tiles at the correct granularity.
   */
  zoomLevel: TileZoomLevel
  /**
   * Element IDs that changed, for fine-grained tracking.
   */
  elementIds?: string[]
}

/**
 * Batches dirty region updates and tracks which tiles need re-rendering.
 * Called when user interactions (select/hover/drag) or scene changes occur.
 */
export class EngineDirtyRegionTracker {
  private updates: DirtyRegionUpdate[] = []
  private baseTileSize: number

  constructor(baseTileSize: number = 512) {
    this.baseTileSize = baseTileSize
  }

  /**
   * Record a dirty region update.
   * Multiple updates can be batched before calling `flush()`.
   */
  trackUpdate(update: DirtyRegionUpdate): void {
    this.updates.push(update)
  }

  /**
   * Get all pending dirty regions (not yet flushed).
   */
  getPendingUpdates(): readonly DirtyRegionUpdate[] {
    return this.updates
  }

  /**
   * Compute tiles that need re-rendering based on pending updates.
   * Only applies updates marked as 'shape' or 'transform'.
   * Hover/selection updates are skipped (overlay-only, no tile changes).
   */
  computeDirtyTiles(): Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number }> {
    const dirtyTiles: Array<{ zoomLevel: TileZoomLevel; gridX: number; gridY: number }> = []
    const seen = new Set<string>()

    for (const update of this.updates) {
      // Skip hover/selection updates (they don't affect static tile cache)
      if (update.mode === 'hover' || update.mode === 'selection') {
        continue
      }

      // Get tiles intersecting this update's bounds
      const tileSizePx = getTileSizeForZoom(update.zoomLevel, this.baseTileSize)
      const tiles = getTilesIntersectingBounds(update.bounds, tileSizePx)

      for (const { gridX, gridY } of tiles) {
        const key = `z${update.zoomLevel}:${gridX},${gridY}`
        if (!seen.has(key)) {
          seen.add(key)
          dirtyTiles.push({ zoomLevel: update.zoomLevel, gridX, gridY })
        }
      }
    }

    return dirtyTiles
  }

  /**
   * Compute affected element IDs from all pending updates.
   */
  getAffectedElementIds(): Set<string> {
    const ids = new Set<string>()
    for (const update of this.updates) {
      if (update.elementIds) {
        for (const id of update.elementIds) {
          ids.add(id)
        }
      }
    }
    return ids
  }

  /**
   * Clear all pending updates after they've been processed.
   */
  flush(): void {
    this.updates = []
  }

  /**
   * Get statistics about pending updates.
   */
  getStats() {
    const shapeUpdates = this.updates.filter((u) => u.mode === 'shape' || u.mode === 'transform')
    const hoverUpdates = this.updates.filter((u) => u.mode === 'hover')
    const selectionUpdates = this.updates.filter((u) => u.mode === 'selection')

    return {
      totalUpdates: this.updates.length,
      shapeUpdates: shapeUpdates.length,
      hoverUpdates: hoverUpdates.length,
      selectionUpdates: selectionUpdates.length,
      uniqueElementIds: this.getAffectedElementIds().size,
    }
  }
}
