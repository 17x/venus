import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_MAX_SETTLE_DIRTY_WORLD_EXTENT,
  DEFAULT_MIN_SCALE_FOR_SETTLE_DIRTY_MARK,
  resolveViewportSettleDirtyBounds,
} from './viewportSettleDirtyBounds.ts'

/**
 * Verifies settle-phase dirty marking is skipped under extreme zoom-out to avoid lockups.
 */
test('resolveViewportSettleDirtyBounds skips dirty bounds below minimum scale', () => {
  const dirtyBounds = resolveViewportSettleDirtyBounds({
    viewportWidth: 2000,
    viewportHeight: 1200,
    offsetX: 0,
    offsetY: 0,
    scale: DEFAULT_MIN_SCALE_FOR_SETTLE_DIRTY_MARK * 0.5,
  })

  assert.equal(dirtyBounds, null)
})

/**
 * Verifies world-extent clamp preserves viewport-center alignment after limiting bounds.
 */
test('resolveViewportSettleDirtyBounds clamps extent while preserving world center', () => {
  const input = {
    viewportWidth: 6000,
    viewportHeight: 4000,
    offsetX: -250,
    offsetY: 125,
    scale: 0.05,
  }

  const dirtyBounds = resolveViewportSettleDirtyBounds(input)
  assert.notEqual(dirtyBounds, null)

  const safeScale = Math.max(Number.EPSILON, Math.abs(input.scale))
  const rawWorldWidth = input.viewportWidth / safeScale
  const rawWorldHeight = input.viewportHeight / safeScale
  const expectedCenterX = -input.offsetX / safeScale + rawWorldWidth * 0.5
  const expectedCenterY = -input.offsetY / safeScale + rawWorldHeight * 0.5

  assert.equal(dirtyBounds?.width, DEFAULT_MAX_SETTLE_DIRTY_WORLD_EXTENT)
  assert.equal(dirtyBounds?.height, DEFAULT_MAX_SETTLE_DIRTY_WORLD_EXTENT)

  const actualCenterX = (dirtyBounds?.x ?? 0) + (dirtyBounds?.width ?? 0) * 0.5
  const actualCenterY = (dirtyBounds?.y ?? 0) + (dirtyBounds?.height ?? 0) * 0.5
  assert.equal(actualCenterX, expectedCenterX)
  assert.equal(actualCenterY, expectedCenterY)
})

/**
 * Verifies normal zoom levels keep full viewport-derived world dirty extent.
 */
test('resolveViewportSettleDirtyBounds keeps unclamped extent at normal scale', () => {
  const input = {
    viewportWidth: 800,
    viewportHeight: 600,
    offsetX: 40,
    offsetY: 20,
    scale: 2,
  }

  const dirtyBounds = resolveViewportSettleDirtyBounds(input)
  assert.notEqual(dirtyBounds, null)
  assert.equal(dirtyBounds?.width, 400)
  assert.equal(dirtyBounds?.height, 300)

  const safeScale = Math.max(Number.EPSILON, Math.abs(input.scale))
  const expectedX = -input.offsetX / safeScale
  const expectedY = -input.offsetY / safeScale
  assert.equal(dirtyBounds?.x, expectedX)
  assert.equal(dirtyBounds?.y, expectedY)
})
