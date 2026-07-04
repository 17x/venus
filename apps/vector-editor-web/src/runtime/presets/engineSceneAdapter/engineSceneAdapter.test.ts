import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import type {EngineRenderableNode} from '@venus/engine'
import type {DocumentNode, EditorDocument} from '../../model/index.ts'
import type {SceneShapeSnapshot} from '../../shared-memory/index.ts'
import {
  createEngineSceneFromRuntimeSnapshot,
  createEngineScenePatchBatchFromRuntimeSnapshot,
} from './engineSceneAdapter.ts'
import {
  multiplyEngineMatrices,
  resolveParentLocalEngineTransform,
  vectorAffineToEngineMatrix,
} from './engineSceneAdapter.tree.ts'
import {resolveNodeTransform} from '@venus/engine'

const baseNode = (node: Partial<DocumentNode> & Pick<DocumentNode, 'id' | 'type'>): DocumentNode => ({
  id: node.id,
  type: node.type,
  name: node.name ?? node.id,
  x: node.x ?? 0,
  y: node.y ?? 0,
  width: node.width ?? 100,
  height: node.height ?? 80,
  ...node,
})

const snapshotFor = (node: DocumentNode): SceneShapeSnapshot => ({
  id: node.id,
  name: node.name,
  type: node.type,
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
  pathPointCount: node.points?.length,
  pathBezierPointCount: node.bezierPoints?.length,
  isHovered: false,
  isSelected: false,
})

const createScene = (nodes: DocumentNode[]) => {
  const document: EditorDocument = {
    id: 'doc',
    name: 'Adapter parity',
    width: 800,
    height: 600,
    shapes: nodes,
  }

  return createEngineSceneFromRuntimeSnapshot({
    document,
    shapes: nodes.map(snapshotFor),
    revision: 1,
    includeDocumentBackground: false,
  })
}

const nodeById = (nodes: readonly EngineRenderableNode[], id: string) => {
  const node = nodes.find((candidate) => candidate.id === id)
  assert.ok(node, `Expected node "${id}" to exist`)
  return node
}

const findNodeById = (
  nodes: readonly EngineRenderableNode[],
  id: string,
): EngineRenderableNode | null => {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.type === 'group') {
      const nested = findNodeById(node.children, id)
      if (nested) {
        return nested
      }
    }
  }
  return null
}

const assertMatrixAlmostEqual = (
  actual: readonly number[],
  expected: readonly number[],
  epsilon = 1e-6,
) => {
  assert.equal(actual.length, expected.length)
  actual.forEach((value, index) => {
    assert.ok(
      Math.abs(value - expected[index]) <= epsilon,
      `matrix[${index}] expected ${expected[index]}, got ${value}`,
    )
  })
}

type Bounds = {x: number; y: number; width: number; height: number}
type EngineMatrix = readonly [number, number, number, number, number, number]
const IDENTITY_ENGINE_MATRIX: EngineMatrix = [1, 0, 0, 0, 1, 0]

const assertBoundsAlmostEqual = (
  actual: Bounds | undefined,
  expected: Bounds | undefined,
  epsilon = 1e-6,
) => {
  assert.ok(actual, 'Expected actual bounds')
  assert.ok(expected, 'Expected expected bounds')
  assert.ok(Math.abs(actual.x - expected.x) <= epsilon, `x expected ${expected.x}, got ${actual.x}`)
  assert.ok(Math.abs(actual.y - expected.y) <= epsilon, `y expected ${expected.y}, got ${actual.y}`)
  assert.ok(Math.abs(actual.width - expected.width) <= epsilon, `width expected ${expected.width}, got ${actual.width}`)
  assert.ok(Math.abs(actual.height - expected.height) <= epsilon, `height expected ${expected.height}, got ${actual.height}`)
}

