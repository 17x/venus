import assert from 'node:assert/strict'
import test from 'node:test'

import { ENGINE_RENDER_FALLBACK_REASON } from './fallbackTaxonomy.ts'

/**
 * Verify fallback taxonomy values remain unique for diagnostics aggregation keys.
 */
test('fallback taxonomy keeps unique reason values', () => {
  const values = Object.values(ENGINE_RENDER_FALLBACK_REASON)
  const uniqueValues = new Set(values)

  // Duplicate reason strings would collapse metrics buckets across fallback lanes.
  assert.equal(uniqueValues.size, values.length)
})

/**
 * Verify taxonomy includes critical lane-level reasons used by renderer orchestration.
 */
test('fallback taxonomy exposes required lane markers', () => {
  assert.equal(ENGINE_RENDER_FALLBACK_REASON.NONE, 'none')
  assert.equal(ENGINE_RENDER_FALLBACK_REASON.L0_NO_SNAPSHOT, 'l0-no-snapshot')
  assert.equal(ENGINE_RENDER_FALLBACK_REASON.L2_TILE_FALLBACK_TO_COMPOSITE, 'l2-tile-fallback-to-composite')
  assert.equal(ENGINE_RENDER_FALLBACK_REASON.L3_EMPTY_FRAME_MODEL_FALLBACK, 'l3-empty-frame-model-fallback')
})
