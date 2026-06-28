import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {Venus} from './Venus.ts'

describe('Venus events', () => {
  it('subscribes, emits, and unsubscribes document events', () => {
    const venus = new Venus()
    const revisions: number[] = []

    const unsubscribe = venus.on('document:changed', (event) => {
      revisions.push(event.revision)
    })

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
    })

    unsubscribe()

    venus.add({
      type: 'ellipse',
      width: 80,
      height: 80,
    })

    assert.deepEqual(revisions, [2])
  })

  it('supports off with the original handler', () => {
    const venus = new Venus()
    let count = 0
    const handler = () => {
      count += 1
    }

    venus.on('document:changed', handler)
    venus.off('document:changed', handler)
    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
    })

    assert.equal(count, 0)
  })
})

describe('Venus transforms', () => {
  it('keeps plain geometry positions out of the transform matrix', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    })

    const [node] = venus.snapshot().nodes

    assert.equal(node.type, 'shape')
    assert.equal(node.transform, undefined)
  })

  it('maps document transform properties to engine matrices', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      rotation: 30,
      flipX: true,
      skewY: 10,
    })

    const [node] = venus.snapshot().nodes

    assert.equal(node.type, 'shape')
    assert.ok(node.transform)
    assert.notDeepEqual(node.transform.matrix, [1, 0, 0, 0, 1, 0])
  })

  it('maps transform object with origin and scale to engine matrices', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      id: 'rect-with-origin',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      transform: {
        rotation: 45,
        scaleX: 1.5,
        scaleY: 0.75,
        origin: {x: 0, y: 0},
      },
    })

    const [node] = venus.snapshot().nodes

    assert.equal(node.type, 'shape')
    assert.ok(node.transform)
    assert.notDeepEqual(node.transform.matrix, [1, 0, 0, 0, 1, 0])
  })

  it('keeps group x and y as a transform matrix', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      x: 12,
      y: 18,
      children: [{type: 'rect', width: 40, height: 30}],
    })

    const [node] = venus.snapshot().nodes

    assert.equal(node.type, 'group')
    assert.deepEqual(node.transform?.matrix, [1, 0, 12, 0, 1, 18])
  })

  it('keeps group children as document tree objects while indexing by id', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      id: 'group-a',
      name: 'Group A',
      transform: {x: 12, y: 18},
      children: [
        {type: 'rect', id: 'rect-a', width: 40, height: 30},
        {type: 'text', id: 'text-a', text: 'Label'},
      ],
    })

    assert.equal(venus.getNodeById('rect-a')?.type, 'rect')
    assert.equal(venus.getParentId('rect-a'), 'group-a')
    assert.equal(venus.children()[0]?.type, 'group')
  })
})

describe('Venus bounds', () => {
  it('returns empty bounds for an empty document', () => {
    const venus = new Venus()

    assert.deepEqual(venus.bounds(), {x: 0, y: 0, width: 0, height: 0})
  })

  it('returns the union bounds for root document nodes', () => {
    const venus = new Venus()

    venus.add({type: 'rect', x: 10, y: 20, width: 100, height: 80})
    venus.add({type: 'ellipse', x: 180, y: 60, width: 40, height: 40})

    assert.deepEqual(venus.bounds(), {x: 10, y: 20, width: 210, height: 80})
  })

  it('includes group transforms and nested child geometry', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      x: 50,
      y: 40,
      children: [
        {type: 'rect', x: 10, y: 20, width: 80, height: 30},
        {type: 'rect', x: 120, y: 50, width: 20, height: 10},
      ],
    })

    assert.deepEqual(venus.bounds(), {x: 60, y: 60, width: 130, height: 40})
  })

  it('expands axis-aligned bounds for rotated nodes', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      transform: {rotation: 90},
    })

    const bounds = venus.bounds()

    assert.equal(Math.round(bounds.x), 25)
    assert.equal(Math.round(bounds.y), -25)
    assert.equal(Math.round(bounds.width), 50)
    assert.equal(Math.round(bounds.height), 100)
  })
})

