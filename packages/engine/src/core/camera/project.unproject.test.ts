import assert from 'node:assert/strict'
import test from 'node:test'

import { projectWorldPoint } from './project.ts'
import { resolveEngineViewportWorldBounds, resolveEngineViewportWorldRect } from './viewportBounds.ts'
import { unprojectScreenPoint } from './unproject.ts'
import type { EngineRenderCamera } from '../types.ts'

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

test('resolveEngineViewportWorldBounds applies directional overscan in CSS pixels', () => {
  const viewport = {
    viewportWidth: 400,
    viewportHeight: 200,
    offsetX: 40,
    offsetY: 20,
    scale: 2,
  }

  assert.deepEqual(resolveEngineViewportWorldRect(viewport, {overscanCssPx: 20}), {
    x: -30,
    y: -20,
    width: 220,
    height: 120,
  })
  assert.deepEqual(
    resolveEngineViewportWorldBounds(viewport, {
      overscanCssPx: {left: 40, right: 10, top: 20, bottom: 0},
    }),
    {minX: -40, minY: -20, maxX: 185, maxY: 90},
  )
})

test('resolveEngineViewportWorldBounds normalizes negative scale coverage', () => {
  const bounds = resolveEngineViewportWorldBounds({
    viewportWidth: 100,
    viewportHeight: 50,
    offsetX: 10,
    offsetY: 20,
    scale: -2,
  })

  assert.deepEqual(bounds, {
    minX: -45,
    minY: -15,
    maxX: 5,
    maxY: 10,
  })
})
