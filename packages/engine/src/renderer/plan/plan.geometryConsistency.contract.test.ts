import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAffineMatrixAroundPoint,
  type AffineMatrix,
} from '@venus/lib/math'

import {
  resolveEngineGeometryPayload,
} from '../../interaction/geometryPayload/geometryPayload.ts'
import type {EngineEditorHitTestNode} from '../../interaction/hitTest/hitTest.ts'
import {hitTestEngineSceneStateAll} from '../../scene/hitTest/hitTest.ts'
import {createMutableEngineSceneState} from '../../scene/patch/patch.ts'
import {createEngineSceneBufferLayout, type EngineSceneBufferLayout} from '../../scene/buffer/buffer.ts'
import {
  resolveEngineShapeGeometry,
} from '../../scene/geometry/canonicalGeometry.ts'
import type {
  EngineBezierPoint,
  EnginePoint,
  EngineRect,
  EngineRenderableNode,
  EngineSceneSnapshot,
  EngineShapeKind,
  EngineShapeNode,
} from '../../scene/types/types.ts'
import {
  resolveLeafNodeWorldBounds,
} from '../../scene/worldBounds/worldBounds.ts'
import {prepareEngineRenderInstanceView} from '../instances/instances.ts'
import type {EngineRenderFrame} from '../types/index.ts'
import {
  multiplyMatrix,
  prepareEngineRenderPlan,
  type EngineWorldMatrix,
} from './plan.ts'

const GROUP_ID = 'rotated-group'
const IDENTITY_ENGINE_MATRIX: EngineWorldMatrix = [1, 0, 0, 0, 1, 0]
const BOUNDS_STRIDE = 4
const TRANSFORM_STRIDE = 6
const EPSILON = 1e-5

interface ShapeFixture {
  id: string
  editorNode: EngineEditorHitTestNode
  renderNode: EngineShapeNode
  localHitPoint: EnginePoint
  hitTolerance: number
}

interface ShapeFixtureInput {
  id: string
  editorType: EngineEditorHitTestNode['type']
  shape: EngineShapeKind
  x: number
  y: number
  width: number
  height: number
  rotation: number
  points?: readonly EnginePoint[]
  bezierPoints?: readonly EngineBezierPoint[]
  closed?: boolean
  ellipseStartAngle?: number
  ellipseEndAngle?: number
  ellipseDrawWedgeLine?: boolean
  fill?: boolean
  stroke?: boolean
  localHitPoint: EnginePoint
  hitTolerance?: number
}

