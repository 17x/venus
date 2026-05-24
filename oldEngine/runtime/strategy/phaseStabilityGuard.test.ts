import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveEngineStablePhase } from './phaseStabilityGuard.ts'

test('resolveEngineStablePhase requires dwell before switching phase', () => {
  const first = resolveEngineStablePhase(
    {
      phase: 'static',
      pendingPhase: null,
      pendingFrames: 0,
    },
    'pan',
  )

  assert.equal(first.phase, 'static')
  assert.equal(first.pendingPhase, 'pan')

  const second = resolveEngineStablePhase(first, 'pan')
  assert.equal(second.phase, 'pan')
  assert.equal(second.pendingPhase, null)
})