const collectWorldBoundsByPublicId = (
  nodes: readonly EngineRenderableNode[],
  parentMatrix: EngineMatrix = IDENTITY_ENGINE_MATRIX,
  boundsById = new Map<string, Bounds>(),
) => {
  nodes.forEach((node) => {
    const worldMatrix = multiplyEngineMatrices(parentMatrix, node.transform?.matrix ?? IDENTITY_ENGINE_MATRIX)
    if (node.type === 'group') {
      collectWorldBoundsByPublicId(node.children, worldMatrix, boundsById)
      return
    }

    const bounds = resolveNodeLocalBounds(node)
    if (!bounds) {
      return
    }

    boundsById.set(node.hitTargetId ?? node.id, toWorldBounds(bounds, worldMatrix))
  })

  return boundsById
}

const resolveNodeLocalBounds = (node: Exclude<EngineRenderableNode, {type: 'group'}>): Bounds | null => {
  if (node.type === 'shape') {
    return {
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width ?? 0,
      height: node.height ?? 0,
    }
  }
  if (node.type === 'image' || node.type === 'text') {
    return {
      x: node.x,
      y: node.y,
      width: node.width ?? 0,
      height: node.height ?? 0,
    }
  }
  return null
}

const toWorldBounds = (bounds: Bounds, matrix: EngineMatrix): Bounds => {
  const points = [
    applyEngineMatrixToPoint(matrix, {x: bounds.x, y: bounds.y}),
    applyEngineMatrixToPoint(matrix, {x: bounds.x + bounds.width, y: bounds.y}),
    applyEngineMatrixToPoint(matrix, {x: bounds.x, y: bounds.y + bounds.height}),
    applyEngineMatrixToPoint(matrix, {x: bounds.x + bounds.width, y: bounds.y + bounds.height}),
  ]
  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))
  return {x: minX, y: minY, width: maxX - minX, height: maxY - minY}
}

const applyEngineMatrixToPoint = (
  matrix: EngineMatrix,
  point: {x: number; y: number},
) => ({
  x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
  y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
})

