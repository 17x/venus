import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EngineInitialRenderController,
  InitialRenderPhase,
} from './initialRender.ts'

function createFakeTimerEnvironment() {
  type TimerEntry = {
    id: number
    callback: () => void
    active: boolean
  }

  let now = 0
  let nextTimerId = 1
  const timers = new Map<number, TimerEntry>()
  const originalPerformance = globalThis.performance
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout

  const fakeSetTimeout = ((callback: () => void) => {
    const id = nextTimerId++
    timers.set(id, {id, callback, active: true})
    return id
  }) as typeof globalThis.setTimeout
  const fakeClearTimeout = ((id: number) => {
    const entry = timers.get(id)
    if (entry) {
      entry.active = false
    }
  }) as typeof globalThis.clearTimeout

  Object.defineProperty(globalThis, 'setTimeout', {
    configurable: true,
    value: fakeSetTimeout,
  })
  Object.defineProperty(globalThis, 'clearTimeout', {
    configurable: true,
    value: fakeClearTimeout,
  })
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: {
      now: () => now,
    },
  })

  return {
    advance(ms: number) {
      now += ms
    },
    flushNextTimer() {
      const entry = Array.from(timers.values()).find((candidate) => candidate.active)
      assert.ok(entry, 'expected a scheduled timer to flush')
      entry.active = false
      entry.callback()
    },
    restore() {
      Object.defineProperty(globalThis, 'setTimeout', {
        configurable: true,
        value: originalSetTimeout,
      })
      Object.defineProperty(globalThis, 'clearTimeout', {
        configurable: true,
        value: originalClearTimeout,
      })
      Object.defineProperty(globalThis, 'performance', {
        configurable: true,
        value: originalPerformance,
      })
    },
  }
}

test('EngineInitialRenderController runs preview then detail phases in order', () => {
  const environment = createFakeTimerEnvironment()
  const callbacks: string[] = []

  try {
    const controller = new EngineInitialRenderController({
      enabled: true,
      lowDprPreview: 0.5,
      previewDelayMs: 20,
      detailPassDelayMs: 60,
      detailPassDurationMs: 100,
    })

    controller.beginInitialRender(
      () => callbacks.push('preview'),
      () => callbacks.push('detail'),
    )

    // Preview timer should move the controller into low-DPR preview mode first.
    environment.flushNextTimer()
    assert.equal(controller.getPhase(), InitialRenderPhase.PreviewActive)
    assert.equal(controller.getDprForPhase(), 0.5)
    assert.deepEqual(callbacks, ['preview'])

    // Detail timer should promote the controller into the full-detail phase.
    environment.flushNextTimer()
    assert.equal(controller.getPhase(), InitialRenderPhase.DetailActive)
    assert.deepEqual(callbacks, ['preview', 'detail'])

    // Detail-pass elapsed time is measured from the configured preview/detail delays.
    environment.advance(130)
    assert.equal(controller.getDetailPassElapsedMs(), 50)
    assert.equal(controller.getDetailPassProgress(), 0.5)
  } finally {
    environment.restore()
  }
})

test('EngineInitialRenderController cancel resets queued work back to idle', () => {
  const environment = createFakeTimerEnvironment()

  try {
    const controller = new EngineInitialRenderController({
      enabled: true,
      previewDelayMs: 10,
      detailPassDelayMs: 20,
    })

    controller.beginInitialRender()
    controller.cancel()

    // Cancellation should drop all queued work and restore the idle phase.
    assert.equal(controller.getPhase(), InitialRenderPhase.Idle)
    assert.equal(controller.getDprForPhase(), 1)
  } finally {
    environment.restore()
  }
})

test('EngineInitialRenderController ignores duplicate begin calls once started', () => {
  const environment = createFakeTimerEnvironment()
  let previewCount = 0

  try {
    const controller = new EngineInitialRenderController({enabled: true})
    controller.beginInitialRender(() => {
      previewCount += 1
    })
    controller.beginInitialRender(() => {
      previewCount += 10
    })

    // Duplicate begin calls must not queue extra timers or callbacks.
    environment.flushNextTimer()
    assert.equal(previewCount, 1)
  } finally {
    environment.restore()
  }
})