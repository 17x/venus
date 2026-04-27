import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngineRenderScheduler } from './renderScheduler.ts'

function createSchedulerEnvironment() {
  let now = 0
  let nextRafId = 1
  let nextTimerId = 1
  const rafCallbacks = new Map<number, FrameRequestCallback>()
  const timerCallbacks = new Map<number, () => void>()
  const originalPerformance = globalThis.performance
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
  const originalSetTimeout = globalThis.setTimeout
  const originalClearTimeout = globalThis.clearTimeout

  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: {
      now: () => now,
    },
  })
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      const id = nextRafId++
      rafCallbacks.set(id, callback)
      return id
    },
  })
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    configurable: true,
    value: (id: number) => {
      rafCallbacks.delete(id)
    },
  })
  Object.defineProperty(globalThis, 'setTimeout', {
    configurable: true,
    value: (callback: () => void) => {
      const id = nextTimerId++
      timerCallbacks.set(id, callback)
      return id
    },
  })
  Object.defineProperty(globalThis, 'clearTimeout', {
    configurable: true,
    value: (id: number) => {
      timerCallbacks.delete(id)
    },
  })

  return {
    setNow(value: number) {
      now = value
    },
    flushNextRaf() {
      const [id, callback] = rafCallbacks.entries().next().value ?? []
      assert.ok(id, 'expected a pending raf callback')
      rafCallbacks.delete(id)
      callback(now)
    },
    flushNextTimer() {
      const [id, callback] = timerCallbacks.entries().next().value ?? []
      assert.ok(id, 'expected a pending timer callback')
      timerCallbacks.delete(id)
      callback()
    },
    async flushMicrotasks() {
      await Promise.resolve()
      await Promise.resolve()
    },
    restore() {
      Object.defineProperty(globalThis, 'performance', {configurable: true, value: originalPerformance})
      Object.defineProperty(globalThis, 'requestAnimationFrame', {configurable: true, value: originalRequestAnimationFrame})
      Object.defineProperty(globalThis, 'cancelAnimationFrame', {configurable: true, value: originalCancelAnimationFrame})
      Object.defineProperty(globalThis, 'setTimeout', {configurable: true, value: originalSetTimeout})
      Object.defineProperty(globalThis, 'clearTimeout', {configurable: true, value: originalClearTimeout})
    },
  }
}

test('renderScheduler coalesces repeated requests into one raf render', async () => {
  const environment = createSchedulerEnvironment()
  const renders: string[] = []

  try {
    const scheduler = createEngineRenderScheduler({
      render: async () => {
        // Keep render order observable so coalescing can be asserted explicitly.
        renders.push('render')
      },
    })

    scheduler.request('normal')
    scheduler.request('normal')
    scheduler.request('interactive')
    assert.equal(scheduler.getDiagnostics().coalescedRequestCount, 2)

    environment.flushNextRaf()
    await environment.flushMicrotasks()
    assert.deepEqual(renders, ['render'])
  } finally {
    environment.restore()
  }
})

test('renderScheduler preserves queued interactive priority while a render is in flight', async () => {
  const environment = createSchedulerEnvironment()
  let resolveRender: (() => void) | null = null
  const renderModes: number[] = []

  try {
    const scheduler = createEngineRenderScheduler({
      render: () => new Promise<void>((resolve) => {
        renderModes.push(renderModes.length)
        resolveRender = resolve
      }),
    })

    scheduler.request('normal')
    environment.flushNextRaf()
    scheduler.request('interactive')

    // Once the first render resolves, the queued interactive request should still flush.
    resolveRender?.()
    await environment.flushMicrotasks()
    environment.flushNextRaf()
    resolveRender?.()
    await environment.flushMicrotasks()
    assert.equal(renderModes.length, 2)
  } finally {
    environment.restore()
  }
})

test('renderScheduler throttles interactive requests by interval and can cancel them', () => {
  const environment = createSchedulerEnvironment()

  try {
    const scheduler = createEngineRenderScheduler({
      render: async () => undefined,
      interactiveIntervalMs: 30,
    })

    // Start past the throttle window so the first interaction queues a raf.
    environment.setNow(40)
    scheduler.request('interactive')
    environment.flushNextRaf()
    environment.setNow(50)
    scheduler.request('interactive')

    // Interactive throttling should enqueue a timer instead of another raf immediately.
    assert.equal(scheduler.getDiagnostics().lastInteractiveThrottleDelayMs, 20)
    scheduler.cancel()
    assert.equal(scheduler.getDiagnostics().pendingRaf, false)
  } finally {
    environment.restore()
  }
})