describe('Venus camera', () => {
  it('projects and unprojects points through the current viewport', () => {
    const venus = new Venus()

    venus.resize({width: 400, height: 300})
    venus.zoomTo(2, {x: 100, y: 80})
    venus.panBy({x: 20, y: -10})

    const worldPoint = {x: 64, y: 48}
    const screenPoint = venus.project(worldPoint)

    assert.deepEqual(venus.unproject(screenPoint), worldPoint)
    assert.notDeepEqual(screenPoint, worldPoint)
  })

  it('keeps the anchor world point fixed while zooming', () => {
    const venus = new Venus()
    const anchor = {x: 200, y: 150}

    venus.resize({width: 400, height: 300})
    const before = venus.unproject(anchor)
    venus.zoomTo(3, anchor)
    const after = venus.unproject(anchor)

    assert.deepEqual(after, before)
  })

  it('fits document bounds into the measured viewport', () => {
    const venus = new Venus()

    venus.resize({width: 400, height: 300})
    const viewport = venus.fitBounds({x: 40, y: 20, width: 200, height: 100}, 16)
    const topLeft = venus.project({x: 40, y: 20})
    const bottomRight = venus.project({x: 240, y: 120})

    assert.ok(viewport.scale > 1)
    assert.ok(topLeft.x >= 0)
    assert.ok(topLeft.y >= 0)
    assert.ok(bottomRight.x <= 400)
    assert.ok(bottomRight.y <= 300)
  })
})

