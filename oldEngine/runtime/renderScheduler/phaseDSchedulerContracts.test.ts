import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEngineSchedulerPolicyV2 } from './schedulerPolicyV2.ts'

test('resolveEngineSchedulerPolicyV2 coalesces requests while in flight', () => {
  const decision = resolveEngineSchedulerPolicyV2({
    mode: 'interactive',
    inFlight: true,
    pendingFrame: false,
  })

  assert.equal(decision.accepted, false)
  assert.equal(decision.coalesced, true)
})

test('resolveEngineSchedulerPolicyV2 accepts request when idle', () => {
  const decision = resolveEngineSchedulerPolicyV2({
    mode: 'normal',
    inFlight: false,
    pendingFrame: false,
  })

  assert.equal(decision.accepted, true)
  assert.equal(decision.coalesced, false)
})
