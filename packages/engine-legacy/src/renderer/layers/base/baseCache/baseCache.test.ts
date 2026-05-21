import assert from 'node:assert/strict'
import test from 'node:test'

import { BaseRenderCache } from './baseCache.ts'

test('BaseRenderCache keeps cache on/off observable consistency for same key', () => {
  const cache = new BaseRenderCache()
  const key = {
    revision: 'cache-1',
    viewportSignature: '800:600:1:0:0',
  }
  const commands = [
    {
      id: 'base:shape-1',
      nodeId: 'shape-1',
      layer: 'base' as const,
      nodeType: 'shape' as const,
      bounds: {
        x: 10,
        y: 10,
        width: 50,
        height: 40,
      },
    },
  ]

  cache.set(key, commands)
  const cached = cache.get(key)

  // Cache consistency check ensures same key resolves same command payload.
  assert.deepEqual(cached, commands)

  cache.clear()
  assert.equal(cache.get(key), null)
})
