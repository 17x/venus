import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngine } from './createEngine/createEngine.ts'
import {
  createFakeClock,
  createScene,
  createTextHeavyScene,
  installFakeCanvasEnvironment,
} from './createEngine.integrationTestHelpers.ts'

/**
 * Verifies geometry cache counters and hit-rate metrics are emitted in render stats.
 */
test('createEngine render stats include unified geometry cache hit-rate metrics', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 150,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: false},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    const firstStats = await engine.renderFrame()
    const secondStats = await engine.renderFrame()

    assert.ok((firstStats.geometryCacheHitCount ?? -1) >= 0)
    assert.ok((firstStats.geometryCacheMissCount ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheHitCount ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheMissCount ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheHitRate ?? -1) >= 0)
    assert.ok((secondStats.geometryCacheHitRate ?? 2) <= 1)
  } finally {
    environment.restore()
  }
})

/**
 * Verifies high-zoom text SLA diagnostics detect deferred upload spikes and stabilize after warm-up.
 */
test('createEngine reports high-zoom text sharpness SLA violations on deferred text uploads', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
      initialScene: createTextHeavyScene(8),
      viewport: {
        viewportWidth: 320,
        viewportHeight: 240,
        offsetX: 0,
        offsetY: 0,
        scale: 2.2,
      },
      performance: {
        culling: true,
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 320,
      viewportHeight: 240,
      outputWidth: 320,
      outputHeight: 240,
    })

    fakeClock.setNow(0)
    const firstStats = await engine.renderFrame()
    const firstDiagnostics = engine.getDiagnostics().settleSharpness

    assert.ok((firstStats.webglDeferredTextTextureCount ?? 0) > 0)
    assert.ok((firstStats.webglHighZoomTextSlaViolationCount ?? 0) > 0)
    assert.ok(firstDiagnostics.highZoomTextSlaCheckedCount >= 1)
    assert.ok(firstDiagnostics.highZoomTextSlaViolationCount >= 1)

    fakeClock.setNow(16)
    const secondStats = await engine.renderFrame()
    const secondDiagnostics = engine.getDiagnostics().settleSharpness

    assert.equal(secondStats.webglDeferredTextTextureCount ?? 0, 0)
    assert.equal(secondStats.webglHighZoomTextSlaViolationCount ?? 0, 0)
    assert.ok(secondDiagnostics.highZoomTextSlaCheckedCount >= firstDiagnostics.highZoomTextSlaCheckedCount)
    assert.equal(secondDiagnostics.highZoomTextSlaViolationCount, firstDiagnostics.highZoomTextSlaViolationCount)
  } finally {
    environment.restore()
  }
})

/**
 * Verifies diagnostics expose policy and QoS snapshot fields after first render.
 */
test('createEngine diagnostics expose runtime policy snapshot fields', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 240,
        viewportHeight: 160,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      settings: {
        profile: 'editor',
      },
      render: {
        quality: 'full',
      },
    })

    engine.resize({
      viewportWidth: 240,
      viewportHeight: 160,
      outputWidth: 240,
      outputHeight: 160,
    })

    fakeClock.setNow(0)
    await engine.renderFrame()
    const diagnostics = engine.getDiagnostics()

    assert.equal(diagnostics.policy.profile, 'editor')
    assert.ok(diagnostics.policy.renderScale > 0)
    assert.ok(diagnostics.policy.pressureScore >= 0)
    assert.equal(typeof diagnostics.policy.scalerDecisionReason, 'string')
    assert.equal(typeof diagnostics.qos.trace, 'string')
    assert.ok(diagnostics.qos.guardTriggers.length >= 0)
    assert.equal(typeof diagnostics.qos.degradationLevel, 'string')
    assert.equal(diagnostics.qos.profile, 'editor')
    assert.equal(typeof diagnostics.qos.pressure, 'string')
    assert.ok(diagnostics.qos.budget.drawSubmitBudgetMs >= 0)
    assert.equal(diagnostics.qos.fallbackReason, null)
  } finally {
    environment.restore()
  }
})

/**
 * Verifies 3D visibility policy and preview execution mode diagnostics are populated.
 */
test('createEngine diagnostics expose 3D visibility policy and preview execution mode', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 140,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 140,
      outputWidth: 200,
      outputHeight: 140,
    })

    await engine.renderFrame()
    const diagnostics = engine.getDiagnostics()

    assert.equal(diagnostics.visibility3dPolicy.executionMode, 'fallback-frustum-coarse')
    assert.equal(diagnostics.visibility3dPolicy.hasFrustumResolver, false)
    assert.equal(diagnostics.strategySnapshot.previewExecutionMode, 'affine-snapshot')
  } finally {
    environment.restore()
  }
})