test('render plan, instance view, overlay payload, and scene hit-test share transformed shape geometry', () => {
  const groupEditorNode: EngineEditorHitTestNode = {
    id: GROUP_ID,
    type: 'group',
    x: 0,
    y: 0,
    width: 280,
    height: 240,
    rotation: 22,
  }
  const groupMatrix = createEngineRotationMatrix(groupEditorNode)
  const fixtures = createShapeFixtures()
  const sceneNodes: EngineRenderableNode[] = [{
    id: GROUP_ID,
    type: 'group',
    transform: {matrix: groupMatrix},
    children: fixtures.map((fixture) => fixture.renderNode),
  }]
  const editorNodes = [
    groupEditorNode,
    ...fixtures.map((fixture) => fixture.editorNode),
  ]
  const objectFrame = createRenderFrame(createScene('geometry-consistency-object', sceneNodes))
  const objectPlan = prepareEngineRenderPlan(objectFrame)
  const bufferLayout = createEngineSceneBufferLayout({nodes: sceneNodes})
  corruptGeometryAndTransformBuffers(bufferLayout)
  const bufferedFrame = createRenderFrame({
    ...createScene('geometry-consistency-buffer', sceneNodes),
    metadata: {
      bufferLayout,
      planVersion: 2,
      bufferVersion: 2,
    },
  })
  const bufferPlan = prepareEngineRenderPlan(bufferedFrame)
  const instanceView = prepareEngineRenderInstanceView(bufferedFrame, bufferPlan)
  const sceneState = createMutableEngineSceneState(objectFrame.scene)
  const selectionPayload = resolveEngineGeometryPayload({
    nodes: editorNodes,
    selectedNodeIds: fixtures.map((fixture) => fixture.id),
    outlineLevel: 'high',
  })

  for (const fixture of fixtures) {
    const expectedWorldMatrix = multiplyMatrix(
      groupMatrix,
      fixture.renderNode.transform?.matrix ?? IDENTITY_ENGINE_MATRIX,
    )
    const expectedWorldBounds = resolveLeafNodeWorldBounds(fixture.renderNode, expectedWorldMatrix)
    assert.ok(expectedWorldBounds, `${fixture.id} should expose canonical render bounds`)

    const objectPrepared = findPreparedNode(objectPlan, fixture.id)
    const bufferPrepared = findPreparedNode(bufferPlan, fixture.id)
    assertRectClose(objectPrepared.worldBounds, expectedWorldBounds, `${fixture.id} object render bounds`)
    assertRectClose(bufferPrepared.worldBounds, expectedWorldBounds, `${fixture.id} buffer render bounds`)
    assertMatrixClose(bufferPrepared.worldMatrix, expectedWorldMatrix, `${fixture.id} buffer render matrix`)

    const drawIndex = bufferPlan.drawList.indexOf(findPreparedIndex(bufferPlan, fixture.id))
    assert.notEqual(drawIndex, -1, `${fixture.id} should be in buffer draw list`)
    assertRectClose(readInstanceBounds(instanceView.bounds, drawIndex), expectedWorldBounds, `${fixture.id} instance bounds`)
    assertMatrixClose(readInstanceMatrix(instanceView.transforms, drawIndex), expectedWorldMatrix, `${fixture.id} instance matrix`)

    const selectedPayload = selectionPayload.selected.find((entry) => entry.nodeId === fixture.id)
    assertGeometryBoundsClose(selectedPayload?.bounds, toGeometryBounds(expectedWorldBounds), `${fixture.id} overlay bounds`)

    const worldHitPoint = applyEngineMatrixToPoint(expectedWorldMatrix, fixture.localHitPoint)
    const pointerPayload = resolveEngineGeometryPayload({
      nodes: editorNodes,
      pointer: worldHitPoint,
      tolerance: fixture.hitTolerance,
      selectedNodeIds: [fixture.id],
      outlineLevel: 'high',
    })
    assert.equal(
      pointerPayload.pointHitNodeIds.includes(fixture.id),
      true,
      `${fixture.id} editor hit-test should include the transformed point`,
    )

    const sceneHits = hitTestEngineSceneStateAll(sceneState, worldHitPoint, fixture.hitTolerance)
    assert.equal(
      sceneHits.some((hit) => hit.nodeId === fixture.id),
      true,
      `${fixture.id} scene hit-test should include the transformed point`,
    )
  }
})

test('scene buffer stores shape geometry bounds without render-only effect expansion', () => {
  const shape: EngineShapeNode = {
    id: 'effect-shape',
    type: 'shape',
    shape: 'rect',
    x: 10,
    y: 20,
    width: 30,
    height: 20,
    strokeWidth: 6,
    fill: '#111111',
    visual: {
      layerBlur: {amount: 8},
      shadow: {
        offsetX: 40,
        offsetY: 10,
        blur: 12,
      },
    },
  }
  const geometry = resolveEngineShapeGeometry(shape)
  const bufferLayout = createEngineSceneBufferLayout({nodes: [shape]})
  const bufferBounds = readBufferLocalBounds(bufferLayout, 'effect-shape')

  assert.deepEqual(bufferBounds, geometry.strokeBounds)
  assert.notDeepEqual(bufferBounds, geometry.visualBounds)
})

