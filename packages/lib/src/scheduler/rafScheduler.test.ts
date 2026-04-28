/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {createSingleFlightScheduler} from './rafScheduler.ts'

test('createSingleFlightScheduler coalesces burst requests into one frame', async () => {
  const frameCallbacks = new Map<number, () => void>()
  let nextHandle = 1
  let runCount = 0

  const scheduler = createSingleFlightScheduler({
    run: async () => {
      runCount += 1
    },
    now: () => 100,
    scheduleFrame: (callback) => {
      const handle = nextHandle
      nextHandle += 1
      frameCallbacks.set(handle, callback)
      return handle
    },
    cancelFrame: (handle) => {
      frameCallbacks.delete(handle)
    },
  })

  scheduler.request()
  scheduler.request()

  assert.equal(frameCallbacks.size, 1)
  frameCallbacks.values().next().value?.()
  await Promise.resolve()

  assert.equal(runCount, 1)
  assert.equal(scheduler.getDiagnostics().coalescedRequestCount, 1)
})

test('createSingleFlightScheduler cancels pending frame handles', () => {
  const frameCallbacks = new Map<number, () => void>()
  const cancelled: number[] = []
  let nextHandle = 1

  const scheduler = createSingleFlightScheduler({
    run: async () => undefined,
    scheduleFrame: (callback) => {
      const handle = nextHandle
      nextHandle += 1
      frameCallbacks.set(handle, callback)
      return handle
    },
    cancelFrame: (handle) => {
      cancelled.push(handle)
      frameCallbacks.delete(handle)
    },
  })

  scheduler.request()
  scheduler.cancel()

  assert.deepEqual(cancelled, [1])
  assert.equal(frameCallbacks.size, 0)
})

