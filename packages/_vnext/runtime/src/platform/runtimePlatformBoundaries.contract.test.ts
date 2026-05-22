import assert from 'node:assert/strict'
import test from 'node:test'

import {createBrowserRuntimeAdapterSet} from './browserRuntimeAdapters'
import {createNodeRuntimeAdapterSet} from './nodeRuntimeAdapters'

/**
 * Verifies browser boundary adapters forward calls into provided browser hooks.
 */
test('createBrowserRuntimeAdapterSet forwards boundary contracts', async () => {
  let frameRequested = false
  let frameCanceled = false
  let workerCreated = false
  let canvasCreated = false
  let cursorSet = false
  let storageWrite = ''
  let clipboardWrite = ''
  let receivedInputType = ''

  const adapterSet = createBrowserRuntimeAdapterSet({
    now: () => 42,
    requestFrame: (_callback) => {
      frameRequested = true
      return 1
    },
    cancelFrame: (_handleId) => {
      frameCanceled = true
    },
    createWorker: (_scriptUrl, _options) => {
      workerCreated = true
      return {
        postMessage: (_message) => {},
        terminate: () => {},
      }
    },
    createCanvas: (_options) => {
      canvasCreated = true
      return {width: 10, height: 20}
    },
    subscribeInput: (listener) => {
      listener({type: 'pointer.down', timestamp: 1, payload: {}})
      return () => {}
    },
    setCursor: (_cursor) => {
      cursorSet = true
    },
    getStorageItem: (_key) => storageWrite || null,
    setStorageItem: (_key, value) => {
      storageWrite = value
    },
    removeStorageItem: (_key) => {
      storageWrite = ''
    },
    readClipboardText: async () => 'read',
    writeClipboardText: async (text) => {
      clipboardWrite = text
    },
  })

  assert.equal(adapterSet.clock.now(), 42)
  adapterSet.frame.requestFrame(() => {})
  adapterSet.frame.cancelFrame(1)
  adapterSet.worker.createWorker('worker.js')
  adapterSet.canvas.createCanvas({width: 1, height: 2})
  adapterSet.input.subscribe((event) => {
    receivedInputType = event.type
  })
  adapterSet.cursor?.setCursor('crosshair')
  adapterSet.storage?.setItem('k', 'v')
  assert.equal(adapterSet.storage?.getItem('k'), 'v')
  adapterSet.storage?.removeItem('k')
  assert.equal(adapterSet.storage?.getItem('k'), null)
  assert.equal(await adapterSet.clipboard?.readText(), 'read')
  await adapterSet.clipboard?.writeText('copied')

  assert.equal(frameRequested, true)
  assert.equal(frameCanceled, true)
  assert.equal(workerCreated, true)
  assert.equal(canvasCreated, true)
  assert.equal(cursorSet, true)
  assert.equal(receivedInputType, 'pointer.down')
  assert.equal(clipboardWrite, 'copied')
})

/**
 * Verifies node boundary adapters provide headless-safe defaults.
 */
test('createNodeRuntimeAdapterSet exposes headless-safe adapter defaults', async () => {
  const adapterSet = createNodeRuntimeAdapterSet({
    now: () => 99,
    requestFrame: (_callback) => 7,
    cancelFrame: (_handleId) => {},
    createWorker: (_scriptUrl, _options) => ({
      postMessage: (_message) => {},
      terminate: () => {},
    }),
    createCanvas: (_options) => ({width: 100, height: 60}),
  })

  assert.equal(adapterSet.clock.now(), 99)
  assert.equal(adapterSet.frame.requestFrame(() => {}), 7)
  assert.equal(adapterSet.canvas.createCanvas().width, 100)

  adapterSet.storage?.setItem('foo', 'bar')
  assert.equal(adapterSet.storage?.getItem('foo'), 'bar')
  adapterSet.storage?.removeItem('foo')
  assert.equal(adapterSet.storage?.getItem('foo'), null)

  assert.equal(await adapterSet.clipboard?.readText(), '')
  await adapterSet.clipboard?.writeText('noop')

  const unsubscribe = adapterSet.input.subscribe(() => {})
  unsubscribe()
})
