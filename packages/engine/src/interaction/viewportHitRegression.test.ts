import test from 'node:test'
import assert from 'node:assert/strict'

import { applyMatrixToPoint } from '../math/matrix.ts'
import {
  DEFAULT_ENGINE_VIEWPORT,
  panEngineViewportState,
  resolveEngineViewportState,
  zoomEngineViewportState,
} from './viewport.ts'
import { prepareEngineFramePlan } from '../scene/framePlan.ts'
import { createEngineSceneStore } from '../scene/store.ts'
import type { EngineSceneSnapshot } from '../scene/types.ts'

// Build a deterministic scene with a single rectangular shape as the hit target.
const createRegressionScene = (): EngineSceneSnapshot => ({
  revision: 'hit-regression-1',
  width: 2000,
  height: 2000,
  nodes: [
    {
      id: 'shape-target',
      type: 'shape',
      shape: 'rect',
      x: 100,
      y: 120,
      width: 200,
      height: 160,
      fill: '#111111',
    },
  ],
})

// Convert a screen-space point into world-space with the current viewport.
const toWorldPoint = (
  viewport: ReturnType<typeof resolveEngineViewportState>,
  screenPoint: { x: number; y: number },
) => applyMatrixToPoint(viewport.inverseMatrix, screenPoint)

test('engine frame candidates and hit-test remain stable after zoom and pan', () => {
  // Create scene storage used by render planning and hit-test execution.
  const store = createEngineSceneStore({
    initialScene: createRegressionScene(),
  })

  // Start from a measured viewport so frame-plan world bounds are well-defined.
  const initialViewport = resolveEngineViewportState({
    viewportWidth: 1000,
    viewportHeight: 700,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })

  // Use frame-plan candidate collection as the render-side visibility proxy.
  const initialPlan = prepareEngineFramePlan({
    scene: store.getSnapshot(),
    viewport: initialViewport,
    queryCandidates: (bounds) => store.queryCandidates(bounds),
  })

  assert.equal(initialPlan.sceneNodeCount, 1)
  assert.ok(initialPlan.candidateNodeIds.includes('shape-target'))

  // Hit-test through screen->world projection before any viewport transform.
  const worldInsideBefore = toWorldPoint(initialViewport, { x: 180, y: 180 })
  const firstHit = store.hitTest(worldInsideBefore)

  assert.equal(firstHit?.nodeId, 'shape-target')

  // Apply zoom then pan to emulate user navigation in the canvas viewport.
  const zoomedViewport = zoomEngineViewportState(initialViewport, 1.4, { x: 500, y: 350 })
  const transformedViewport = panEngineViewportState(zoomedViewport, 24, -16)

  // Verify candidate selection still retains the target after transforms.
  const transformedPlan = prepareEngineFramePlan({
    scene: store.getSnapshot(),
    viewport: transformedViewport,
    queryCandidates: (bounds) => store.queryCandidates(bounds),
  })

  assert.ok(transformedPlan.candidateNodeIds.includes('shape-target'))

  // Reproject the same world point to screen and back, then hit-test again.
  const trackedWorldPoint = { x: 180, y: 180 }
  const transformedScreenPoint = applyMatrixToPoint(transformedViewport.matrix, trackedWorldPoint)
  const worldInsideAfter = toWorldPoint(transformedViewport, transformedScreenPoint)
  const secondHit = store.hitTest(worldInsideAfter)

  assert.equal(secondHit?.nodeId, 'shape-target')
})

test('cold-start zoom before measured viewport does not eject frame candidates', () => {
  // Keep scene and store identical to the navigation regression baseline.
  const store = createEngineSceneStore({
    initialScene: createRegressionScene(),
  })

  // Simulate cold start where canvas dimensions are not measured yet.
  const coldStartViewport = resolveEngineViewportState({
    ...DEFAULT_ENGINE_VIEWPORT,
  })

  // Reproduce early ctrl-wheel style zoom anchored to a future canvas center.
  const zoomedBeforeMeasure = zoomEngineViewportState(coldStartViewport, 4, {
    x: 500,
    y: 350,
  })

  // Apply first concrete canvas measurement after the early interaction.
  const measuredViewport = resolveEngineViewportState({
    viewportWidth: 1000,
    viewportHeight: 700,
    offsetX: zoomedBeforeMeasure.offsetX,
    offsetY: zoomedBeforeMeasure.offsetY,
    scale: zoomedBeforeMeasure.scale,
  })

  // Verify viewport candidate planning still keeps the target visible.
  const measuredPlan = prepareEngineFramePlan({
    scene: store.getSnapshot(),
    viewport: measuredViewport,
    queryCandidates: (bounds) => store.queryCandidates(bounds),
  })

  assert.ok(measuredPlan.candidateNodeIds.includes('shape-target'))
})

test('cold-start pan before measured viewport does not shift initial candidate window', () => {
  // Keep scene/store setup aligned with the zoom cold-start regression.
  const store = createEngineSceneStore({
    initialScene: createRegressionScene(),
  })

  // Simulate pre-measure viewport state that still uses default dimensions.
  const coldStartViewport = resolveEngineViewportState({
    ...DEFAULT_ENGINE_VIEWPORT,
  })

  // Reproduce early drag-pan input before the first resize event arrives.
  const pannedBeforeMeasure = panEngineViewportState(coldStartViewport, -640, -420)

  // Apply first concrete measurement while preserving pre-measure offsets.
  const measuredViewport = resolveEngineViewportState({
    viewportWidth: 1000,
    viewportHeight: 700,
    offsetX: pannedBeforeMeasure.offsetX,
    offsetY: pannedBeforeMeasure.offsetY,
    scale: pannedBeforeMeasure.scale,
  })

  // Candidate planning should still include the target after first measure.
  const measuredPlan = prepareEngineFramePlan({
    scene: store.getSnapshot(),
    viewport: measuredViewport,
    queryCandidates: (bounds) => store.queryCandidates(bounds),
  })

  assert.ok(measuredPlan.candidateNodeIds.includes('shape-target'))
})
