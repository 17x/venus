import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {createVenus, defineVenusModule} from '../../base.ts'
import {classifyVenusNodeMutation, isVenusModuleName, Venus, VENUS_INTERNAL_SERVICE_NAMES, VENUS_MODULE_NAMES} from './Venus.ts'
import type {VenusBackend, VenusModule, VenusModuleContext} from './Venus.ts'
import {VENUS_SHAPE_MODEL_SPECS} from './shapeModel.ts'

function createCanvasWithFailingWebGL() {
  const canvas2dContext = {}
  const failingWebGLContext = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    createShader: () => ({}),
    shaderSource: () => undefined,
    compileShader: () => undefined,
    getShaderParameter: () => false,
    getShaderInfoLog: () => null,
    deleteShader: () => undefined,
  }

  return {
    width: 400,
    height: 300,
    style: {},
    getContext: (kind: string) => {
      if (kind === '2d') {
        return canvas2dContext
      }

      if (kind === 'webgl2' || kind === 'webgl') {
        return failingWebGLContext
      }

      return null
    },
  } as unknown as HTMLCanvasElement
}

describe('Venus invalidation', () => {
  it('classifies transform and opacity changes as cheap composition updates', () => {
    assert.equal(classifyVenusNodeMutation(['transform.rotation']), 'transformOnly')
    assert.equal(classifyVenusNodeMutation(['rotation']), 'transformOnly')
    assert.equal(classifyVenusNodeMutation(['appearance.opacity']), 'opacityOnly')
    assert.equal(classifyVenusNodeMutation(['opacity']), 'opacityOnly')
  })

  it('classifies paint, effect, text, geometry, and structural changes by highest cost', () => {
    assert.equal(classifyVenusNodeMutation(['appearance.fills']), 'paint')
    assert.equal(classifyVenusNodeMutation(['appearance.effects.0.blur']), 'effect')
    assert.equal(classifyVenusNodeMutation(['fontSize']), 'text')
    assert.equal(classifyVenusNodeMutation(['points']), 'geometry')
    assert.equal(classifyVenusNodeMutation(['clipPath']), 'clipMask')
    assert.equal(classifyVenusNodeMutation(['children']), 'structural')
    assert.equal(classifyVenusNodeMutation(['opacity', 'text']), 'text')
  })
})

