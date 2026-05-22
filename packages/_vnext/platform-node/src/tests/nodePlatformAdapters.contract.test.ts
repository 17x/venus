import assert from 'node:assert/strict'
import test from 'node:test'

import {createNodePlatformAdapters} from '../nodePlatformAdapters'

/**
 * Verifies node platform adapters expose deterministic headless-safe behavior.
 */
test('createNodePlatformAdapters exposes deterministic headless behavior', async () => {
  const adapters = createNodePlatformAdapters({
    requestFrame: (_callback) => 7,
    cancelFrame: (_handleId) => {},
    now: () => 456,
    createWorker: (_scriptUrl, _options) => ({
      postMessage: (_payload: unknown) => {},
      terminate: () => {},
    }),
    createCanvas: (_options) => ({width: 40, height: 30}),
  })

  assert.equal(adapters.now(), 456)
  assert.equal(adapters.frame.requestFrame(() => {}), 7)
  assert.equal(adapters.createCanvas().width, 40)

  adapters.storage.setItem('a', 'b')
  assert.equal(adapters.storage.getItem('a'), 'b')
  adapters.storage.removeItem('a')
  assert.equal(adapters.storage.getItem('a'), null)

  assert.equal(await adapters.clipboard.readText(), '')
  await adapters.clipboard.writeText('noop')
})
