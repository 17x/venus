import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngineLoop } from './createEngineLoop.ts'
import type { EngineRenderFrame, EngineRenderStats, EngineRenderer } from '../../renderer/types/index.ts'
import type { EngineClock, EngineFrameHandle, EngineFrameInfo } from '../../time/index.ts'

interface FakeClockState {
  // Expose the fake clock through the engine clock contract.
  clock: EngineClock
  // Flush the next queued frame callback.
  flushNextFrame(): void
  // Return pending scheduled frame callback count.
  pendingFrameCount(): number
  // Move synthetic clock time forward.
  advanceNow(value: number): void
}

/**
 * Build a deterministic clock harness so loop scheduling behavior is testable.
 */
function createFakeClock(): FakeClockState {
  let now = 0
  let nextHandle = 1
  const callbacks = new Map<number, (frame: EngineFrameInfo) => void>()

  return {
    clock: {
      // Return the synthetic high-resolution timestamp used across frame callbacks.
      now: () => now,
      // Queue one frame callback behind a numeric handle for controlled flushing.
      requestFrame: (cb) => {
        const handle = nextHandle
        nextHandle += 1
        callbacks.set(handle, cb)
        return handle as EngineFrameHandle
      },
      // Cancel one queued frame callback when scheduler/loop stops.
      cancelFrame: (handle) => {
        callbacks.delete(handle as number)
      },
    },
    flushNextFrame() {
      const [handle, callback] = callbacks.entries().next().value ?? []
      assert.ok(handle, 'expected one pending frame callback')
      callbacks.delete(handle)
      callback({
        now,
        dt: 16,
      })
    },
    pendingFrameCount() {
      return callbacks.size
    },
        /**
     * Handles advanceNow.
     * @param value value parameter.
     */
advanceNow(value) {
      now = value
    },
  }
}

/**
 * Build a stable render frame payload used by loop tests.
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
      quality: 'full',
    },
  }
}

/**
 * Build a renderer stub with controllable async completion for scheduler assertions.
 */
function createRendererHarness() {
  const renderCalls: number[] = []
  let nextCall = 0

  const renderer: EngineRenderer = {
    id: 'test.renderer',
    capabilities: {
      backend: 'webgl',
      textRuns: false,
      imageClip: false,
      culling: false,
      lod: false,
    },
    // Record call order and resolve immediately to emulate one frame render completion.
    render: async () => {
      renderCalls.push(nextCall)
      nextCall += 1
      const stats: EngineRenderStats = {
        drawCount: 0,
        visibleCount: 0,
        culledCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        frameReuseHits: 0,
        frameReuseMisses: 0,
        frameMs: 1,
      }
      return stats
    },
  }

  return {
    renderer,
    renderCalls,
  }
}

test('createEngineLoop start schedules continuous frames through shared scheduler path', async () => {
  const fakeClock = createFakeClock()
  const rendererHarness = createRendererHarness()
  const beforeRenderFrames: number[] = []

  const loop = createEngineLoop({
    clock: fakeClock.clock,
    renderer: rendererHarness.renderer,
    resolveFrame: () => createFrame(),
    // Capture frame timestamps to confirm clock frame payload reaches beforeRender.
    beforeRender: (frame) => {
      beforeRenderFrames.push(frame.now)
    },
  })

  fakeClock.advanceNow(10)
  loop.start()
  assert.equal(fakeClock.pendingFrameCount(), 1)

  fakeClock.flushNextFrame()
  await Promise.resolve()
  await Promise.resolve()
  assert.deepEqual(rendererHarness.renderCalls, [0])
  assert.deepEqual(beforeRenderFrames, [10])

  loop.stop()
  assert.equal(fakeClock.pendingFrameCount(), 0)
})

test('createEngineLoop renderOnce renders without starting continuous loop', async () => {
  const fakeClock = createFakeClock()
  const rendererHarness = createRendererHarness()
  const statsValues: EngineRenderStats[] = []

  const loop = createEngineLoop({
    clock: fakeClock.clock,
    renderer: rendererHarness.renderer,
    resolveFrame: () => createFrame(),
    // Keep stats capture observable for one-shot render contract checks.
    onStats: (stats) => {
      statsValues.push(stats)
    },
  })

  const stats = await loop.renderOnce()
  assert.equal(stats.drawCount, 0)
  assert.equal(rendererHarness.renderCalls.length, 1)
  assert.equal(statsValues.length, 1)
  assert.equal(loop.isRunning(), false)
  assert.equal(fakeClock.pendingFrameCount(), 0)
})