function createShapeFixtures(): ShapeFixture[] {
  return [
    createShapeFixture({
      id: 'rect-rotated',
      editorType: 'rectangle',
      shape: 'rect',
      x: 20,
      y: 20,
      width: 50,
      height: 30,
      rotation: 17,
      fill: true,
      localHitPoint: {x: 45, y: 35},
    }),
    createShapeFixture({
      id: 'ellipse-arc-rotated',
      editorType: 'ellipse',
      shape: 'ellipse',
      x: 90,
      y: 20,
      width: 80,
      height: 50,
      rotation: -28,
      ellipseStartAngle: 0,
      ellipseEndAngle: 90,
      ellipseDrawWedgeLine: true,
      fill: true,
      localHitPoint: {x: 150, y: 35},
    }),
    createShapeFixture({
      id: 'segline-rotated',
      editorType: 'lineSegment',
      shape: 'line',
      x: 20,
      y: 90,
      width: 75,
      height: 25,
      rotation: 31,
      points: [{x: 20, y: 90}, {x: 95, y: 115}],
      stroke: true,
      localHitPoint: {x: 57.5, y: 102.5},
      hitTolerance: 8,
    }),
    createShapeFixture({
      id: 'polygon-rotated',
      editorType: 'polygon',
      shape: 'polygon',
      x: 120,
      y: 90,
      width: 70,
      height: 50,
      rotation: 14,
      points: [{x: 120, y: 90}, {x: 190, y: 100}, {x: 150, y: 140}],
      fill: true,
      closed: true,
      localHitPoint: {x: 150, y: 110},
    }),
    createShapeFixture({
      id: 'star-rotated',
      editorType: 'star',
      shape: 'star',
      x: 200,
      y: 80,
      width: 50,
      height: 60,
      rotation: -33,
      points: [{x: 225, y: 80}, {x: 250, y: 100}, {x: 240, y: 140}, {x: 210, y: 140}, {x: 200, y: 100}],
      fill: true,
      closed: true,
      localHitPoint: {x: 225, y: 110},
    }),
    createShapeFixture({
      id: 'path-rotated',
      editorType: 'path',
      shape: 'path',
      x: 40,
      y: 150,
      width: 80,
      height: 50,
      rotation: -18,
      points: [{x: 40, y: 150}, {x: 120, y: 160}, {x: 80, y: 200}],
      fill: true,
      closed: true,
      localHitPoint: {x: 80, y: 170},
    }),
    createShapeFixture({
      id: 'bezier-path-rotated',
      editorType: 'path',
      shape: 'path',
      x: 150,
      y: 145,
      width: 70,
      height: 40,
      rotation: 23,
      bezierPoints: [
        {anchor: {x: 150, y: 165}, cp2: {x: 170, y: 130}},
        {anchor: {x: 220, y: 165}, cp1: {x: 200, y: 200}},
      ],
      stroke: true,
      closed: false,
      localHitPoint: {x: 185, y: 165},
      hitTolerance: 12,
    }),
  ]
}

function createShapeFixture(input: ShapeFixtureInput): ShapeFixture {
  const transform = {matrix: createEngineRotationMatrix(input)}
  const renderNode: EngineShapeNode = {
    id: input.id,
    type: 'shape',
    shape: input.shape,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    transform,
    fill: input.fill ? '#111111' : undefined,
    stroke: input.stroke ? '#111111' : undefined,
    points: input.points,
    bezierPoints: input.bezierPoints,
    closed: input.closed,
    ellipseStartAngle: input.ellipseStartAngle,
    ellipseEndAngle: input.ellipseEndAngle,
    ellipseDrawWedgeLine: input.ellipseDrawWedgeLine,
  }
  const editorNode: EngineEditorHitTestNode = {
    id: input.id,
    type: input.editorType,
    parentId: GROUP_ID,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: input.rotation,
    fill: {enabled: input.fill ?? false},
    stroke: {enabled: input.stroke ?? false},
    points: input.points ? [...input.points] : undefined,
    bezierPoints: input.bezierPoints ? [...input.bezierPoints] : undefined,
    closed: input.closed,
    ellipseStartAngle: input.ellipseStartAngle,
    ellipseEndAngle: input.ellipseEndAngle,
    ellipseDrawWedgeLine: input.ellipseDrawWedgeLine,
  }

  return {
    id: input.id,
    editorNode,
    renderNode,
    localHitPoint: input.localHitPoint,
    hitTolerance: input.hitTolerance ?? 6,
  }
}

function createScene(
  revision: string,
  nodes: readonly EngineRenderableNode[],
): EngineSceneSnapshot {
  return {
    revision,
    width: 1000,
    height: 1000,
    nodes,
  }
}

function createRenderFrame(scene: EngineSceneSnapshot): EngineRenderFrame {
  return {
    scene,
    viewport: {
      viewportWidth: 800,
      viewportHeight: 600,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    context: {
      quality: 'full',
      lodEnabled: false,
      framePlanVersion: 1,
    },
  }
}

function createEngineRotationMatrix(source: {
  x: number
  y: number
  width: number
  height: number
  rotation?: number
}): EngineWorldMatrix {
  const center = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  }
  return toEngineMatrix(createAffineMatrixAroundPoint(center, {
    rotationDegrees: source.rotation ?? 0,
  }))
}

function toEngineMatrix(matrix: AffineMatrix): EngineWorldMatrix {
  return [
    matrix[0],
    matrix[2],
    matrix[4],
    matrix[1],
    matrix[3],
    matrix[5],
  ]
}

