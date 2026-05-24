import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveEngineRuntimeInspectorV2Snapshot,
} from './runtimeInspectorV2.ts'

test('resolveEngineRuntimeInspectorV2Snapshot normalizes fallback and execution mode fields', () => {
  const snapshot = resolveEngineRuntimeInspectorV2Snapshot({
    phase: 'pan',
    pressure: 'medium',
    profile: 'editor',
    fallbackReason: null,
    visibility3dExecutionMode: '',
    previewExecutionMode: '',
  })

  assert.equal(snapshot.fallbackReason, null)
  assert.equal(snapshot.visibility3dExecutionMode, 'frustum-only')
  assert.equal(snapshot.previewExecutionMode, 'unknown')
})
