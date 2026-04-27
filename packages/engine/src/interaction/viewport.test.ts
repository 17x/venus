import test from 'node:test'
import assert from 'node:assert/strict'

import {applyMatrixToPoint} from '../math/matrix.ts'
import {
  DEFAULT_ENGINE_VIEWPORT,
  clampEngineViewportScale,
  fitEngineViewportToDocument,
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
} from './viewport.ts'

test('clampEngineViewportScale clamps to shared min and max bounds', () => {
  assert.equal(clampEngineViewportScale(0.001), 0.02)
  assert.equal(clampEngineViewportScale(64), 32)
  assert.equal(clampEngineViewportScale(1.5), 1.5)
})

test('panEngineViewportState keeps scale and applies screen-space offsets', () => {
  const viewport = resolveEngineViewportState({
    viewportWidth: 800,
    viewportHeight: 600,
    offsetX: 20,
    offsetY: 30,
    scale: 2,
  })

  const next = panEngineViewportState(viewport, 15, -10)

  assert.equal(next.offsetX, 35)
  assert.equal(next.offsetY, 20)
  assert.equal(next.scale, 2)
})

test('zoomEngineViewportState preserves the anchor world point on screen', () => {
  const viewport = resolveEngineViewportState({
    viewportWidth: 1000,
    viewportHeight: 700,
    offsetX: 100,
    offsetY: 50,
    scale: 2,
  })
  const anchor = {x: 320, y: 240}
  const worldPointBefore = applyMatrixToPoint(viewport.inverseMatrix, anchor)

  const next = zoomEngineViewportState(viewport, 4, anchor)
  const worldPointAfter = applyMatrixToPoint(next.inverseMatrix, anchor)

  assert.deepEqual(worldPointAfter, worldPointBefore)
  assert.equal(next.scale, 4)
})

test('fitEngineViewportToDocument centers the document inside padded viewport space', () => {
  const viewport = resolveEngineViewportState({
    ...DEFAULT_ENGINE_VIEWPORT,
    viewportWidth: 1000,
    viewportHeight: 800,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })

  const next = fitEngineViewportToDocument({width: 400, height: 200}, viewport)

  assert.equal(next.scale, 2.1)
  assert.equal(next.offsetX, 80)
  assert.equal(next.offsetY, 190)
})