function corruptGeometryAndTransformBuffers(bufferLayout: EngineSceneBufferLayout): void {
  for (const [nodeId, slot] of bufferLayout.slotByNodeId) {
    if (nodeId === GROUP_ID) {
      continue
    }

    const boundsOffset = slot * BOUNDS_STRIDE
    bufferLayout.bounds[boundsOffset] = 9000
    bufferLayout.bounds[boundsOffset + 1] = 9000
    bufferLayout.bounds[boundsOffset + 2] = 1
    bufferLayout.bounds[boundsOffset + 3] = 1

    const transformOffset = slot * TRANSFORM_STRIDE
    bufferLayout.transform[transformOffset] = 1
    bufferLayout.transform[transformOffset + 1] = 0
    bufferLayout.transform[transformOffset + 2] = 9000
    bufferLayout.transform[transformOffset + 3] = 0
    bufferLayout.transform[transformOffset + 4] = 1
    bufferLayout.transform[transformOffset + 5] = 9000
  }
}

function findPreparedIndex(
  plan: ReturnType<typeof prepareEngineRenderPlan>,
  nodeId: string,
): number {
  const index = plan.preparedNodes.findIndex((prepared) => prepared.node.id === nodeId)
  assert.notEqual(index, -1, `${nodeId} should be prepared`)
  return index
}

function findPreparedNode(
  plan: ReturnType<typeof prepareEngineRenderPlan>,
  nodeId: string,
) {
  return plan.preparedNodes[findPreparedIndex(plan, nodeId)]
}

function readInstanceBounds(
  bounds: Float32Array,
  drawIndex: number,
): EngineRect {
  const offset = drawIndex * BOUNDS_STRIDE
  return {
    x: bounds[offset],
    y: bounds[offset + 1],
    width: bounds[offset + 2],
    height: bounds[offset + 3],
  }
}

function readInstanceMatrix(
  transforms: Float32Array,
  drawIndex: number,
): EngineWorldMatrix {
  const offset = drawIndex * TRANSFORM_STRIDE
  return [
    transforms[offset],
    transforms[offset + 1],
    transforms[offset + 2],
    transforms[offset + 3],
    transforms[offset + 4],
    transforms[offset + 5],
  ]
}

function readBufferLocalBounds(
  bufferLayout: EngineSceneBufferLayout,
  nodeId: string,
): EngineRect {
  const slot = bufferLayout.slotByNodeId.get(nodeId)
  assert.notEqual(slot, undefined, `${nodeId} should exist in buffer layout`)
  const offset = (slot as number) * BOUNDS_STRIDE
  return {
    x: bufferLayout.bounds[offset],
    y: bufferLayout.bounds[offset + 1],
    width: bufferLayout.bounds[offset + 2],
    height: bufferLayout.bounds[offset + 3],
  }
}

function toGeometryBounds(rect: EngineRect) {
  return {
    minX: rect.x,
    minY: rect.y,
    maxX: rect.x + rect.width,
    maxY: rect.y + rect.height,
  }
}

function applyEngineMatrixToPoint(
  matrix: EngineWorldMatrix,
  point: EnginePoint,
): EnginePoint {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2],
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5],
  }
}

function assertRectClose(
  actual: EngineRect | null | undefined,
  expected: EngineRect,
  label: string,
): void {
  assert.ok(actual, `${label} should exist`)
  assertClose(actual.x, expected.x, `${label}.x`)
  assertClose(actual.y, expected.y, `${label}.y`)
  assertClose(actual.width, expected.width, `${label}.width`)
  assertClose(actual.height, expected.height, `${label}.height`)
}

function assertGeometryBoundsClose(
  actual: {minX: number; minY: number; maxX: number; maxY: number} | null | undefined,
  expected: {minX: number; minY: number; maxX: number; maxY: number},
  label: string,
): void {
  assert.ok(actual, `${label} should exist`)
  assertClose(actual.minX, expected.minX, `${label}.minX`)
  assertClose(actual.minY, expected.minY, `${label}.minY`)
  assertClose(actual.maxX, expected.maxX, `${label}.maxX`)
  assertClose(actual.maxY, expected.maxY, `${label}.maxY`)
}

function assertMatrixClose(
  actual: readonly number[],
  expected: readonly number[],
  label: string,
): void {
  assert.equal(actual.length, expected.length, `${label} length`)
  for (let index = 0; index < expected.length; index += 1) {
    assertClose(actual[index], expected[index], `${label}[${index}]`)
  }
}

function assertClose(actual: number, expected: number, label: string): void {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${label}: expected ${expected}, received ${actual}`,
  )
}