describe('Venus modules', () => {
  it('exports the public backend parameter union', () => {
    const backend: VenusBackend = 'auto'

    assert.equal(backend, 'auto')
  })

  it('documents the short public module names', () => {
    assert.deepEqual(VENUS_MODULE_NAMES, [
      'render',
      'camera',
      'hitTest',
      'select',
      'snap',
      'animate',
      'debug',
      'scale',
      'effects',
      'history',
      'export',
    ])
    assert.equal(isVenusModuleName('scale'), true)
    assert.equal(isVenusModuleName('largeScenePerformance'), false)
  })

  it('documents internal foundation services separately from user modules', () => {
    assert.deepEqual(VENUS_INTERNAL_SERVICE_NAMES, [
      'document',
      'sceneStore',
      'geometry',
      'spatial',
      'geometryCache',
      'invalidation',
      'viewport',
      'renderPlan',
      'scheduler',
      'resource',
      'backendBridge',
    ])
  })

  it('installs constructor modules with a read-only service registry', () => {
    let capturedContext: VenusModuleContext | null = null
    const module = defineVenusModule({
      name: 'hitTest',
      install: (context) => {
        capturedContext = context
      },
    })

    const venus = new Venus({modules: [module]})

    assert.deepEqual(venus.modules(), ['hitTest'])
    assert.equal(capturedContext?.venus, venus)
    assert.equal(capturedContext?.services.has('document'), true)
    assert.equal(capturedContext?.services.has('viewport'), true)
    assert.equal(capturedContext?.services.has('invalidation'), true)
    assert.equal(capturedContext?.services.has('geometryCache'), false)
    assert.deepEqual(capturedContext?.services.list(), ['document', 'viewport', 'invalidation'])
    assert.equal(capturedContext?.services.get('invalidation')?.classify(['appearance.fills']), 'paint')
    assert.equal(capturedContext?.services.get('document')?.children().length, 0)
    assert.deepEqual(capturedContext?.services.get('viewport')?.project({x: 2, y: 3}), {x: 2, y: 3})
    assert.equal(capturedContext?.services.require('invalidation').classify(['appearance.effects']), 'effect')
    assert.deepEqual(capturedContext?.services.require('viewport').unproject({x: 2, y: 3}), {x: 2, y: 3})
    assert.throws(() => capturedContext?.services.require('geometryCache'), /Venus service "geometryCache" is not registered/)
  })

  it('returns stable frozen service objects to modules', () => {
    let capturedContext: VenusModuleContext | null = null
    const module = defineVenusModule({
      name: 'debug',
      install: (context) => {
        capturedContext = context
      },
    })

    new Venus({modules: [module]})

    const firstDocument = capturedContext?.services.get('document')
    const secondDocument = capturedContext?.services.get('document')
    assert.ok(firstDocument)
    assert.equal(firstDocument, secondDocument)
    assert.equal(Object.isFrozen(firstDocument), true)
    assert.throws(() => {
      ;(firstDocument as {mutated?: boolean}).mutated = true
    }, /Cannot add property mutated|object is not extensible|read only/)
  })

  it('checks declared module service requirements before install', () => {
    let installed = false
    const module = defineVenusModule({
      name: 'camera',
      requires: ['viewport', 'invalidation'],
      install: () => {
        installed = true
      },
    })

    new Venus({modules: [module]})

    assert.equal(installed, true)
  })

  it('rejects modules with missing required services before install runs', () => {
    let installed = false
    const module = defineVenusModule({
      name: 'scale',
      requires: ['geometryCache'],
      install: () => {
        installed = true
      },
    })

    assert.throws(() => new Venus({modules: [module]}), /Venus service "geometryCache" is not registered/)
    assert.equal(installed, false)
  })

  it('installs modules when declared module dependencies are already installed', () => {
    const installed: string[] = []
    const hitTestModule = defineVenusModule({
      name: 'hitTest',
      install: () => installed.push('hitTest'),
    })
    const selectModule = defineVenusModule({
      name: 'select',
      dependsOn: ['hitTest'],
      install: () => installed.push('select'),
    })

    const venus = new Venus({modules: [hitTestModule, selectModule]})

    assert.deepEqual(installed, ['hitTest', 'select'])
    assert.deepEqual(venus.modules(), ['hitTest', 'select'])
    assert.deepEqual(venus.inspect().modules, {
      installed: ['hitTest', 'select'],
      lastError: null,
    })
  })

  it('rejects modules when declared module dependencies are missing', () => {
    let installed = false
    const selectModule = defineVenusModule({
      name: 'select',
      dependsOn: ['hitTest'],
      install: () => {
        installed = true
      },
    })

    assert.throws(
      () => new Venus({modules: [selectModule]}),
      /Venus module "select" requires module "hitTest" to be installed first/,
    )
    assert.equal(installed, false)
  })

  it('includes installed module diagnostics in inspect output', () => {
    const debugModule = defineVenusModule({
      name: 'debug',
      install: () => undefined,
    })
    const venus = new Venus({modules: [debugModule]})

    assert.deepEqual(venus.inspect().modules, {
      installed: ['debug'],
      lastError: null,
    })
  })

  it('rejects duplicate module installation on one instance', () => {
    const module: VenusModule = {
      name: 'camera',
      install: () => undefined,
    }

    assert.throws(() => new Venus({modules: [module, module]}), /already installed/)
  })

  it('rejects unknown module names at definition time', () => {
    assert.throws(
      () => defineVenusModule({name: 'largeScenePerformance' as 'scale', install: () => undefined}),
      /Unknown Venus module/,
    )
  })

  it('creates a base runtime through createVenus', () => {
    const venus = createVenus()

    assert.ok(venus instanceof Venus)
    assert.deepEqual(venus.modules(), [])
  })
})

