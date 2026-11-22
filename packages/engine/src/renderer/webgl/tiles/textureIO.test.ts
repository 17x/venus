import assert from 'node:assert/strict'
import test from 'node:test'

import type { EngineRenderFrame } from '../../types/index.ts'
import { resolveTileFramebufferRegion } from './textureIO.ts'

/**
 * Creates a minimal frame for tile framebuffer-region tests.
 */
function createFrame(): EngineRenderFrame {
  return {
    scene: {
      revision: 1,
      width: 1000,
      height: 1000,
      nodes: [],
    },
    viewport: {
      viewportWidth: 100,
      viewportHeight: 100,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
      pixelRatio: 1,
    },
  }
}

test('resolveTileFramebufferRegion distinguishes full, partial, and offscreen tile sources', () => {
  const frame = createFrame()
  const full = resolveTileFramebufferRegion({
    frame,
    tileBounds: {x: 10, y: 10, width: 20, height: 20},
    viewportWidthPx: 100,
    viewportHeightPx: 100,
  })
  const partial = resolveTileFramebufferRegion({
    frame,
    tileBounds: {x: 90, y: 10, width: 20, height: 20},
    viewportWidthPx: 100,
    viewportHeightPx: 100,
  })
  const offscreen = resolveTileFramebufferRegion({
    frame,
    tileBounds: {x: 120, y: 10, width: 20, height: 20},
    viewportWidthPx: 100,
    viewportHeightPx: 100,
  })

  assert.equal(full.hasVisibleSource, true)
  assert.equal(full.isClipped, false)
  assert.equal(partial.hasVisibleSource, true)
  assert.equal(partial.isClipped, true)
  assert.equal(offscreen.hasVisibleSource, false)
  assert.equal(offscreen.isClipped, true)
})
