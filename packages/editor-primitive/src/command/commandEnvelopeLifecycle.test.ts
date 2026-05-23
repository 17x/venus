import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCommandEnvelope,
  createCommandIdFactory,
  createCommandTransactionIdFactory,
} from './CommandEnvelope.ts'

test('command envelope keeps command payload and transaction metadata', () => {
  const envelope = createCommandEnvelope({
    id: 'cmd-1',
    source: 'user',
    transactionId: 'txn-1',
    issuedAt: 123,
    command: {
      type: 'shape.move',
      shapeId: 'shape-1',
    },
  })

  assert.equal(envelope.id, 'cmd-1')
  assert.equal(envelope.source, 'user')
  assert.equal(envelope.transactionId, 'txn-1')
  assert.equal(envelope.issuedAt, 123)
  assert.equal(envelope.command.type, 'shape.move')
})

test('command id and transaction id factories emit monotonic ids', () => {
  const nextCommandId = createCommandIdFactory('cmd')
  const nextTransactionId = createCommandTransactionIdFactory('txn')

  assert.deepEqual([nextCommandId(), nextCommandId(), nextCommandId()], ['cmd-1', 'cmd-2', 'cmd-3'])
  assert.deepEqual([nextTransactionId(), nextTransactionId()], ['txn-1', 'txn-2'])
})