describe('Venus shape model specs', () => {
  it('documents every public model kind and separates engine shapes from renderable nodes', () => {
    assert.deepEqual(VENUS_SHAPE_MODEL_SPECS.map((spec) => spec.type), [
      'rect',
      'ellipse',
      'line',
      'text',
      'group',
      'clip',
      'mask',
      'polygon',
      'path',
      'image',
    ])
    assert.deepEqual(
      VENUS_SHAPE_MODEL_SPECS.filter((spec) => spec.family === 'engine-shape').map((spec) => spec.type),
      ['rect', 'ellipse', 'line', 'polygon', 'path'],
    )
    for (const spec of VENUS_SHAPE_MODEL_SPECS) {
      assert.ok(spec.files.length > 0, `${spec.type} must document owning files`)
      assert.ok(spec.minimalCreate.length > 0, `${spec.type} must document minimal create fields`)
      assert.ok(spec.bounds.length > 0, `${spec.type} must document bounds semantics`)
      assert.ok(spec.pathExpansion.length > 0, `${spec.type} must document path expansion`)
    }
  })
})

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
      scaleX: -1,
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

  it('rewrites authored point geometry when editable bounds are patched', () => {
    const venus = new Venus()
    const line = venus.add({
      type: 'line',
      id: 'line-with-points',
      x: 10,
      y: 20,
      width: 30,
      height: 40,
      points: [{x: 10, y: 20}, {x: 40, y: 60}] as never,
    })
    const polygon = venus.add({
      type: 'polygon',
      id: 'poly',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      points: [{x: 10, y: 10}, {x: 30, y: 10}, {x: 20, y: 30}],
    })
    const path = venus.add({
      type: 'path',
      id: 'path',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      bezierPoints: [
        {anchor: {x: 0, y: 100}, cp2: {x: 25, y: 0}},
        {anchor: {x: 100, y: 100}, cp1: {x: 75, y: 0}},
      ],
    })

    line.setSize(60, 80)
    polygon.setPosition(30, 40)
    path.setSize(200, 50)

    assert.deepEqual(venus._rawNode('line-with-points')?.points, [{x: 10, y: 20}, {x: 70, y: 100}])
    assert.deepEqual(venus._rawNode('poly')?.points, [{x: 30, y: 40}, {x: 50, y: 40}, {x: 40, y: 60}])
    assert.deepEqual(venus._rawNode('path')?.bezierPoints?.[0]?.anchor, {x: 0, y: 50})
    assert.deepEqual(venus._rawNode('path')?.bezierPoints?.[0]?.cp2, {x: 50, y: 0})
  })
})

