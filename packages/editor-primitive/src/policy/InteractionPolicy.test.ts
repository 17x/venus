import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveInteractionPolicy} from './InteractionPolicy.ts'

test('resolveInteractionPolicy merges caller overrides on top of defaults', () => {
  const policy = resolveInteractionPolicy({dragThreshold: 8, temporaryPanKey: 'h'})

  assert.equal(policy.dragThreshold, 8)
  assert.equal(policy.temporaryPanKey, 'h')
  // Keep unmodified defaults stable for callers that only override one field.
  assert.equal(policy.doubleClickIntervalMs, 300)
})

