/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {createWorkerRpcEnvelope} from './rpc.ts'

test('createWorkerRpcEnvelope builds a stable typed envelope', () => {
  const envelope = createWorkerRpcEnvelope('req-1', 'scene.patch', {count: 2})

  assert.deepEqual(envelope, {
    id: 'req-1',
    type: 'scene.patch',
    payload: {count: 2},
  })
})

