/// <reference types="node" />
import assert from 'node:assert/strict'
import test from 'node:test'

import {applyMatrixToPoint} from '../math/matrix.ts'
import {
  DEFAULT_VIEWPORT,
  clampViewportScale,
  fitViewportToDocument,
  panViewportState,
  resolveViewportState,
  zoomViewportState,
} from './viewport.ts'

test('clampViewportScale clamps to shared min and max bounds', () => {
  assert.equal(clampViewportScale(0.001), 0.02)
  assert.equal(clampViewportScale(64), 32)
  assert.equal(clampViewportScale(1.5), 1.5)
})

test('panViewportState keeps scale and applies screen-space offsets', () => {
  const viewport = resolveViewportState({
    viewportWidth: 800,
    viewportHeight: 600,
    offsetX: 20,
    offsetY: 30,
    scale: 2,
  })

  const next = panViewportState(viewport, 15, -10)

  assert.equal(next.offsetX, 35)
  assert.equal(next.offsetY, 20)
  assert.equal(next.scale, 2)
})

test('zoomViewportState preserves anchor world point on screen', () => {
  const viewport = resolveViewportState({
    viewportWidth: 1000,
    viewportHeight: 700,
    offsetX: 100,
    offsetY: 50,
    scale: 2,
  })
  const anchor = {x: 320, y: 240}
  const worldPointBefore = applyMatrixToPoint(viewport.inverseMatrix, anchor)

  const next = zoomViewportState(viewport, 4, anchor)
  const worldPointAfter = applyMatrixToPoint(next.inverseMatrix, anchor)

  assert.deepEqual(worldPointAfter, worldPointBefore)
  assert.equal(next.scale, 4)
})

test('fitViewportToDocument centers document inside padded viewport space', () => {
  const viewport = resolveViewportState({
    ...DEFAULT_VIEWPORT,
    viewportWidth: 1000,
    viewportHeight: 800,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })

  const next = fitViewportToDocument({width: 400, height: 200}, viewport)

  assert.equal(next.scale, 2.1)
  assert.equal(next.offsetX, 80)
  assert.equal(next.offsetY, 190)
})

