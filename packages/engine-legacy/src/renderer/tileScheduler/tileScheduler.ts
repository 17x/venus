import type {
  TilePriority,
  TileRenderRequest,
  TileViewportCamera,
} from '../tileManager/index.ts'
import {
  getActiveZoomBuckets,
  getVisibleTilesForCamera,
  getZoomBucket,
} from '../tileManager/index.ts'

const TILE_PRIORITY_WEIGHT: Record<TilePriority, number> = {
  urgent: 4,
  visible: 3,
  nearby: 2,
  background: 1,
}

const TILE_PRIORITY_ORDER: TilePriority[] = [
  'urgent',
  'visible',
  'nearby',
  'background',
]

const TILE_STARVATION_PROMOTION_WINDOW_MS = 24
const TILE_SCHEDULER_TILE_SIZE_CSS_PX_DEFAULT = 512

interface TileSchedulerRequestMeta {
  // Keep original enqueue timestamp so starvation promotion uses total queue wait time.
  enqueuedAtMs: number
}

export interface TileSchedulerTickOptions {
  frameBudgetMs: number
  maxRequests?: number
  process: (request: TileRenderRequest) => void
  nowMs?: () => number
}

export interface TileSchedulerCancelOptions {
  // Camera state used to resolve visible and nearby tile ranges.
  camera: TileViewportCamera
  // Optional explicit zoom bucket list (falls back to default generator output).
  zoomBuckets?: readonly number[]
  // Active neighboring bucket radius retained around current zoom bucket.
  activeBucketRadius?: number
  // Tile CSS size used for viewport->tile projection.
  tileSizeCssPx?: number
  // Overscan size used when estimating visible + nearby tiles.
  overscanCssPx?: number
  // Nearby ring count retained around visible tiles.
  nearbyRing?: number
}

/**
 * Priority queue + de-dup layer for tile render requests.
 */
export class TileScheduler {
  private requestMap = new Map<string, TileRenderRequest>()
  private requestMetaMap = new Map<string, TileSchedulerRequestMeta>()
  private keysByPriority: Record<TilePriority, string[]> = {
    urgent: [],
    visible: [],
    nearby: [],
    background: [],
  }

  /**
   * Insert or update one tile request while preserving strongest known priority.
    * @param request request parameter.
*/
  requestTile(request: TileRenderRequest): void {
    const nowMs = this.resolveNowMs()
    const existing = this.requestMap.get(request.key)
    if (existing) {
      const upgradedPriority = this.upgradePriority(existing.priority, request.priority)
      // Keep the original enqueue time so starvation aging reflects total wait time.
      const existingMeta = this.requestMetaMap.get(request.key)
      this.requestMap.set(request.key, {
        ...request,
        priority: upgradedPriority,
      })
      if (upgradedPriority !== existing.priority) {
        this.moveKeyToPriorityBucket(request.key, existing.priority, upgradedPriority)
      }
      if (!existingMeta) {
        this.requestMetaMap.set(request.key, {enqueuedAtMs: nowMs})
      }
      return
    }

    this.requestMap.set(request.key, request)
    this.requestMetaMap.set(request.key, {enqueuedAtMs: nowMs})
    this.keysByPriority[request.priority].push(request.key)
  }

  /**
   * Insert a batch of tile requests through the same dedupe/priority path.
    * @param requests requests parameter.
*/
  requestMany(requests: readonly TileRenderRequest[]): void {
    for (const request of requests) {
      this.requestTile(request)
    }
  }

