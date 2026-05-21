import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveRuntimeEffectiveSnapGuides,
  resolveRuntimeMoveSnapToleranceWorld,
  resolveRuntimeSnappingEnablement,
} from '../snappingPolicy.ts'

test('snapping enablement disables when user toggle is off', () => {
  const result = resolveRuntimeSnappingEnablement({
    userEnabled: false,
    interactionShapeCount: 1,
  })

  assert.deepEqual(result, {
    enabled: false,
    reason: 'user-disabled',
  })
})

test('snapping enablement disables for large scene even when user toggle is on', () => {
  const result = resolveRuntimeSnappingEnablement({
    userEnabled: true,
    interactionShapeCount: 30_000,
  })

  assert.deepEqual(result, {
    enabled: false,
    reason: 'scene-too-large',
  })
})

test('snapping tolerance scales with zoom and stays clamped', () => {
  const zoomOutTolerance = resolveRuntimeMoveSnapToleranceWorld({viewportScale: 0.1})
  const zoomInTolerance = resolveRuntimeMoveSnapToleranceWorld({viewportScale: 10})

  assert.equal(zoomOutTolerance, 12)
  assert.equal(Math.abs(zoomInTolerance - 0.6) < 1e-9, true)
})

test('guide visualization keeps full guides when overlay is not degraded', () => {
  const result = resolveRuntimeEffectiveSnapGuides({
    guides: [
      {axis: 'x', kind: 'edge-min', value: 10},
      {axis: 'x', kind: 'center', value: 20},
      {axis: 'y', kind: 'center', value: 30},
    ],
    overlayInteractionDegraded: false,
    selectedBounds: null,
  })

  assert.equal(result.strategy, 'full')
  assert.equal(result.guides.length, 3)
})

test('guide visualization keeps one guide per axis in degraded mode without selected bounds', () => {
  const result = resolveRuntimeEffectiveSnapGuides({
    guides: [
      {axis: 'x', kind: 'edge-min', value: 10},
      {axis: 'x', kind: 'center', value: 20},
      {axis: 'y', kind: 'center', value: 30},
      {axis: 'y', kind: 'edge-max', value: 40},
    ],
    overlayInteractionDegraded: true,
    selectedBounds: null,
  })

  assert.equal(result.strategy, 'axis-first')
  assert.deepEqual(result.guides, [
    {axis: 'x', kind: 'edge-min', value: 10},
    {axis: 'y', kind: 'center', value: 30},
  ])
})

test('guide visualization keeps nearest guide per axis in degraded mode with selected bounds', () => {
  const result = resolveRuntimeEffectiveSnapGuides({
    guides: [
      {axis: 'x', kind: 'edge-min', value: 3},
      {axis: 'x', kind: 'center', value: 6},
      {axis: 'y', kind: 'center', value: 7},
      {axis: 'y', kind: 'edge-max', value: 12},
    ],
    overlayInteractionDegraded: true,
    selectedBounds: {minX: 4, minY: 4, maxX: 8, maxY: 8},
  })

  assert.equal(result.strategy, 'axis-relevance')
  assert.deepEqual(result.guides, [
    {axis: 'x', kind: 'center', value: 6},
    {axis: 'y', kind: 'center', value: 7},
  ])
})
