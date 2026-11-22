import assert from 'node:assert/strict'
import test from 'node:test'

import type { EngineRenderFrame } from '../../types/index.ts'
import { EngineTileCache, getZoomLevelForScale, type TileRenderRequest, type TileZoomLevel } from '../../tileManager/index.ts'
import type { InteractionCompositeSnapshot } from '../preview/composite/webglComposite.ts'
import { createWebGLTileQueueCapability } from './tileQueueCapability.ts'

/**
 * Creates a render frame focused on pan predictive queue math.
 * @param offsetX Current viewport X offset.
 * @param offsetY Current viewport Y offset.
 */
function createFrame(offsetX: number, offsetY: number): EngineRenderFrame {
  return {
    scene: {
      revision: 7,
      width: 2000,
      height: 2000,
      nodes: [],
    },
    viewport: {
      viewportWidth: 128,
      viewportHeight: 128,
      scale: 1,
      offsetX,
      offsetY,
      matrix: [1, 0, offsetX, 0, 1, offsetY, 0, 0, 1],
    },
    context: {
      quality: 'full',
      pixelRatio: 1,
    },
  }
}

/**
 * Creates the cached snapshot camera used to estimate pan velocity.
 */
function createSnapshot(): InteractionCompositeSnapshot {
  return {
    revision: 7,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    viewportWidth: 128,
    viewportHeight: 128,
    pixelRatio: 1,
    visibleCount: 0,
    culledCount: 0,
    textureSource: 'canvas-upload',
  }
}

test('tile queue pan prediction keeps current-bucket future tiles before low-lod fallback', () => {
  const tileCache = new EngineTileCache({
    enabled: true,
    tileSizePx: 512,
    maxCacheSize: 256,
  })
  const capability = createWebGLTileQueueCapability({tileCache})
  const frame = createFrame(16, 0)
  const zoomLevel = getZoomLevelForScale(frame.viewport.scale)
  const lowLodZoomLevel = Math.max(0, zoomLevel - 1) as TileZoomLevel

  const requestedCount = capability.create({
    panPredictive: {
      frame,
      snapshot: createSnapshot(),
    },
  })
  const requests: TileRenderRequest[] = []
  capability.getScheduler().tick({
    frameBudgetMs: Number.POSITIVE_INFINITY,
    process: (request) => {
      requests.push(request)
    },
    nowMs: () => 0,
  })

  assert.ok(requestedCount > 0)
  assert.ok(requests.some((request) => request.priority === 'visible' && request.coord.zoomBucket === zoomLevel))
  assert.ok(
    requests.some((request) => (
      request.priority === 'nearby' &&
      request.reason === 'preload' &&
      request.coord.zoomBucket === zoomLevel
    )),
  )
  assert.ok(
    requests.some((request) => (
      request.priority === 'background' &&
      request.reason === 'preload' &&
      request.coord.zoomBucket === lowLodZoomLevel
    )),
  )
  assert.equal(new Set(requests.map((request) => request.key)).size, requests.length)
})
