import assert from 'node:assert/strict'
import test from 'node:test'

import {createDisabledSyncProvider} from './syncProvider.ts'

test('disabled sync provider never exposes a partial online state', async () => {
  const provider = createDisabledSyncProvider()

  await provider.start()
  provider.requestSync()

  assert.deepEqual(provider.getSnapshot(), {
    status: 'disabled',
    pendingOperationCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
  })
})
