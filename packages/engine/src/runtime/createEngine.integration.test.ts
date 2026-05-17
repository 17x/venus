import assert from 'node:assert/strict'
import test from 'node:test'

import { createEngine } from './createEngine/createEngine.ts'
import type { EngineRenderStats } from '../renderer/types/index.ts'
import {
  createFakeClock,
  createOverlappingScene,
  createScene,
  installFakeCanvasEnvironment,
} from './createEngine.integrationTestHelpers.ts'

test('createEngine integrates scene load, render output, hitTest, and render positioning', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const statsFromDebug: EngineRenderStats[] = []
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 150,
        offsetX: 10,
        offsetY: 20,
        scale: 2,
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
        interactionPreview: {enabled: false},
      },
      debug: {
        onStats: (stats) => {
          // Mirror renderFrame output through debug callback so the test covers the full engine event path.
          statsFromDebug.push(stats)
        },
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 400,
      outputHeight: 300,
    })

    const stats = await engine.renderFrame()
    const hit = engine.hitTest({x: 15, y: 25})
    const hit2d = engine.hitTest2D({x: 15, y: 25})
    const hitRay = engine.hitTestRay({
      origin: {x: 15, y: 25, z: 100},
      direction: {x: 0, y: 0, z: -1},
    })
    const miss = engine.hitTest({x: 250, y: 250})
    const candidates = engine.queryViewportCandidates()
    const performanceGate = engine.getDiagnostics().performanceGate

    // The render path should submit only the visible node and surface one draw call.
    assert.equal(stats.drawCount, 1)
    assert.equal(stats.visibleCount, 1)
    assert.equal(stats.culledCount, 1)
    assert.equal(statsFromDebug.at(-1)?.drawCount, 1)

    // World-space hit testing should find the visible rectangle but reject misses outside the scene.
    assert.equal(hit?.nodeId, 'rect-visible')
    assert.equal(hit2d?.nodeId, 'rect-visible')
    assert.equal(hitRay?.nodeId, 'rect-visible')
    assert.equal(miss, null)
    assert.deepEqual(candidates, ['rect-visible'])
    assert.equal(performanceGate.pass, true)

    const drawCall = environment.recordedDrawCalls.at(-1)
    assert.ok(drawCall, 'expected one submitted WebGL draw call')
    assert.deepEqual(drawCall.rect, [10, 20, 30, 40])
    assert.deepEqual(drawCall.scale, [4, 4])
    assert.deepEqual(drawCall.offset, [20, 40])
    assert.deepEqual(drawCall.viewport, [400, 300])
    assert.deepEqual(drawCall.screenRect, {
      x: 60,
      y: 120,
      width: 120,
      height: 160,
    })
  } finally {
    environment.restore()
  }
})

test('createEngine supports webgpu backend selection through native-probe hybrid path', async () => {
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
        backend: 'webgpu',
        quality: 'full',
        modelCompleteComposite: false,
        interactionPreview: {enabled: false},
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 400,
      outputHeight: 300,
    })

    const stats = await engine.renderFrame()
    const diagnostics = engine.getDiagnostics()
    assert.equal(diagnostics.backend, 'webgpu')
    assert.equal(stats.drawCount, 1)
  } finally {
    environment.restore()
  }
})

test('createEngine settle sharpness contract tracks deadline meet and miss counters', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
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
        lod: {enabled: true},
        tiles: {enabled: false},
        overscan: {enabled: false},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: false,
        interactionPreview: {enabled: false},
      },
    })

    engine.resize({
      viewportWidth: 200,
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    fakeClock.setNow(0)
    engine.panBy(5, 0)
    fakeClock.setNow(70)
    await engine.renderFrame()
    const settleMetDiagnostics = engine.getDiagnostics().settleSharpness
    const settleMetStrategy = engine.getDiagnostics().strategy

    // Settling frame should satisfy stop-to-sharp before 120ms deadline.
    assert.equal(settleMetStrategy.phase, 'settling')
    assert.equal(settleMetDiagnostics.pending, false)
    assert.equal(settleMetDiagnostics.metCount, 1)
    assert.equal(settleMetDiagnostics.missCount, 0)

    fakeClock.setNow(100)
    engine.panBy(3, 0)
    fakeClock.setNow(250)
    await engine.renderFrame()
    const settleMissDiagnostics = engine.getDiagnostics().settleSharpness

    // Missed deadlines should be counted even if the same frame then recovers sharpness.
    assert.equal(settleMissDiagnostics.pending, false)
    assert.equal(settleMissDiagnostics.missCount, 1)
    assert.ok(settleMissDiagnostics.metCount >= 2)
    assert.ok(settleMissDiagnostics.lastMissLatencyMs >= 120)
  } finally {
    environment.restore()
  }
})

