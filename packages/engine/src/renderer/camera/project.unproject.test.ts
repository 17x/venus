import assert from 'node:assert/strict'
import test from 'node:test'

import { projectWorldPoint } from './project.ts'
import { unprojectScreenPoint } from './unproject.ts'
import type { EngineRenderCamera } from '../../core/types.ts'

test('projectWorldPoint and unprojectScreenPoint are invertible with paired matrices', () => {
  const camera: Pick<EngineRenderCamera, 'matrix' | 'inverseMatrix'> = {
    matrix: [2, 0, 100, 0, 2, 40, 0, 0, 1],
    inverseMatrix: [0.5, 0, -50, 0, 0.5, -20, 0, 0, 1],
  }
  const worldPoint = {x: 12, y: 18}

  const projected = projectWorldPoint(worldPoint, camera)
  const unprojected = unprojectScreenPoint(projected, camera)

  // Camera projection pair must preserve original world coordinates.
  assert.equal(Math.abs(unprojected.x - worldPoint.x) < 1e-8, true)
  assert.equal(Math.abs(unprojected.y - worldPoint.y) < 1e-8, true)
})
