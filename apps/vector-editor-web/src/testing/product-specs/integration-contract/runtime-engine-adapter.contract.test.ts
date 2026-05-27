import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveRuntimeRenderPolicy} from '../../../runtime/engine-bridge/renderPolicy.ts'
import {resolveHitGeometryV2} from '../../../runtime/engine-bridge/engineContractAdapters.ts'

// ---------------------------------------------------------------------------
// TC-01: Hit Geometry Contract
// ---------------------------------------------------------------------------

test('TC-01.1 resolveHitGeometryV2 returns stable apiVersion with empty nodes', () => {
  const result = resolveHitGeometryV2({nodes: []})

  assert.equal(result.apiVersion, '2.0.0')
})

test('TC-01.2 resolveHitGeometryV2 diagnostics contain candidateCount/filteredCount/costMs', () => {
  const result = resolveHitGeometryV2({nodes: []})

  assert.ok(typeof result.diagnostics.candidateCount === 'number')
  assert.ok(typeof result.diagnostics.filteredCount === 'number')
  assert.ok(typeof result.diagnostics.costMs === 'number')
  assert.ok(result.diagnostics.costMs >= 0)
})

test('TC-01.3 resolveHitGeometryV2 does not throw on empty input', () => {
  assert.doesNotThrow(() => resolveHitGeometryV2({nodes: []}))
})

test('TC-01.4 resolveHitGeometryV2 returns deterministic field shape for single-node input', () => {
  const result = resolveHitGeometryV2({
    nodes: [{id: 'test-rect', type: 'shape', shape: 'rect', x: 0, y: 0, width: 100, height: 100}],
  })

  assert.equal(result.apiVersion, '2.0.0')
  assert.ok(Array.isArray(result.pointHitNodeIds))
  assert.ok(Array.isArray(result.marqueeCandidateNodeIds))
  assert.ok(Array.isArray(result.marqueeResolvedNodeIds))
})

// ---------------------------------------------------------------------------
// TC-RP: Render Policy Contracts (existing)
// ---------------------------------------------------------------------------

test('runtime-engine policy contract keeps pan phase at full quality interaction mode', () => {
  const policy = resolveRuntimeRenderPolicy({
    phase: 'pan',
    lodLevel: 3,
    viewportScale: 1,
    deviceDpr: 2,
  })

  assert.equal(policy.quality, 'full')
  assert.equal(policy.interactionActive, true)
})

test('runtime-engine policy contract applies high-zoom sharpness guard', () => {
  const policy = resolveRuntimeRenderPolicy({
    phase: 'zoom',
    lodLevel: 3,
    viewportScale: 3,
    deviceDpr: 2,
  })

  assert.equal(typeof policy.dpr, 'number')
  assert.ok((policy.dpr as number) >= 2)
})
