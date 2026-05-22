import assert from 'node:assert/strict'
import test from 'node:test'

import {createBrowserPlatformAdapters} from '../browserPlatformAdapters'

/**
 * Verifies browser platform adapters forward calls to host hooks deterministically.
 */
test('createBrowserPlatformAdapters forwards host hooks', async () => {
  let requested = false
  let canceled = false
  let cursor = ''
  let storageValue = ''
  let clipboardValue = ''

  const adapters = createBrowserPlatformAdapters({
    requestAnimationFrame: (_callback) => {
      requested = true
      return 1
    },
    cancelAnimationFrame: (_handleId) => {
      canceled = true
    },
    now: () => 123,
    createWorker: (_scriptUrl, _options) =>
      ({
        postMessage: (_payload: unknown) => {},
        terminate: () => {},
      }) as unknown as Worker,
    createCanvas: (_options) => ({width: 20, height: 10}) as HTMLCanvasElement,
    setCursor: (value) => {
      cursor = value
    },
    getStorageItem: (_key) => (storageValue ? storageValue : null),
    setStorageItem: (_key, value) => {
      storageValue = value
    },
    removeStorageItem: (_key) => {
      storageValue = ''
    },
    readClipboardText: async () => 'read',
    writeClipboardText: async (value) => {
      clipboardValue = value
    },
  })

  assert.equal(adapters.now(), 123)
  assert.equal(adapters.frame.requestFrame(() => {}), 1)
  adapters.frame.cancelFrame(1)
  adapters.setCursor('crosshair')
  adapters.storage.setItem('k', 'v')
  assert.equal(adapters.storage.getItem('k'), 'v')
  adapters.storage.removeItem('k')
  assert.equal(adapters.storage.getItem('k'), null)
  assert.equal((await adapters.clipboard.readText()) ?? '', 'read')
  await adapters.clipboard.writeText('copied')

  assert.equal(requested, true)
  assert.equal(canceled, true)
  assert.equal(cursor, 'crosshair')
  assert.equal(clipboardValue, 'copied')
})
