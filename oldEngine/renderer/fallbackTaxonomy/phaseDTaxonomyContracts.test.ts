import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEngineRenderRequestReasonCounters,
  ENGINE_RENDER_REQUEST_REASON,
  incrementEngineRenderRequestReason,
} from './renderRequestTaxonomy.ts'
import {
  isEngineFallbackRecovered,
  resolveEngineFallbackSeverity,
} from './fallbackReasonModel.ts'
import { ENGINE_RENDER_FALLBACK_REASON } from './fallbackTaxonomy.ts'

test('request taxonomy counters initialize and increment deterministically', () => {
  const counters = createEngineRenderRequestReasonCounters()
  const next = incrementEngineRenderRequestReason(counters, ENGINE_RENDER_REQUEST_REASON.RESIZE)

  assert.equal(counters[ENGINE_RENDER_REQUEST_REASON.RESIZE], 0)
  assert.equal(next[ENGINE_RENDER_REQUEST_REASON.RESIZE], 1)
})

test('fallback reason model resolves severity and recovery', () => {
  assert.equal(
    resolveEngineFallbackSeverity(ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK),
    'critical',
  )
  assert.equal(
    isEngineFallbackRecovered(
      ENGINE_RENDER_FALLBACK_REASON.NONE,
      ENGINE_RENDER_FALLBACK_REASON.L0_PREVIEW_MISS,
    ),
    true,
  )
})