describe('Venus node conversion', () => {
  it('converts rect to engine shape node with geometry and style', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      fill: '#ff0000',
      stroke: '#0000ff',
      strokeWidth: 3,
      cornerRadius: 8,
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'shape')
    assert.equal(node.shape, 'rect')
    assert.equal(node.x, 10)
    assert.equal(node.y, 20)
    assert.equal(node.width, 100)
    assert.equal(node.height, 80)
    assert.equal(node.fill, '#ff0000')
    assert.equal(node.stroke, '#0000ff')
    assert.equal(node.strokeWidth, 3)
    assert.equal(node.cornerRadius, 8)
  })

  it('converts ellipse to engine shape node', () => {
    const venus = new Venus()

    venus.add({
      type: 'ellipse',
      x: 50,
      y: 60,
      width: 120,
      height: 90,
      ellipseStartAngle: 30,
      ellipseEndAngle: 270,
      ellipseDrawWedgeLine: true,
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'shape')
    assert.equal(node.shape, 'ellipse')
    assert.equal(node.ellipseStartAngle, 30)
    assert.equal(node.ellipseEndAngle, 270)
    assert.equal(node.ellipseDrawWedgeLine, true)
  })

  it('converts line to engine shape node with default stroke', () => {
    const venus = new Venus()

    venus.add({type: 'line', x: 0, y: 0, width: 100, height: 0})

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'shape')
    assert.equal(node.shape, 'line')
    // Line defaults to a visible stroke when none is provided.
    assert.ok(node.stroke)
    assert.ok((node.strokeWidth ?? 0) > 0)
  })

  it('omits stroke from engine line node when strokeWidth is zero', () => {
    const venus = new Venus()

    venus.add({type: 'line', x: 0, y: 0, width: 100, height: 0, strokeWidth: 0})

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'shape')
    assert.equal(node.shape, 'line')
    // strokeWidth of 0 means the renderer should not stroke.
    assert.equal(node.strokeWidth, 0)
  })

  it('converts text to engine text node with default typography', () => {
    const venus = new Venus()

    venus.add({type: 'text', x: 40, y: 60, text: 'Hello', fontSize: 18, fontWeight: 600})

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'text')
    assert.equal(node.text, 'Hello')
    assert.equal(node.style?.fontSize, 18)
    assert.equal(node.style?.fontWeight, 600)
    assert.ok(node.style?.fill)
  })

  it('converts group to engine group with children', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      x: 12,
      y: 18,
      children: [
        {type: 'rect', width: 40, height: 30},
        {type: 'ellipse', x: 60, y: 10, width: 20, height: 20},
      ],
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'group')
    assert.equal(node.children.length, 2)
    assert.equal(node.children[0]?.type, 'shape')
    assert.equal(node.children[0]?.shape, 'rect')
    assert.equal(node.children[1]?.type, 'shape')
    assert.equal(node.children[1]?.shape, 'ellipse')
  })

  it('converts clip to engine group with clip shape', () => {
    const venus = new Venus()

    venus.add({
      type: 'clip',
      clipPath: {type: 'rect', x: 40, y: 30, width: 200, height: 150, cornerRadius: 12},
      children: [{type: 'rect', x: 0, y: 0, width: 300, height: 200, fill: '#22c55e'}],
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'group')
    assert.ok(node.clip)
    assert.equal(node.clip?.clipShape.kind, 'rect')
    assert.equal(node.clip?.clipShape.rect.x, 40)
    assert.equal(node.clip?.clipShape.radius, 12)
    assert.equal(node.children.length, 1)
  })

  it('converts mask to engine group with analogous clip shape', () => {
    const venus = new Venus()

    venus.add({
      type: 'mask',
      clipPath: {type: 'ellipse', x: 80, y: 60, width: 160, height: 120},
      children: [{type: 'rect', x: 0, y: 0, width: 200, height: 200, fill: '#9333ea'}],
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'group')
    assert.ok(node.clip)
    assert.equal(node.clip?.clipShape.kind, 'rect')
    // Ellipse clip path sets large radius to approximate ellipse clipping.
    assert.equal(node.clip?.clipShape.radius, 999)
  })

  it('converts polygon to engine shape node with points', () => {
    const venus = new Venus()

    venus.add({
      type: 'polygon',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      points: [
        {x: 50, y: 0},
        {x: 100, y: 100},
        {x: 0, y: 100},
      ],
      fill: '#dcfce7',
      stroke: '#16a34a',
      strokeWidth: 3,
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'shape')
    assert.equal(node.shape, 'polygon')
    assert.equal(node.fill, '#dcfce7')
    assert.equal(node.stroke, '#16a34a')
    assert.equal(node.strokeWidth, 3)
    assert.equal(node.closed, true)
    assert.equal(node.points?.length, 3)
  })

  it('converts path to engine shape node with bezier and arrowhead hints', () => {
    const venus = new Venus()

    venus.add({
      type: 'path',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      bezierPoints: [
        {anchor: {x: 0, y: 50}, cp1: null, cp2: {x: 40, y: 0}},
        {anchor: {x: 100, y: 50}, cp1: {x: 60, y: 100}, cp2: null},
        {anchor: {x: 200, y: 50}},
      ],
      stroke: '#7c3aed',
      strokeWidth: 3,
      strokeEndArrowhead: 'triangle',
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'shape')
    assert.equal(node.shape, 'path')
    assert.equal(node.stroke, '#7c3aed')
    assert.equal(node.strokeEndArrowhead, 'triangle')
    assert.equal(node.bezierPoints?.length, 3)
  })

  it('converts image to engine image node with asset metadata', () => {
    const venus = new Venus()

    venus.add({
      type: 'image',
      x: 20,
      y: 30,
      width: 160,
      height: 120,
      assetId: 'hero-image',
      imageSmoothing: false,
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.type, 'image')
    assert.equal(node.x, 20)
    assert.equal(node.y, 30)
    assert.equal(node.width, 160)
    assert.equal(node.height, 120)
    assert.equal(node.assetId, 'hero-image')
    assert.equal(node.imageSmoothing, false)
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

describe('Venus nested composition', () => {
  it('groups and ungroups root siblings without moving their bounds', () => {
    const venus = new Venus()
    const rect = venus.add({type: 'rect', x: 10, y: 20, width: 30, height: 40})
    const path = venus.add({
      type: 'path',
      x: 60,
      y: 30,
      width: 40,
      height: 30,
      points: [{x: 60, y: 30}, {x: 100, y: 60}],
      stroke: '#111827',
      strokeWidth: 2,
      closed: false,
    })
    const beforeBounds = venus.bounds()

    const group = venus.group([rect.id, path.id], {name: 'Selection'})
    const [root] = venus.children()

    assert.equal(group.type, 'group')
    assert.equal(root?.type, 'group')
    assert.equal(root?.x, 10)
    assert.equal(root?.y, 20)
    assert.equal(root?.children.length, 2)
    assert.equal(root?.children[0]?.x, 0)
    assert.equal(root?.children[0]?.y, 0)
    assert.deepEqual(venus.bounds(), beforeBounds)
    assert.equal(venus.getParentId(rect.id), group.id)
    assert.equal(venus.getParentId(path.id), group.id)

    const children = venus.ungroup(group.id)

    assert.deepEqual(children.map((child) => child.id), [rect.id, path.id])
    assert.equal(venus.children().length, 2)
    assert.deepEqual(venus.bounds(), beforeBounds)
    assert.equal(venus.getParentId(rect.id), null)
    assert.equal(venus.getParentId(path.id), null)
    assert.equal(venus._rawNode(rect.id)?.x, 10)
    assert.deepEqual(venus._rawNode(path.id)?.points?.[0], {x: 60, y: 30})
  })

  it('groups direct children inside an existing group', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      id: 'parent',
      x: 20,
      y: 30,
      children: [
        {type: 'rect', id: 'a', x: 10, y: 5, width: 20, height: 20},
        {type: 'ellipse', id: 'b', x: 50, y: 15, width: 20, height: 20},
      ],
    })

    const inner = venus.group(['a', 'b'], {id: 'inner'})
    const parent = venus.children()[0]

    assert.equal(inner.id, 'inner')
    assert.equal(venus.getParentId('inner'), 'parent')
    assert.equal(venus.getParentId('a'), 'inner')
    assert.equal(parent?.type, 'group')
    assert.equal(parent?.children[0]?.type, 'group')
    assert.equal(parent?.children[0]?.x, 10)
    assert.equal(parent?.children[0]?.y, 5)
  })

  it('keeps generated proxy ids usable for removal', () => {
    const venus = new Venus()
    const rect = venus.add({type: 'rect', width: 20, height: 20})

    rect.remove()

    assert.equal(venus.children().length, 0)
    assert.equal(venus.getNodeById(rect.id), null)
  })

  it('rejects grouping nodes from different parents', () => {
    const venus = new Venus()
    const root = venus.add({type: 'rect', id: 'root', width: 20, height: 20})
    void root
    venus.add({
      type: 'group',
      id: 'parent',
      children: [{type: 'rect', id: 'child', width: 20, height: 20}],
    })

    assert.throws(() => venus.group(['root', 'child']), /same parent/)
  })

  it('indexes group inside group and resolves parent ids through both levels', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      id: 'outer',
      children: [{
        type: 'group',
        id: 'inner',
        children: [
          {type: 'rect', id: 'leaf', width: 40, height: 30},
        ],
      }],
    })

    assert.equal(venus.getNodeById('inner')?.type, 'group')
    assert.equal(venus.getParentId('inner'), 'outer')
    assert.equal(venus.getNodeById('leaf')?.type, 'rect')
    assert.equal(venus.getParentId('leaf'), 'inner')
  })

  it('indexes clip inside group and resolves child ids across both containers', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      id: 'g',
      children: [{
        type: 'clip',
        id: 'c',
        clipPath: {type: 'rect', id: 'cp', x: 0, y: 0, width: 100, height: 80},
        children: [
          {type: 'ellipse', id: 'e', width: 60, height: 40},
        ],
      }],
    })

    assert.equal(venus.getParentId('c'), 'g')
    assert.equal(venus.getParentId('cp'), 'c')
    assert.equal(venus.getParentId('e'), 'c')
    assert.equal(venus.getNodeById('e')?.type, 'ellipse')
  })

  it('indexes group inside clip and exposes child to the clip subtree', () => {
    const venus = new Venus()

    venus.add({
      type: 'clip',
      id: 'clip-root',
      clipPath: {type: 'rect', x: 0, y: 0, width: 200, height: 150},
      children: [{
        type: 'group',
        id: 'nested-group',
        children: [
          {type: 'rect', id: 'r', width: 80, height: 60, fill: '#ff0000'},
        ],
      }],
    })

    assert.equal(venus.getParentId('nested-group'), 'clip-root')
    assert.equal(venus.getParentId('r'), 'nested-group')
    assert.equal(venus.getNodeById('r')?.type, 'rect')
  })

  it('indexes mask inside group and isolates mask children from the outer parent', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      id: 'group-outer',
      children: [{
        type: 'mask',
        id: 'mask-inner',
        clipPath: {type: 'rect', x: 0, y: 0, width: 120, height: 90},
        children: [
          {type: 'rect', id: 'masked-rect', width: 100, height: 80, fill: '#9333ea'},
        ],
      }],
    })

    assert.equal(venus.getParentId('mask-inner'), 'group-outer')
    assert.equal(venus.getParentId('masked-rect'), 'mask-inner')
    assert.equal(venus.getNodeById('masked-rect')?.type, 'rect')
  })

  it('composes rotated parent with rotated child via independent transforms', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      id: 'rotated-parent',
      transform: {rotation: 30},
      children: [
        {type: 'rect', id: 'rotated-child', x: 40, y: 20, width: 60, height: 40, transform: {rotation: -15}},
      ],
    })

    const snapshot = venus.snapshot()
    const parentNode = snapshot.nodes[0]
    const childNode = parentNode.children?.[0]

    assert.equal(parentNode.type, 'group')
    assert.ok(parentNode.transform)
    assert.notDeepEqual(parentNode.transform.matrix, [1, 0, 0, 0, 1, 0])
    assert.equal(childNode?.type, 'shape')
    assert.ok(childNode?.transform)
    // Child must carry its own non-identity transform independent of parent.
    assert.notDeepEqual(childNode?.transform?.matrix, [1, 0, 0, 0, 1, 0])
  })

  it('computes bounds for group inside group with translated children', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      x: 20,
      y: 30,
      children: [{
        type: 'group',
        x: 10,
        y: 5,
        children: [
          {type: 'rect', x: 0, y: 0, width: 50, height: 40},
        ],
      }],
    })

    const bounds = venus.bounds()
    // Outer group at (20,30) + inner group at (10,5) + rect at (0,0) → world rect at (30,35,50,40)
    assert.equal(bounds.x, 30)
    assert.equal(bounds.y, 35)
    assert.equal(bounds.width, 50)
    assert.equal(bounds.height, 40)
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

    // Floating-point tolerance for viewport matrix round-trip.
    assert.ok(Math.abs(after.x - before.x) < 1e-8)
    assert.ok(Math.abs(after.y - before.y) < 1e-8)
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
  it('falls back to Canvas2D in auto backend mode when WebGL shader compilation fails', () => {
    const venus = new Venus()
    const fallbacks: unknown[] = []
    venus.on('backend:fallback', (event) => fallbacks.push(event))

    assert.doesNotThrow(() => venus.mount(createCanvasWithFailingWebGL()))
    const inspection = venus.inspect()

    assert.equal(inspection.engine?.backend, 'canvas2d')
    assert.equal(inspection.backendFallback?.from, 'webgl')
    assert.equal(inspection.backendFallback?.to, 'canvas2d')
    assert.match(inspection.backendFallback?.reason ?? '', /webgl vertex shader compile failed/)
    assert.deepEqual(fallbacks, [inspection.backendFallback])

    venus.destroy()
  })

  it('keeps explicit WebGL backend failures visible', () => {
    const venus = new Venus({render: {backend: 'webgl'}})

    assert.throws(() => venus.mount(createCanvasWithFailingWebGL()), /webgl vertex shader compile failed: unknown error/)
    assert.equal(venus.inspect().backendFallback, null)
  })

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
    assert.equal(inspection.backendFallback, null)
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

