import assert from 'node:assert/strict'
import test from 'node:test'

import {createRenderParityChecklistReport} from '../../../runtime/engine-bridge/renderParityChecklist.ts'

/**
 * Verifies parity checklist report keeps required fallback-classification row and stable schema.
 */
test('render parity checklist report keeps fallback classification row stable', () => {
  const report = createRenderParityChecklistReport()

  assert.equal(report.schemaVersion, 1)
  const fallbackRow = report.rows.find((row) => row.id === 'model-complete-failure-fallback-classification')
  assert.notEqual(fallbackRow, undefined)
  assert.equal(fallbackRow?.webgl.status, 'pass')
  assert.equal(fallbackRow?.webgpu.status, 'pass')
})

/**
 * Verifies parity checklist summary counters stay aligned with backend row statuses.
 */
test('render parity checklist report summary tracks backend status counts', () => {
  const report = createRenderParityChecklistReport()

  const recomputed = {
    pass: {webgl: 0, webgpu: 0},
    degraded: {webgl: 0, webgpu: 0},
    fail: {webgl: 0, webgpu: 0},
    unknown: {webgl: 0, webgpu: 0},
  }

  for (const row of report.rows) {
    recomputed[row.webgl.status].webgl += 1
    recomputed[row.webgpu.status].webgpu += 1
  }

  assert.deepEqual(report.summary, recomputed)
})
