import assert from 'node:assert/strict'
import test from 'node:test'

import {resolveRuntimeRenderPolicy} from './renderPolicy.ts'

const TEST_LOD_CONFIG = {
  lodLevelCapabilities: {
    3: {
      // Mirror the vector-app settled preset so the regression stays local to
      // render-policy behavior and does not depend on runtime alias loading.
      quality: 'full' as const,
      dpr: 1,
      interactiveIntervalMs: 16,
      interactionPreview: false as const,
    },
  },
  interactionCapabilities: {
    zoom: {
      // Keep zoom behavior aligned with the product preset while running in a
      // plain Node test environment.
      quality: 'interactive' as const,
      dpr: 'auto' as const,
      interactionActive: true,
      interactiveIntervalMs: 8,
      interactionPreview: {
        enabled: true,
        mode: 'interaction' as const,
        cacheOnly: false,
        maxScaleStep: 8,
        maxTranslatePx: 100_000,
      },
    },
    drag: {
      // Keep drag aligned with direct manipulation expectations in tests.
      quality: 'full' as const,
      dpr: 'auto' as const,
      interactionActive: true,
      interactiveIntervalMs: 8,
      interactionPreview: false as const,
    },
  },
}

test('settled high-pressure frames stay full quality while keeping lowered DPR', () => {
  // Large startup scenes should remain readable on settled frames even when
  // the LOD profile lowers DPR for cost control.
  const policy = resolveRuntimeRenderPolicy({
    phase: 'settled',
    lodLevel: 3,
    viewportScale: 0.04,
    deviceDpr: 2,
    lodConfig: TEST_LOD_CONFIG,
  })

  assert.equal(policy.quality, 'full')
  assert.equal(policy.dpr, 1)
  assert.equal(policy.overlayMode, 'full')
})

test('zoom interaction still opts into interactive quality after the settled fix', () => {
  // Keep explicit interaction phases on the cheap path so pan/zoom behavior
  // does not regress while settled startup frames regain full fidelity.
  const policy = resolveRuntimeRenderPolicy({
    phase: 'zoom',
    lodLevel: 3,
    viewportScale: 0.04,
    deviceDpr: 2,
    lodConfig: TEST_LOD_CONFIG,
  })

  assert.equal(policy.quality, 'interactive')
  assert.equal(policy.overlayMode, 'degraded')
  assert.equal(policy.interactionPreview === false ? false : policy.interactionPreview.cacheOnly, false)
})

test('drag interaction stays full quality and keeps uncapped settled fidelity inputs', () => {
  // Drag should remain interactive from a scheduler standpoint without
  // downgrading the base scene or overlay fidelity.
  const policy = resolveRuntimeRenderPolicy({
    phase: 'drag',
    lodLevel: 3,
    viewportScale: 0.5,
    deviceDpr: 2,
    lodConfig: TEST_LOD_CONFIG,
  })

  assert.equal(policy.quality, 'full')
  assert.equal(policy.overlayMode, 'full')
  assert.equal(policy.dpr, 1.5)
})