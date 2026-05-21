import assert from 'node:assert/strict'
import test from 'node:test'

import type { EngineMat4 } from '../../../math/dimension/types.ts'
import type { EngineMeshRayGeometry } from './meshRayIntersector.ts'
import {
  resolveEngineSceneMeshRayCandidates,
} from './sceneMeshRayAdapter.ts'

/**
 * Verifies inline geometry sources convert directly into mesh ray candidates.
 */
test('resolveEngineSceneMeshRayCandidates converts inline geometry sources', () => {
  const result = resolveEngineSceneMeshRayCandidates({
    sources: [{
      nodeId: 'mesh-a',
      nodeType: 'shape',
      geometry: createTriangleGeometry(),
      zOrder: 3,
      score: 0.5,
    }],
  })

  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0]?.nodeId, 'mesh-a')
  assert.equal(result.candidates[0]?.geometry.triangles.length, 1)
  assert.equal(result.candidates[0]?.zOrder, 3)
  assert.equal(result.candidates[0]?.score, 0.5)
  assert.deepEqual(result.skippedNodeIds, [])
})

/**
 * Verifies asset-backed geometry and instance transforms emit instance candidates.
 */
test('resolveEngineSceneMeshRayCandidates converts asset-backed mesh instances', () => {
  const transform: EngineMat4 = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, -1,
    0, 0, 0, 1,
  ]
  const result = resolveEngineSceneMeshRayCandidates({
    geometryByAssetId: {
      assetA: createTriangleGeometry(),
    },
    sources: [{
      nodeId: 'mesh-a',
      nodeType: 'shape',
      meshAssetId: 'assetA',
      instances: [{instanceId: 'i1', transform}],
    }],
  })

  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0]?.instanceId, 'i1')
  assert.deepEqual(result.candidates[0]?.transform, transform)
})

/**
 * Verifies missing geometry is reported explicitly instead of producing empty success-shaped candidates.
 */
test('resolveEngineSceneMeshRayCandidates reports missing geometry sources', () => {
  const result = resolveEngineSceneMeshRayCandidates({
    sources: [{
      nodeId: 'mesh-a',
      nodeType: 'shape',
      meshAssetId: 'missing',
    }],
  })

  assert.deepEqual(result.candidates, [])
  assert.deepEqual(result.skippedNodeIds, ['mesh-a'])
  assert.deepEqual(result.skippedMissingGeometryAssetIds, ['missing'])
})

/**
 * Intent: create one simple triangle geometry fixture.
 * @returns Mesh ray geometry fixture.
 */
function createTriangleGeometry(): EngineMeshRayGeometry {
  return {
    vertices: [
      {x: 0, y: 0, z: 0},
      {x: 1, y: 0, z: 0},
      {x: 0, y: 1, z: 0},
    ],
    triangles: [[0, 1, 2]],
  }
}
