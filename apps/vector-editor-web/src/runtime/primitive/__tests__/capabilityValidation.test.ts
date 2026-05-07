import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapEditorPrimitiveCapabilityDetails,
  validateEditorPrimitiveCapabilities,
} from '../capabilityValidation.ts'

/**
 * Verifies vector runtime can touch every editor-primitive module through the capability bridge.
 */
test('editor-primitive capability bridge validates all primitive modules', () => {
  const report = validateEditorPrimitiveCapabilities()

  assert.equal(report.results.length, 17)
  assert.equal(report.allPassed, true)
})

/**
 * Verifies capability detail mapper emits one status line per primitive module.
 */
test('editor-primitive capability detail map contains per-module status entries', () => {
  const details = mapEditorPrimitiveCapabilityDetails(validateEditorPrimitiveCapabilities())

  assert.ok(details.input.startsWith('pass'))
  assert.ok(details.runtime.startsWith('pass'))
})