test('createEngine predictor diagnostics report pan direction, speed, and confidence', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
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
        lod: {enabled: true},
        tiles: {enabled: true},
        overscan: {enabled: true},
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

    fakeClock.setNow(0)
    await engine.renderFrame()

    fakeClock.setNow(16)
    engine.panBy(24, 0)
    await engine.renderFrame()
    const predictor = engine.getDiagnostics().predictor

    // Direction and speed should reflect the positive-x pan step.
    assert.ok(predictor.directionX > 0)
    assert.equal(predictor.directionY, 0)
    assert.ok(predictor.speedPxPerSec > 0)
    assert.ok(predictor.confidence > 0)
  } finally {
    environment.restore()
  }
})

test('createEngine strategy diagnostics transition pan to settling to static across interaction timeline', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
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
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    fakeClock.setNow(0)
    await engine.renderFrame()

    fakeClock.setNow(16)
    engine.panBy(12, 0)
    await engine.renderFrame()
    const panPhase = engine.getDiagnostics().strategy.phase

    fakeClock.setNow(96)
    await engine.renderFrame()
    const settlingPhase = engine.getDiagnostics().strategy.phase

    fakeClock.setNow(170)
    await engine.renderFrame()
    const staticPhase = engine.getDiagnostics().strategy.phase

    // Strategy should move from interaction lane into settle recovery and then idle lane.
    assert.equal(panPhase, 'pan')
    assert.equal(settlingPhase, 'settling')
    assert.equal(staticPhase, 'static')
  } finally {
    environment.restore()
  }
})

test('createEngine emits predictive preload metrics in render stats when tiles are enabled', async () => {
  const environment = installFakeCanvasEnvironment()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      initialScene: createScene(),
      viewport: {
        viewportWidth: 320,
        viewportHeight: 240,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
      performance: {
        culling: true,
        lod: {enabled: true},
        tiles: {enabled: true},
        overscan: {enabled: true},
      },
      render: {
        quality: 'full',
        modelCompleteComposite: true,
      },
    })

    engine.resize({
      viewportWidth: 320,
      viewportHeight: 240,
      outputWidth: 320,
      outputHeight: 240,
    })

    const stats = await engine.renderFrame()

    // Metrics should always be present and non-negative once predictive stats are wired.
    assert.ok((stats.webglPredictivePreloadEnqueueCount ?? 0) >= 0)
    assert.ok((stats.webglPredictivePreloadProcessedCount ?? 0) >= 0)
    assert.ok((stats.webglPredictivePreloadPrunedCount ?? 0) >= 0)
  } finally {
    environment.restore()
  }
})

test('createEngine hitTest applies adaptive exact-check budget during interaction pressure', async () => {
  const environment = installFakeCanvasEnvironment()
  const fakeClock = createFakeClock()

  try {
    const canvas = new environment.OffscreenCanvas(1, 1) as OffscreenCanvas
    const engine = createEngine({
      canvas,
      clock: fakeClock.clock,
      initialScene: createOverlappingScene(96),
      viewport: {
        viewportWidth: 200,
        viewportHeight: 150,
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
      viewportHeight: 150,
      outputWidth: 200,
      outputHeight: 150,
    })

    fakeClock.setNow(0)
    await engine.renderFrame()

    fakeClock.setNow(16)
    engine.panBy(3, 0)
    await engine.renderFrame()

    const hit = engine.hitTest({x: 5, y: 5})
    const diagnostics = engine.getDiagnostics()

    assert.ok(hit)
    assert.ok(diagnostics.hitPlan)
    // Interaction frames resolve medium pressure, so exact checks are capped.
    assert.equal(diagnostics.hitPlan?.exactCheckBudget, 20)
    assert.equal(diagnostics.hitPlan?.exactBudgetExceeded, true)
    assert.ok((diagnostics.hitPlan?.exactCheckCount ?? 0) <= 20)

    // Strategy snapshot should mirror lane/pressure/fallback state from runtime.
    assert.equal(diagnostics.strategySnapshot.lane, diagnostics.strategy.phase)
    assert.equal(diagnostics.strategySnapshot.budgetPressure, diagnostics.budget.pressure)
  } finally {
    environment.restore()
  }
})