describe('Venus debug', () => {
  it('inspects Venus state before the engine is mounted', () => {
    const venus = new Venus()

    venus.add({type: 'rect', width: 100, height: 80})
    venus.resize({width: 400, height: 300})
    venus.enableDebug({showBounds: true, showCache: true})

    const inspection = venus.inspect()

    assert.equal(inspection.mounted, false)
    assert.equal(inspection.nodeCount, 1)
    assert.equal(inspection.debug.showBounds, true)
    assert.equal(inspection.debug.showHitCandidates, false)
    assert.equal(inspection.debug.showCache, true)
    assert.equal(inspection.viewport.viewportWidth, 400)
    assert.equal(inspection.viewport.viewportHeight, 300)
    assert.equal(inspection.cache.enabled, true)
    assert.equal(inspection.cache.available, false)
    assert.equal(inspection.cache.geometry.hitCount, 0)
    assert.equal(inspection.engine, null)
  })

  it('measures an async render frame and stores the last timing', async () => {
    const venus = new Venus()
    let loadedRevision: number | null = null
    let renderCount = 0
    let overlayCount = -1
    const fakeEngine = {
      loadScene(snapshot: {revision: number}) {
        loadedRevision = snapshot.revision
        return {}
      },
      async renderFrame() {
        renderCount += 1
        return {}
      },
      getDiagnostics() {
        return {backend: 'canvas2d', renderStats: null}
      },
      prepareHitPlan() {
        return {candidateNodeIds: []}
      },
      setOverlayNodes(nodes?: readonly unknown[]) {
        overlayCount = nodes?.length ?? 0
      },
    }

    ;(venus as unknown as {engine: typeof fakeEngine}).engine = fakeEngine
    venus.add({type: 'rect', width: 100, height: 80})

    const measurement = await venus.measureFrame()

    assert.ok(measurement)
    assert.ok(measurement.frameTimeMs >= 0)
    assert.equal(measurement.revision, 2)
    assert.equal(loadedRevision, 2)
    assert.equal(renderCount, 1)
    assert.equal(overlayCount, 0)
    assert.deepEqual(measurement.diagnostics, {backend: 'canvas2d', renderStats: null})
    assert.equal(venus.inspect().lastFrameMeasurement?.revision, 2)
  })

  it('returns null frame measurement until mounted', async () => {
    const venus = new Venus()

    assert.equal(await venus.measureFrame(), null)
  })

  it('publishes bounds and hit-candidate debug overlays', () => {
    const venus = new Venus()
    let overlayNodes: readonly {id: string; type: string; points?: readonly {x: number; y: number}[]}[] = []
    const fakeEngine = {
      loadScene() {
        return {}
      },
      async renderFrame() {
        return {}
      },
      hitTestAll() {
        return [{nodeId: 'card'}]
      },
      prepareHitPlan() {
        return {candidateNodeIds: ['card']}
      },
      getDiagnostics() {
        return {backend: 'canvas2d', renderStats: null}
      },
      setOverlayNodes(nodes?: readonly {id: string; type: string; points?: readonly {x: number; y: number}[]}[]) {
        overlayNodes = nodes ?? []
      },
    }

    ;(venus as unknown as {engine: typeof fakeEngine}).engine = fakeEngine
    venus.add({id: 'card', type: 'rect', x: 10, y: 20, width: 100, height: 80})

    venus.enableDebug({showBounds: true})

    assert.equal(overlayNodes.length, 1)
    assert.equal(overlayNodes[0].id, 'debug-bounds-card')
    assert.deepEqual(overlayNodes[0].points, [{x: 10, y: 20}, {x: 110, y: 100}])

    venus.enableDebug({showHitCandidates: true})
    venus.hitTest({x: 20, y: 30})

    assert.ok(overlayNodes.some((node) => node.id === 'debug-bounds-card'))
    assert.ok(overlayNodes.some((node) => node.id === 'debug-hit-candidate-card'))
  })

  it('normalizes cache diagnostics from mounted engine render stats', () => {
    const venus = new Venus()
    const fakeEngine = {
      getDiagnostics() {
        return {
          backend: 'canvas2d',
          renderStats: {
            cacheHits: 7,
            cacheMisses: 2,
            frameReuseHits: 5,
            frameReuseMisses: 1,
            geometryCacheHitCount: 3,
            geometryCacheMissCount: 4,
            geometryCacheHitRate: 0.42,
            tileCacheSize: 9,
            tileDirtyCount: 2,
            tileCacheTotalBytes: 8192,
            cacheFallbackReason: 'unsupported-feature',
          },
          strategySnapshot: {fallbackReason: null},
        }
      },
      prepareHitPlan() {
        return {candidateNodeIds: []}
      },
      setOverlayNodes() {},
    }

    ;(venus as unknown as {engine: typeof fakeEngine}).engine = fakeEngine
    venus.enableDebug({showCache: true})

    const cache = venus.inspect().cache

    assert.equal(cache.enabled, true)
    assert.equal(cache.available, true)
    assert.deepEqual(cache.geometry, {hitCount: 3, missCount: 4, hitRate: 0.42})
    assert.deepEqual(cache.render, {hitCount: 7, missCount: 2})
    assert.deepEqual(cache.frameReuse, {hitCount: 5, missCount: 1})
    assert.deepEqual(cache.tile, {size: 9, dirtyCount: 2, totalBytes: 8192})
    assert.equal(cache.fallbackReason, 'unsupported-feature')
  })

  it('applies phase default tolerance and emits hit metadata', () => {
    const venus = new Venus()
    const tolerances: number[] = []
    const events: Array<{phase: string; tolerance: number}> = []
    const fakeEngine = {
      hitTestAll(_point: {x: number; y: number}, tolerance?: number) {
        tolerances.push(tolerance ?? -1)
        return [{nodeId: 'card'}]
      },
      prepareHitPlan() {
        return {candidateNodeIds: []}
      },
      setOverlayNodes() {},
    }

    ;(venus as unknown as {engine: typeof fakeEngine}).engine = fakeEngine
    venus.add({id: 'card', type: 'rect', width: 100, height: 80})
    venus.on('hit', (event) => events.push({phase: event.phase, tolerance: event.tolerance}))

    venus.hitTest({x: 10, y: 10}, {phase: 'hover'})
    venus.hitTest({x: 10, y: 10}, {phase: 'click'})
    venus.hitTest({x: 10, y: 10}, {phase: 'click', tolerance: 4})

    assert.deepEqual(tolerances, [6, 0, 4])
    assert.deepEqual(events, [
      {phase: 'hover', tolerance: 6},
      {phase: 'click', tolerance: 0},
      {phase: 'click', tolerance: 4},
    ])
  })

  it('filters locked topmost hits unless includeLocked is true', () => {
    const venus = new Venus()
    const fakeEngine = {
      hitTestAll() {
        return [{nodeId: 'locked-card'}, {nodeId: 'unlocked-card'}]
      },
      prepareHitPlan() {
        return {candidateNodeIds: []}
      },
      setOverlayNodes() {},
    }

    ;(venus as unknown as {engine: typeof fakeEngine}).engine = fakeEngine
    venus.add({id: 'locked-card', type: 'rect', locked: true, width: 100, height: 80})
    venus.add({id: 'unlocked-card', type: 'rect', width: 80, height: 60})

    assert.deepEqual(venus.hitTest({x: 10, y: 10}), {nodeId: 'unlocked-card'})
    assert.deepEqual(venus.hitTest({x: 10, y: 10}, {includeLocked: true}), {nodeId: 'locked-card'})
  })
})

describe('Venus animation', () => {
  it('applies zero-duration keyframe values to a document node', async () => {
    const venus = new Venus()

    venus.add({id: 'card', type: 'rect', x: 40, y: 32, width: 120, height: 80, opacity: 1})
    const animation = venus.animate('card', [{x: 40, opacity: 1}, {x: 220, opacity: 0.4}], {duration: 0})

    await animation.finished

    const node = venus.getNodeById('card')
    assert.equal(node?.type, 'rect')
    assert.equal(node?.x, 220)
    assert.equal(node?.opacity, 0.4)
    assert.equal(venus.snapshot().nodes[0]?.type, 'shape')
    assert.equal(venus.snapshot().nodes[0]?.opacity, 0.4)
  })

  it('cancel stops a pending animation without applying the final keyframe', () => {
    const venus = new Venus()

    venus.add({id: 'card', type: 'rect', x: 40, y: 32, width: 120, height: 80})
    const animation = venus.animate('card', [{x: 40}, {x: 220}], {duration: 600})
    animation.cancel()

    assert.equal(venus.getNodeById('card')?.x, 40)
  })
})
