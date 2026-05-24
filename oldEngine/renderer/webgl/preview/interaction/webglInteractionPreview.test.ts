import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveInteractionPreviewExecutionMode,
  tryReuseInteractiveCompositeFrame,
} from './webglInteractionPreview.ts'
import { ENGINE_RENDER_FALLBACK_REASON } from '../../../fallbackTaxonomy/index.ts'
import type { EngineRenderFrame } from '../../../types/index.ts'

/**
 * Build a minimal frame payload for interaction preview miss-reason tests.
 */
function createFrame(): EngineRenderFrame {
  return {
    scene: {
      revision: 1,
      width: 100,
      height: 100,
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
      quality: 'interactive',
      pixelRatio: 1,
      outputPixelRatio: 1,
    },
  }
}

/**
 * Build a lightweight fake WebGL context for preview miss-path assertions.
 */
function createFakeContext() {
  return {
    BLEND: 0x0be2,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    COLOR_BUFFER_BIT: 0x4000,
    viewport() {},
    enable() {},
    blendFunc() {},
    clearColor() {},
    clear() {},
  } as unknown as WebGLRenderingContext
}

/**
 * Build a lightweight fake pipeline because miss-path tests never draw packets.
 */
function createFakePipeline() {
  return {} as unknown as import('../../core/index.ts').WebGLQuadPipeline
}

/**
 * Build a baseline snapshot payload so miss-path tests can override one field at a time.
  * @param overrides overrides parameter.
*/
function createSnapshot(overrides?: Partial<import('../index.ts').InteractionCompositeSnapshot>) {
  return {
    revision: 1,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    viewportWidth: 100,
    viewportHeight: 100,
    pixelRatio: 1,
    visibleCount: 0,
    culledCount: 0,
    textureSource: 'framebuffer-copy' as const,
    ...overrides,
  }
}

test('tryReuseInteractiveCompositeFrame returns taxonomy no-snapshot reason on missing snapshot', () => {
  const result = tryReuseInteractiveCompositeFrame({
    context: createFakeContext(),
    pipeline: createFakePipeline(),
    frame: createFrame(),
    texture: {} as WebGLTexture,
    snapshot: null,
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      disableReuse: false,
      cacheOnly: true,
      maxScaleStep: 1.2,
      maxTranslatePx: 2400,
    },
  })

  assert.equal(result.reused, false)
  assert.equal(result.missReason, ENGINE_RENDER_FALLBACK_REASON.L0_NO_SNAPSHOT)
})

test('tryReuseInteractiveCompositeFrame returns taxonomy revision mismatch reason', () => {
  const frame = createFrame()
  const result = tryReuseInteractiveCompositeFrame({
    context: createFakeContext(),
    pipeline: createFakePipeline(),
    frame,
    texture: {} as WebGLTexture,
    snapshot: createSnapshot({revision: 2}),
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      disableReuse: false,
      cacheOnly: true,
      maxScaleStep: 1.2,
      maxTranslatePx: 2400,
    },
  })

  assert.equal(result.reused, false)
  assert.equal(result.missReason, ENGINE_RENDER_FALLBACK_REASON.L0_REVISION_MISMATCH)
})

test('tryReuseInteractiveCompositeFrame returns taxonomy pixel-ratio mismatch reason', () => {
  const result = tryReuseInteractiveCompositeFrame({
    context: createFakeContext(),
    pipeline: createFakePipeline(),
    frame: createFrame(),
    texture: {} as WebGLTexture,
    snapshot: createSnapshot({pixelRatio: 2}),
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      disableReuse: false,
      cacheOnly: false,
      maxScaleStep: 1.2,
      maxTranslatePx: 2400,
    },
  })

  assert.equal(result.reused, false)
  assert.equal(result.missReason, ENGINE_RENDER_FALLBACK_REASON.L0_PIXEL_RATIO_MISMATCH)
})

test('tryReuseInteractiveCompositeFrame returns taxonomy scale-step exceeded reason', () => {
  const frame = {
    ...createFrame(),
    viewport: {
      ...createFrame().viewport,
      scale: 3,
    },
  }
  const result = tryReuseInteractiveCompositeFrame({
    context: createFakeContext(),
    pipeline: createFakePipeline(),
    frame,
    texture: {} as WebGLTexture,
    snapshot: createSnapshot({scale: 1}),
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      disableReuse: false,
      cacheOnly: true,
      maxScaleStep: 1.2,
      maxTranslatePx: 2400,
    },
  })

  assert.equal(result.reused, false)
  assert.equal(result.missReason, ENGINE_RENDER_FALLBACK_REASON.L0_SCALE_STEP_EXCEEDED)
})

test('tryReuseInteractiveCompositeFrame returns taxonomy translate-exceeded reason', () => {
  const frame = {
    ...createFrame(),
    viewport: {
      ...createFrame().viewport,
      offsetX: 5_000,
      offsetY: 0,
    },
  }
  const result = tryReuseInteractiveCompositeFrame({
    context: createFakeContext(),
    pipeline: createFakePipeline(),
    frame,
    texture: {} as WebGLTexture,
    snapshot: createSnapshot({offsetX: 0, offsetY: 0}),
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      disableReuse: false,
      cacheOnly: true,
      maxScaleStep: 1.2,
      maxTranslatePx: 100,
    },
  })

  assert.equal(result.reused, false)
  assert.equal(result.missReason, ENGINE_RENDER_FALLBACK_REASON.L0_TRANSLATE_EXCEEDED)
})

test('tryReuseInteractiveCompositeFrame bypasses affine reuse for 3D perspective frames', () => {
  const frame = {
    ...createFrame(),
    viewport: {
      ...createFrame().viewport,
      dimensionMode: '3d' as const,
      projectionKind: 'perspective' as const,
    },
  }

  assert.equal(resolveInteractionPreviewExecutionMode(frame), 'temporal-reprojection-required')

  const result = tryReuseInteractiveCompositeFrame({
    context: createFakeContext(),
    pipeline: createFakePipeline(),
    frame,
    texture: {} as WebGLTexture,
    snapshot: createSnapshot(),
    interactionPreview: {
      enabled: true,
      mode: 'interaction',
      disableReuse: false,
      cacheOnly: true,
      maxScaleStep: 1.2,
      maxTranslatePx: 2400,
    },
  })

  assert.equal(result.reused, false)
  assert.equal(result.missReason, ENGINE_RENDER_FALLBACK_REASON.L0_PREVIEW_MISS)
})
