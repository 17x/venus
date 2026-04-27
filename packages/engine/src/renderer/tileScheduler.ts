import type {
  TilePriority,
  TileRenderRequest,
  TileViewportCamera,
} from './tileManager.ts'
import {
  getVisibleTilesForCamera,
  getZoomBucket,
} from './tileManager.ts'

const TILE_PRIORITY_WEIGHT: Record<TilePriority, number> = {
  urgent: 4,
  visible: 3,
  nearby: 2,
  background: 1,
}

export interface TileSchedulerTickOptions {
  frameBudgetMs: number
  maxRequests?: number
  process: (request: TileRenderRequest) => void
  nowMs?: () => number
}

export interface TileSchedulerCancelOptions {
  camera: TileViewportCamera
  tileSizeCssPx?: number
  overscanCssPx?: number
  nearbyRing?: number
}

/**
 * Priority queue + de-dup layer for tile render requests.
 */
export class TileScheduler {
  private requestMap = new Map<string, TileRenderRequest>()
  private orderedKeys: string[] = []

  requestTile(request: TileRenderRequest): void {
    const existing = this.requestMap.get(request.key)
    if (existing) {
      const upgradedPriority = this.upgradePriority(existing.priority, request.priority)
      this.requestMap.set(request.key, {
        ...request,
        priority: upgradedPriority,
      })
      return
    }

    this.requestMap.set(request.key, request)
    this.orderedKeys.push(request.key)
  }

  requestMany(requests: readonly TileRenderRequest[]): void {
    for (const request of requests) {
      this.requestTile(request)
    }
  }

  cancelOutdatedRequests(options: TileSchedulerCancelOptions): number {
    const tileSizeCssPx = options.tileSizeCssPx ?? 512
    const overscanCssPx = options.overscanCssPx ?? 0
    const nearbyRing = Math.max(0, options.nearbyRing ?? 1)
    const currentZoomBucket = getZoomBucket(options.camera.scale)
    const visibleTiles = getVisibleTilesForCamera({
      camera: options.camera,
      zoomBucket: currentZoomBucket,
      tileSizeCssPx,
      overscanCssPx,
    })

    const visibleKeys = new Set<string>()
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const tile of visibleTiles) {
      minX = Math.min(minX, tile.coord.x)
      minY = Math.min(minY, tile.coord.y)
      maxX = Math.max(maxX, tile.coord.x)
      maxY = Math.max(maxY, tile.coord.y)
      visibleKeys.add(this.makeViewportKey(tile.coord.zoomBucket, tile.coord.x, tile.coord.y))
    }

    const keepKeys = new Set<string>()
    if (visibleTiles.length > 0) {
      for (let x = minX - nearbyRing; x <= maxX + nearbyRing; x++) {
        for (let y = minY - nearbyRing; y <= maxY + nearbyRing; y++) {
          keepKeys.add(this.makeViewportKey(currentZoomBucket, x, y))
        }
      }
    }

    let removedCount = 0
    const nextOrderedKeys: string[] = []
    for (const key of this.orderedKeys) {
      const request = this.requestMap.get(key)
      if (!request) {
        continue
      }

      const viewportKey = this.makeViewportKey(
        request.coord.zoomBucket,
        request.coord.x,
        request.coord.y,
      )
      if (!keepKeys.has(viewportKey) && !visibleKeys.has(viewportKey)) {
        this.requestMap.delete(key)
        removedCount += 1
        continue
      }

      nextOrderedKeys.push(key)
    }

    this.orderedKeys = nextOrderedKeys
    return removedCount
  }

  tick(options: TileSchedulerTickOptions): number {
    const nowMs = options.nowMs ?? (() => performance.now())
    const start = nowMs()
    let processed = 0
    const maxRequests = Math.max(0, options.maxRequests ?? Number.POSITIVE_INFINITY)

    while (this.orderedKeys.length > 0) {
      if (nowMs() - start >= Math.max(0, options.frameBudgetMs)) {
        break
      }
      if (processed >= maxRequests) {
        break
      }

      const nextIndex = this.findHighestPriorityIndex()
      if (nextIndex < 0) {
        break
      }

      const [key] = this.orderedKeys.splice(nextIndex, 1)
      const request = this.requestMap.get(key)
      if (!request) {
        continue
      }

      this.requestMap.delete(key)
      options.process(request)
      processed += 1
    }

    return processed
  }

  getPendingCount(): number {
    return this.requestMap.size
  }

  private findHighestPriorityIndex(): number {
    let bestIndex = -1
    let bestWeight = Number.NEGATIVE_INFINITY
    for (let index = 0; index < this.orderedKeys.length; index++) {
      const key = this.orderedKeys[index]
      const request = this.requestMap.get(key)
      if (!request) {
        continue
      }

      const weight = TILE_PRIORITY_WEIGHT[request.priority]
      if (weight > bestWeight) {
        bestWeight = weight
        bestIndex = index
      }
    }

    return bestIndex
  }

  private upgradePriority(previous: TilePriority, next: TilePriority): TilePriority {
    return TILE_PRIORITY_WEIGHT[next] > TILE_PRIORITY_WEIGHT[previous] ? next : previous
  }

  private makeViewportKey(zoomBucket: number, x: number, y: number): string {
    return `${zoomBucket}:${x}:${y}`
  }
}