describe('Venus advanced paints', () => {
  it('converts multiple solid fills to engine paint list', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
      fills: [
        {type: 'solid', color: '#ff0000', opacity: 0.8},
        {type: 'solid', color: '#0000ff', opacity: 0.5},
      ],
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.fills?.length, 2)
    assert.equal(node.fills?.[0]?.type, 'solid')
    assert.equal(node.fills?.[0]?.color, '#ff0000')
    assert.equal(node.fills?.[0]?.opacity, 0.8)
  })

  it('converts linear gradient fill to engine gradient paint', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
      fills: [{
        type: 'gradient',
        gradient: {
          type: 'linear',
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 80,
          stops: [
            {offset: 0, color: '#ff0000'},
            {offset: 1, color: '#0000ff'},
          ],
        },
      }],
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.fills?.[0]?.type, 'gradient')
    assert.equal(node.fills?.[0]?.gradient?.type, 'linear')
    assert.equal(node.fills?.[0]?.gradient?.stops?.length, 2)
  })

  it('converts radial gradient stroke to engine gradient paint', () => {
    const venus = new Venus()

    venus.add({
      type: 'ellipse',
      width: 100,
      height: 80,
      strokeWidth: 3,
      strokes: [{
        type: 'gradient',
        gradient: {
          type: 'radial',
          centerX: 50,
          centerY: 40,
          radius: 60,
          stops: [
            {offset: 0, color: '#ffffff', opacity: 1},
            {offset: 1, color: '#000000', opacity: 0},
          ],
        },
      }],
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.strokes?.[0]?.type, 'gradient')
    assert.equal(node.strokes?.[0]?.gradient?.type, 'radial')
    assert.equal(node.strokes?.[0]?.gradient?.stops?.[1]?.opacity, 0)
  })

  it('passes strokeDashArray through to engine shape node', () => {
    const venus = new Venus()

    venus.add({
      type: 'line',
      width: 100,
      height: 0,
      stroke: '#333',
      strokeWidth: 2,
      strokeDashArray: [4, 4],
    })

    const [node] = venus.snapshot().nodes
    assert.deepEqual(node.strokeDashArray, [4, 4])
  })

  it('passes strokeAlign through to engine shape node', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
      stroke: '#333',
      strokeWidth: 4,
      strokeAlign: 'inside',
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.strokeAlign, 'inside')
  })

  it('passes blendMode through to engine node for activation', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
      fill: '#ff0000',
      blendMode: 'multiply',
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.blendMode, 'multiply')
  })

  it('handles polygon with dash and gradient simultaneously', () => {
    const venus = new Venus()

    venus.add({
      type: 'polygon',
      width: 100,
      height: 100,
      points: [{x: 50, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}],
      strokeDashArray: [8, 4, 2, 4],
      strokeAlign: 'outside',
      strokes: [{
        type: 'gradient',
        gradient: {
          type: 'linear',
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 100,
          stops: [{offset: 0, color: '#ff0000'}, {offset: 1, color: '#0000ff'}],
        },
      }],
    })

    const [node] = venus.snapshot().nodes
    assert.deepEqual(node.strokeDashArray, [8, 4, 2, 4])
    assert.equal(node.strokeAlign, 'outside')
    assert.equal(node.strokes?.[0]?.type, 'gradient')
  })

  it('preserves backward-compatible single fill and stroke alongside new fields', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
      fill: '#old-fill',
      stroke: '#old-stroke',
      strokeWidth: 2,
      fills: [{type: 'solid', color: '#new-fill'}],
      strokes: [{type: 'solid', color: '#new-stroke'}],
    })

    const [node] = venus.snapshot().nodes
    // Legacy fill/stroke still passed through for consumers that read them.
    assert.equal(node.fill, '#old-fill')
    assert.equal(node.stroke, '#old-stroke')
    assert.equal(node.fills?.[0]?.color, '#new-fill')
    assert.equal(node.strokes?.[0]?.color, '#new-stroke')
  })

  it('projects structured appearance fills before flat fill lists', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
      fill: '#legacy-fill',
      fills: [{type: 'solid', color: '#flat-fill'}],
      appearance: {
        fills: [{type: 'solid', color: '#appearance-fill', opacity: 0.75}],
      },
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.fill, '#legacy-fill')
    assert.equal(node.fills?.[0]?.color, '#appearance-fill')
    assert.equal(node.fills?.[0]?.opacity, 0.75)
  })

  it('projects structured appearance stroke to current engine stroke fields', () => {
    const venus = new Venus()

    venus.add({
      type: 'path',
      width: 100,
      height: 80,
      points: [{x: 0, y: 0}, {x: 100, y: 80}],
      stroke: '#legacy-stroke',
      strokeWidth: 2,
      strokeDashArray: [2, 2],
      appearance: {
        strokes: [{
          paints: [{type: 'solid', color: '#appearance-stroke'}],
          width: 8,
          align: 'outside',
          dash: [8, 4],
          cap: 'square',
          join: 'bevel',
        }],
      },
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.stroke, '#legacy-stroke')
    assert.equal(node.strokeWidth, 8)
    assert.deepEqual(node.strokeDashArray, [8, 4])
    assert.equal(node.strokeAlign, 'outside')
    assert.equal(node.strokeCap, 'square')
    assert.equal(node.strokeJoin, 'bevel')
    assert.equal(node.strokes?.[0]?.color, '#appearance-stroke')
  })

  it('projects structured appearance effects to engine fields', () => {
    const venus = new Venus()

    venus.add({
      type: 'ellipse',
      width: 100,
      height: 80,
      shadow: {color: '#legacy-shadow', blur: 2},
      innerShadow: {color: '#legacy-inner', blur: 2},
      layerBlur: {amount: 2},
      appearance: {
        opacity: 0.5,
        blendMode: 'multiply',
        effects: [
          {type: 'dropShadow', color: '#appearance-shadow', offsetX: 4, offsetY: 6, blur: 12},
          {type: 'innerShadow', color: '#appearance-inner', blur: 9},
          {type: 'layerBlur', amount: 7},
        ],
      },
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.opacity, 0.5)
    assert.equal(node.blendMode, 'multiply')
    assert.deepEqual(node.shadow, {color: '#appearance-shadow', offsetX: 4, offsetY: 6, blur: 12})
    assert.deepEqual(node.innerShadow, {color: '#appearance-inner', blur: 9})
    assert.deepEqual(node.layerBlur, {amount: 7})
  })

  it('uses legacy effects when structured effects are absent', () => {
    const venus = new Venus()

    venus.add({
      type: 'rect',
      width: 100,
      height: 80,
      shadow: {color: '#legacy-shadow', blur: 2},
      innerShadow: {color: '#legacy-inner', blur: 3},
      layerBlur: {amount: 4},
      appearance: {
        opacity: 0.9,
      },
    })

    const [node] = venus.snapshot().nodes
    assert.equal(node.opacity, 0.9)
    assert.deepEqual(node.shadow, {color: '#legacy-shadow', blur: 2})
    assert.deepEqual(node.innerShadow, {color: '#legacy-inner', blur: 3})
    assert.deepEqual(node.layerBlur, {amount: 4})
  })

  it('applies structured appearance to group and image nodes', () => {
    const venus = new Venus()

    venus.add({
      type: 'group',
      children: [{type: 'rect', width: 40, height: 30}],
      appearance: {
        opacity: 0.6,
        blendMode: 'screen',
        effects: [{type: 'dropShadow', color: '#group-shadow', blur: 5}],
      },
    })
    venus.add({
      type: 'image',
      width: 100,
      height: 80,
      assetId: 'photo',
      appearance: {
        opacity: 0.4,
        effects: [{type: 'layerBlur', amount: 3}],
      },
    })

    const [groupNode, imageNode] = venus.snapshot().nodes
    assert.equal(groupNode.opacity, 0.6)
    assert.equal(groupNode.blendMode, 'screen')
    assert.deepEqual(groupNode.shadow, {color: '#group-shadow', offsetX: undefined, offsetY: undefined, blur: 5})
    assert.equal(imageNode.opacity, 0.4)
    assert.deepEqual(imageNode.layerBlur, {amount: 3})
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
