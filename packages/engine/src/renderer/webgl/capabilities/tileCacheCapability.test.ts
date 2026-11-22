import assert from 'node:assert/strict'
import test from 'node:test'

import type { EngineRenderFrame } from '../../types/index.ts'
import { createWebGLTileCacheCapability } from './tileCacheCapability.ts'

function createFrame(revision: string | number): EngineRenderFrame {
  return {
    scene: {
      revision,
      width: 1024,
      height: 1024,
      nodes: [],
    },
    viewport: {
      viewportWidth: 512,
      viewportHeight: 512,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
    },
  }
}

test('tile cache marks all entries dirty when scene revision changes without dirty regions', () => {
  const capability = createWebGLTileCacheCapability({
    tileConfig: {
      enabled: true,
      tileSizePx: 256,
      maxCacheSize: 16,
    },
  })
  capability.create()
  const cache = capability.read({kind: 'cache'})
  assert.ok(cache)
  cache.upsertEntry({
    zoomLevel: 3,
    gridX: 0,
    gridY: 0,
    textureId: 1,
    textureBytes: 4,
  })

  assert.equal(capability.update({kind: 'mark-dirty-regions', frame: createFrame(1)}), 0)
  assert.equal(cache.getDirtyTiles().length, 0)
  assert.equal(capability.update({kind: 'mark-dirty-regions', frame: createFrame(2)}), 1)
  assert.deepEqual(cache.getDirtyTiles(), [{zoomLevel: 3, gridX: 0, gridY: 0}])
})
