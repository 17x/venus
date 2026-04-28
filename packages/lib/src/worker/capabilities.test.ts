/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {detectWorkerCapabilities, resolveWorkerMode} from './capabilities.ts'

test('detectWorkerCapabilities resolves shared-memory worker support', () => {
  const capabilities = detectWorkerCapabilities({
    Worker: function Worker() {
      return undefined
    },
    SharedArrayBuffer: function SharedArrayBuffer() {
      return undefined
    },
    Atomics: {},
    crossOriginIsolated: true,
  })

  assert.equal(capabilities.sharedMemoryWorker, true)
})

test('resolveWorkerMode falls back to main-thread when worker is required but unavailable', () => {
  const resolution = resolveWorkerMode({
    requireWorker: true,
    capabilities: {
      worker: false,
      sharedArrayBuffer: false,
      atomics: false,
      crossOriginIsolated: false,
      sharedMemoryWorker: false,
    },
  })

  assert.equal(resolution.mode, 'main-thread')
  assert.match(resolution.reason, /worker was required/)
})