describe('engine scene adapter model parity', () => {
  it('maps every Vector document node family into an engine render node', () => {
    const nodes = [
      baseNode({id: 'frame', type: 'frame', fill: {color: '#ffffff'}, stroke: {color: '#94a3b8', weight: 2}}),
      baseNode({id: 'group', type: 'group', childIds: ['rect']}),
      baseNode({id: 'rect', type: 'rectangle', cornerRadius: 8, fill: {color: '#22c55e'}}),
      baseNode({id: 'ellipse', type: 'ellipse', ellipseStartAngle: 15, ellipseEndAngle: 300}),
      baseNode({
        id: 'polygon',
        type: 'polygon',
        points: [{x: 10, y: 10}, {x: 80, y: 10}, {x: 40, y: 60}],
      }),
      baseNode({
        id: 'star',
        type: 'star',
        points: [{x: 20, y: 0}, {x: 30, y: 30}, {x: 60, y: 30}, {x: 35, y: 45}],
      }),
      baseNode({
        id: 'line',
        type: 'lineSegment',
        points: [{x: 0, y: 0}, {x: 120, y: 40}],
        strokeStartArrowhead: 'circle',
        strokeEndArrowhead: 'triangle',
      }),
      baseNode({
        id: 'path',
        type: 'path',
        bezierPoints: [
          {anchor: {x: 0, y: 40}, cp2: {x: 30, y: 0}},
          {anchor: {x: 100, y: 40}, cp1: {x: 70, y: 80}},
        ],
      }),
      baseNode({
        id: 'text',
        type: 'text',
        text: 'Hello',
        textRuns: [{start: 0, end: 5, style: {fontFamily: 'Inter', fontSize: 18, color: '#111827'}}],
      }),
      baseNode({id: 'image', type: 'image', assetId: 'asset-1', assetUrl: 'https://example.test/image.png'}),
    ]

    const scene = createScene(nodes)

    assert.equal(scene.nodes.length, nodes.length)
    assert.deepEqual(scene.nodes.map((node) => node.id), nodes.map((node) => node.id))

    const frame = nodeById(scene.nodes, 'frame')
    assert.equal(frame.type, 'shape')
    assert.equal(frame.type === 'shape' ? frame.shape : null, 'rect')

    const group = nodeById(scene.nodes, 'group')
    assert.equal(group.type, 'group')

    const rect = nodeById(scene.nodes, 'rect')
    assert.equal(rect.type === 'shape' ? rect.shape : null, 'rect')
    assert.equal(rect.type === 'shape' ? rect.cornerRadius : null, 8)
    assert.equal(rect.type === 'shape' ? rect.fillConfig?.color : null, '#22c55e')
    assert.equal(rect.type === 'shape' ? rect.fill : null, '#22c55e')

    const ellipse = nodeById(scene.nodes, 'ellipse')
    assert.equal(ellipse.type === 'shape' ? ellipse.shape : null, 'ellipse')
    assert.equal(ellipse.type === 'shape' ? ellipse.ellipseStartAngle : null, 15)

    const polygon = nodeById(scene.nodes, 'polygon')
    assert.equal(polygon.type === 'shape' ? polygon.shape : null, 'polygon')
    assert.equal(polygon.type === 'shape' ? polygon.closed : null, true)

    const star = nodeById(scene.nodes, 'star')
    assert.equal(star.type === 'shape' ? star.shape : null, 'polygon')
    assert.equal(star.type === 'shape' ? star.closed : null, true)

    const line = nodeById(scene.nodes, 'line')
    assert.equal(line.type === 'shape' ? line.shape : null, 'line')
    assert.equal(line.type === 'shape' ? line.points?.length : null, 2)
    assert.equal(line.type === 'shape' ? line.strokeEndArrowhead : null, 'triangle')
    assert.equal(line.type === 'shape' ? line.strokeConfig?.width : null, 1)

    const path = nodeById(scene.nodes, 'path')
    assert.equal(path.type === 'shape' ? path.shape : null, 'path')
    assert.equal(path.type === 'shape' ? path.bezierPoints?.length : null, 2)

    const text = nodeById(scene.nodes, 'text')
    assert.equal(text.type, 'text')
    assert.equal(text.type === 'text' ? text.text : null, 'Hello')
    assert.equal(text.type === 'text' ? text.runs?.[0]?.style?.fontSize : null, 18)
    assert.equal(text.type === 'text' ? text.style.fillConfig?.color : null, '#111827')

    const image = nodeById(scene.nodes, 'image')
    assert.equal(image.type, 'image')
    assert.equal(image.type === 'image' ? image.assetId : null, 'asset-1')
  })

  it('resolves parent-local transforms that preserve child world transforms', () => {
    const parent = baseNode({
      id: 'frame',
      type: 'frame',
      x: 100,
      y: 80,
      width: 320,
      height: 180,
      rotation: 18,
    })
    const child = baseNode({
      id: 'rect',
      type: 'rectangle',
      x: 180,
      y: 120,
      width: 80,
      height: 50,
      rotation: -12,
    })

    const parentWorld = vectorAffineToEngineMatrix(resolveNodeTransform(parent).matrix)
    const childWorld = vectorAffineToEngineMatrix(resolveNodeTransform(child).matrix)
    const childLocal = resolveParentLocalEngineTransform(child, parent).matrix

    assertMatrixAlmostEqual(multiplyEngineMatrices(parentWorld, childLocal), childWorld)
  })

  it('can emit an opt-in nested tree scene with frame background hit remap', () => {
    const frame = baseNode({
      id: 'frame',
      type: 'frame',
      x: 100,
      y: 80,
      width: 320,
      height: 180,
      rotation: 18,
      fill: {color: '#ffffff'},
      stroke: {color: '#94a3b8', weight: 2},
      childIds: ['rect-b', 'rect-a'],
    })
    const rectA = baseNode({
      id: 'rect-a',
      type: 'rectangle',
      parentId: 'frame',
      x: 180,
      y: 120,
      width: 80,
      height: 50,
      rotation: -12,
      fill: {color: '#22c55e'},
    })
    const rectB = baseNode({
      id: 'rect-b',
      type: 'rectangle',
      parentId: 'frame',
      x: 220,
      y: 140,
      width: 40,
      height: 30,
      fill: {color: '#ef4444'},
    })
    const document: EditorDocument = {
      id: 'doc',
      name: 'Tree adapter',
      width: 800,
      height: 600,
      shapes: [frame, rectA, rectB],
    }

    const scene = createEngineSceneFromRuntimeSnapshot({
      document,
      shapes: [frame, rectA, rectB].map(snapshotFor),
      revision: 1,
      includeDocumentBackground: false,
      structureMode: 'tree',
    })

    assert.equal(scene.nodes.length, 1)
    const frameNode = scene.nodes[0]
    assert.equal(frameNode?.type, 'group')
    assert.equal(frameNode?.id, 'frame')
    assert.deepEqual(
      frameNode?.type === 'group' ? frameNode.children.map((node) => node.id) : [],
      ['frame__frame_background', 'rect-b', 'rect-a'],
    )

    const background = frameNode?.type === 'group' ? frameNode.children[0] : null
    assert.equal(background?.type, 'shape')
    assert.equal(background?.hitTargetId, 'frame')

    const rectNode = findNodeById(scene.nodes, 'rect-a')
    assert.equal(rectNode?.type, 'shape')
    assert.equal(rectNode?.type === 'shape' ? rectNode.fillConfig?.color : null, '#22c55e')

    const parentWorld = vectorAffineToEngineMatrix(resolveNodeTransform(frame).matrix)
    const childWorld = vectorAffineToEngineMatrix(resolveNodeTransform(rectA).matrix)
    assertMatrixAlmostEqual(
      multiplyEngineMatrices(parentWorld, rectNode?.transform?.matrix ?? [1, 0, 0, 0, 1, 0]),
      childWorld,
    )
  })

  it('keeps flat and tree world bounds equivalent for frame leaves', () => {
    const frame = baseNode({
      id: 'frame',
      type: 'frame',
      x: 100,
      y: 80,
      width: 320,
      height: 180,
      rotation: 18,
      fill: {color: '#ffffff'},
      stroke: {color: '#94a3b8', weight: 2},
      childIds: ['rect-b', 'rect-a'],
    })
    const rectA = baseNode({
      id: 'rect-a',
      type: 'rectangle',
      parentId: 'frame',
      x: 180,
      y: 120,
      width: 80,
      height: 50,
      rotation: -12,
      fill: {color: '#22c55e'},
    })
    const rectB = baseNode({
      id: 'rect-b',
      type: 'rectangle',
      parentId: 'frame',
      x: 220,
      y: 140,
      width: 40,
      height: 30,
      fill: {color: '#ef4444'},
    })
    const document: EditorDocument = {
      id: 'doc',
      name: 'Tree parity',
      width: 800,
      height: 600,
      shapes: [frame, rectA, rectB],
    }
    const shapes = [frame, rectA, rectB].map(snapshotFor)
    const flat = createEngineSceneFromRuntimeSnapshot({
      document,
      shapes,
      revision: 1,
      includeDocumentBackground: false,
    })
    const tree = createEngineSceneFromRuntimeSnapshot({
      document,
      shapes,
      revision: 1,
      includeDocumentBackground: false,
      structureMode: 'tree',
    })
    const flatBounds = collectWorldBoundsByPublicId(flat.nodes)
    const treeBounds = collectWorldBoundsByPublicId(tree.nodes)

    ;['frame', 'rect-a', 'rect-b'].forEach((id) => {
      assertBoundsAlmostEqual(treeBounds.get(id), flatBounds.get(id))
    })
  })

  it('emits parent-aware tree patches for leaf updates without replacing sibling subtrees', () => {
    const frame = baseNode({
      id: 'frame',
      type: 'frame',
      x: 100,
      y: 80,
      width: 320,
      height: 180,
      rotation: 18,
      fill: {color: '#ffffff'},
      stroke: {color: '#94a3b8', weight: 2},
      childIds: ['rect-b', 'rect-a'],
    })
    const rectA = baseNode({
      id: 'rect-a',
      type: 'rectangle',
      parentId: 'frame',
      x: 180,
      y: 120,
      width: 80,
      height: 50,
      rotation: -12,
      fill: {color: '#22c55e'},
    })
    const rectB = baseNode({
      id: 'rect-b',
      type: 'rectangle',
      parentId: 'frame',
      x: 220,
      y: 140,
      width: 40,
      height: 30,
      fill: {color: '#ef4444'},
    })
    const document: EditorDocument = {
      id: 'doc',
      name: 'Tree patch',
      width: 800,
      height: 600,
      shapes: [frame, rectA, rectB],
    }

    const result = createEngineScenePatchBatchFromRuntimeSnapshot({
      document,
      shapes: [frame, rectA, rectB].map(snapshotFor),
      revision: 2,
      changedShapeIds: ['rect-a'],
      structureMode: 'tree',
      includeDocumentBackground: false,
    })

    assert.equal(result.requiresFullLoad, false)
    assert.equal(result.batch.patches.length, 1)
    const patch = result.batch.patches[0]
    assert.equal(patch?.upsertParentId, 'frame')
    assert.equal(patch?.upsertIndex, 2)
    assert.deepEqual(patch?.upsertNodes?.map((node) => node.id), ['rect-a'])

    const parentWorld = vectorAffineToEngineMatrix(resolveNodeTransform(frame).matrix)
    const childWorld = vectorAffineToEngineMatrix(resolveNodeTransform(rectA).matrix)
    const rectNode = patch?.upsertNodes?.[0]
    assertMatrixAlmostEqual(
      multiplyEngineMatrices(parentWorld, rectNode?.transform?.matrix ?? [1, 0, 0, 0, 1, 0]),
      childWorld,
    )
  })

  it('emits complete parent-aware tree patches when a container node changes', () => {
    const frame = baseNode({
      id: 'frame',
      type: 'frame',
      childIds: ['rect-a'],
    })
    const rectA = baseNode({
      id: 'rect-a',
      type: 'rectangle',
      parentId: 'frame',
    })
    const document: EditorDocument = {
      id: 'doc',
      name: 'Tree container patch',
      width: 800,
      height: 600,
      shapes: [frame, rectA],
    }

    const result = createEngineScenePatchBatchFromRuntimeSnapshot({
      document,
      shapes: [frame, rectA].map(snapshotFor),
      revision: 2,
      changedShapeIds: ['frame'],
      structureMode: 'tree',
      includeDocumentBackground: false,
    })

    assert.equal(result.requiresFullLoad, false)
    assert.equal(result.batch.patches.length, 1)
    const patch = result.batch.patches[0]
    assert.equal(patch?.upsertParentId, null)
    assert.equal(patch?.upsertIndex, 0)
    const frameNode = patch?.upsertNodes?.[0]
    assert.equal(frameNode?.id, 'frame')
    assert.equal(frameNode?.type, 'group')
    assert.deepEqual(
      frameNode?.type === 'group' ? frameNode.children.map((node) => node.id) : [],
      ['frame__frame_background', 'rect-a'],
    )
  })

  it('coalesces tree patches to the highest changed ancestor', () => {
    const frame = baseNode({
      id: 'frame',
      type: 'frame',
      childIds: ['rect-a'],
    })
    const rectA = baseNode({
      id: 'rect-a',
      type: 'rectangle',
      parentId: 'frame',
    })
    const document: EditorDocument = {
      id: 'doc',
      name: 'Tree coalesced patch',
      width: 800,
      height: 600,
      shapes: [frame, rectA],
    }

    const result = createEngineScenePatchBatchFromRuntimeSnapshot({
      document,
      shapes: [frame, rectA].map(snapshotFor),
      revision: 2,
      changedShapeIds: ['frame', 'rect-a'],
      structureMode: 'tree',
      includeDocumentBackground: false,
    })

    assert.equal(result.requiresFullLoad, false)
    assert.deepEqual(result.batch.patches.map((patch) => patch.upsertNodes?.[0]?.id), ['frame'])
  })
})
