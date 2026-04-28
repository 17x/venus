import assert from 'node:assert/strict'
import test from 'node:test'

import {createOperationCommandSession} from './OperationCommandBridge.ts'

test('operation command session commits once and updates terminal status', () => {
  const events: string[] = []
  const session = createOperationCommandSession('session-1', {
    preview: () => events.push('preview'),
    commit: () => events.push('commit'),
    cancel: () => events.push('cancel'),
  })

  session.preview({delta: 1})
  session.commit({delta: 2})
  // Ignore post-commit cancel to keep command bridge lifecycle strict.
  session.cancel()

  assert.equal(session.status, 'committed')
  assert.deepEqual(events, ['preview', 'commit'])
})