  /**
   * Remove queued requests that are outside active visible/nearby camera coverage.
    * @param options Options object for this operation.
*/
  cancelOutdatedRequests(options: TileSchedulerCancelOptions): number {
    const tileSizeCssPx = options.tileSizeCssPx ?? TILE_SCHEDULER_TILE_SIZE_CSS_PX_DEFAULT
    const overscanCssPx = options.overscanCssPx ?? 0
    const nearbyRing = Math.max(0, options.nearbyRing ?? 1)
    const activeZoomBuckets = getActiveZoomBuckets(
      options.camera.scale,
      options.zoomBuckets,
      options.activeBucketRadius,
    )
    // Fall back to one nearest bucket so cancellation never drops all queued work.
    const effectiveActiveZoomBuckets = activeZoomBuckets.length > 0
      ? activeZoomBuckets
      : [getZoomBucket(options.camera.scale)]
    const visibleTiles = effectiveActiveZoomBuckets.flatMap((zoomBucket) => getVisibleTilesForCamera({
      camera: options.camera,
      zoomBucket,
      tileSizeCssPx,
      overscanCssPx,
    }))

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
          for (const zoomBucket of effectiveActiveZoomBuckets) {
            keepKeys.add(this.makeViewportKey(zoomBucket, x, y))
          }
        }
      }
    }

    let removedCount = 0
    for (const key of this.getAllPendingKeys()) {
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
        this.deleteQueuedRequest(key)
        removedCount += 1
        continue
      }
    }

    return removedCount
  }

  /**
   * Drain queued requests until frame budget or request count ceiling is reached.
    * @param options Options object for this operation.
*/
  tick(options: TileSchedulerTickOptions): number {
    const nowMs = options.nowMs ?? (() => performance.now())
    const start = nowMs()
    let processed = 0
    const maxRequests = Math.max(0, options.maxRequests ?? Number.POSITIVE_INFINITY)

    // Promote aged requests before draining so long-waiting background work eventually runs.
    this.promoteStarvedRequests(start)

    while (this.requestMap.size > 0) {
      if (nowMs() - start >= Math.max(0, options.frameBudgetMs)) {
        break
      }
      if (processed >= maxRequests) {
        break
      }

      const nextRequest = this.dequeueHighestPriorityRequest()
      if (!nextRequest) {
        break
      }

      options.process(nextRequest)
      processed += 1
    }

    return processed
  }

  /**
   * Return queue size for diagnostics and runtime tuning decisions.
   */
  getPendingCount(): number {
    return this.requestMap.size
  }

  /**
   * Promote stale queued work to avoid starvation under sustained urgent traffic.
    * @param nowMs nowMs parameter.
*/
  private promoteStarvedRequests(nowMs: number): void {
    for (const [key, request] of this.requestMap.entries()) {
      const requestMeta = this.requestMetaMap.get(key)
      if (!requestMeta) {
        continue
      }

      const waitedMs = Math.max(0, nowMs - requestMeta.enqueuedAtMs)
      const promotedPriority = this.resolveAgedPriority(request.priority, waitedMs)
      if (promotedPriority === request.priority) {
        continue
      }

      this.requestMap.set(key, {
        ...request,
        priority: promotedPriority,
      })
      this.moveKeyToPriorityBucket(key, request.priority, promotedPriority)
    }
  }

  /**
   * Resolve priority escalation based on queue wait time windows.
    * @param priority priority parameter.
 * @param waitedMs waitedMs parameter.
*/
  private resolveAgedPriority(priority: TilePriority, waitedMs: number): TilePriority {
    const promotionSteps = Math.floor(waitedMs / TILE_STARVATION_PROMOTION_WINDOW_MS)
    if (promotionSteps <= 0) {
      return priority
    }

    const promotedWeight = Math.min(
      TILE_PRIORITY_WEIGHT.urgent,
      TILE_PRIORITY_WEIGHT[priority] + promotionSteps,
    )
    if (promotedWeight <= TILE_PRIORITY_WEIGHT[priority]) {
      return priority
    }

    // Resolve the final priority by weight so promotion stays stable and deterministic.
    return TILE_PRIORITY_ORDER.find((candidatePriority) => {
      return TILE_PRIORITY_WEIGHT[candidatePriority] === promotedWeight
    }) ?? priority
  }

  /**
   * Remove one next request from the highest available priority bucket.
   */
  private dequeueHighestPriorityRequest(): TileRenderRequest | null {
    for (const priority of TILE_PRIORITY_ORDER) {
      const bucket = this.keysByPriority[priority]
      while (bucket.length > 0) {
        const key = bucket.shift()
        if (!key) {
          continue
        }

        const request = this.requestMap.get(key)
        if (!request) {
          this.requestMetaMap.delete(key)
          continue
        }

        this.requestMap.delete(key)
        this.requestMetaMap.delete(key)
        return request
      }
    }

    return null
  }

  /**
   * Move one queued key between priority buckets after request priority changes.
    * @param key Lookup key.
 * @param previousPriority previousPriority parameter.
 * @param nextPriority nextPriority parameter.
*/
  private moveKeyToPriorityBucket(
    key: string,
    previousPriority: TilePriority,
    nextPriority: TilePriority,
  ): void {
    this.removeKeyFromPriorityBucket(key, previousPriority)
    this.keysByPriority[nextPriority].push(key)
  }

  /**
   * Remove one key from a specific bucket while preserving queue order for others.
    * @param key Lookup key.
 * @param priority priority parameter.
*/
  private removeKeyFromPriorityBucket(key: string, priority: TilePriority): void {
    const bucket = this.keysByPriority[priority]
    const keyIndex = bucket.indexOf(key)
    if (keyIndex < 0) {
      return
    }

    bucket.splice(keyIndex, 1)
  }

  /**
   * Delete one queued request and its metadata from all scheduler stores.
    * @param key Lookup key.
*/
  private deleteQueuedRequest(key: string): void {
    const request = this.requestMap.get(key)
    if (!request) {
      this.requestMetaMap.delete(key)
      return
    }

    this.requestMap.delete(key)
    this.requestMetaMap.delete(key)
    this.removeKeyFromPriorityBucket(key, request.priority)
  }

  /**
   * Flatten all bucket keys for maintenance passes that need full queue scans.
   */
  private getAllPendingKeys(): string[] {
    const keys: string[] = []
    for (const priority of TILE_PRIORITY_ORDER) {
      keys.push(...this.keysByPriority[priority])
    }
    return keys
  }

  /**
   * Resolve a monotonic clock value for enqueue timestamps in non-browser environments.
   */
  private resolveNowMs(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now()
    }

    return Date.now()
  }

  /**
   * Keep the highest available priority when duplicate requests target one tile.
    * @param previous previous parameter.
 * @param next next parameter.
*/
  private upgradePriority(previous: TilePriority, next: TilePriority): TilePriority {
    return TILE_PRIORITY_WEIGHT[next] > TILE_PRIORITY_WEIGHT[previous] ? next : previous
  }

  /**
   * Build a stable viewport tile identity used by cancellation windows.
    * @param zoomBucket zoomBucket parameter.
 * @param x x parameter.
 * @param y y parameter.
*/
  private makeViewportKey(zoomBucket: number, x: number, y: number): string {
    return `${zoomBucket}:${x}:${y}`
  }
}
