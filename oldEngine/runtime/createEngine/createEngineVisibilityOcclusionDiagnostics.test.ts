import assert from 'node:assert/strict'
import test from 'node:test'

import type { EngineFramePlan } from '../../scene/framePlan.ts'
import {
  resolveCreateEngineVisibilityOcclusionDiagnostics,
} from './createEngineVisibilityOcclusionDiagnostics.ts'

/**
 * Verifies empty frame plans report occlusion diagnostics as unavailable.
 */
test('resolveCreateEngineVisibilityOcclusionDiagnostics reports unavailable without candidates', () => {
  const diagnostics = resolveCreateEngineVisibilityOcclusionDiagnostics(null)

  assert.deepEqual(diagnostics, {
    mode: 'unavailable',
    candidateCount: 0,
    visibleCount: 0,
    occludedCount: 0,
  })
})

/**
 * Verifies coarse frame-plan candidates can exercise the staged occlusion planner shape.
 */
test('resolveCreateEngineVisibilityOcclusionDiagnostics reports rank proxy occlusion counts', () => {
  const diagnostics = resolveCreateEngineVisibilityOcclusionDiagnostics(createFramePlan(['front', 'back']))

  assert.deepEqual(diagnostics, {
    mode: 'rank-proxy',
    candidateCount: 2,
    visibleCount: 1,
    occludedCount: 1,
  })
})

/**
 * Intent: create one minimal frame-plan fixture for diagnostics bridge tests.
 * @param candidateNodeIds Candidate ids to expose through the fixture.
 * @returns Frame-plan fixture.
 */
function createFramePlan(candidateNodeIds: readonly string[]): EngineFramePlan {
  return {
    revision: 1,
    planVersion: 1,
    sceneNodeCount: candidateNodeIds.length,
    candidateNodeIds,
    candidateCount: candidateNodeIds.length,
    viewportBounds: {x: 0, y: 0, width: 100, height: 100},
    queryPadding: 0,
  }
}
