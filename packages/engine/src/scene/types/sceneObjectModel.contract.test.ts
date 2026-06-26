// Engine scene object-model contract tests verify render-facing capabilities;
// product document semantics and editor UI behavior are intentionally excluded.
import assert from 'node:assert/strict'
import test from 'node:test'

import {prepareEngineFramePlan} from '../framePlan.ts'
import {prepareEngineHitPlan} from '../hitPlan.ts'
import {createEngineSceneStore} from '../store/store.ts'
import {
  ENGINE_RENDERABLE_NODE_TYPES,
  ENGINE_SHAPE_TYPES,
  type EngineNodeClip,
  type EngineRenderableNode,
  type EngineRectangleCornerRadii,
  type EngineSceneSnapshot,
  type EngineShadow,
  type EngineShapeNode,
  type EngineStrokeArrowhead,
} from './types.ts'

const EXPECTED_RENDERABLE_NODE_TYPES = ['group', 'shape', 'text', 'image'] as const
const EXPECTED_SHAPE_TYPES = ['rect', 'ellipse', 'line', 'polygon', 'path'] as const

/**
 * Builds one engine scene fixture that exercises every current renderable node
 * family and every current shape geometry kind.
 */
function createEngineObjectModelScene(): EngineSceneSnapshot {
  const shapeNodes: EngineShapeNode[] = [
    {
      id: 'shape-rect',
      type: 'shape',
      shape: 'rect',
      x: 0,
      y: 0,
      width: 24,
      height: 16,
      cornerRadius: 4,
      fill: '#ffffff',
      stroke: '#111827',
      strokeWidth: 2,
    },
    {
      id: 'shape-ellipse',
      type: 'shape',
      shape: 'ellipse',
      x: 40,
      y: 0,
      width: 30,
      height: 20,
      ellipseStartAngle: 20,
      ellipseEndAngle: 320,
      fill: '#fef3c7',
    },
    {
      id: 'shape-line',
      type: 'shape',
      shape: 'line',
      x: 0,
      y: 34,
      width: 90,
      height: 0,
      stroke: '#2563eb',
      strokeWidth: 4,
      strokeStartArrowhead: 'circle',
      strokeEndArrowhead: 'triangle',
      points: [
        {x: 0, y: 34},
        {x: 90, y: 34},
      ],
    },
    {
      id: 'shape-polygon',
      type: 'shape',
      shape: 'polygon',
      x: 0,
      y: 52,
      width: 36,
      height: 32,
      fill: '#dcfce7',
      points: [
        {x: 0, y: 52},
        {x: 36, y: 56},
        {x: 12, y: 84},
      ],
      closed: true,
    },
    {
      id: 'shape-path',
      type: 'shape',
      shape: 'path',
      x: 52,
      y: 52,
      width: 44,
      height: 32,
      stroke: '#7c3aed',
      strokeWidth: 3,
      bezierPoints: [
        {anchor: {x: 52, y: 82}},
        {
          anchor: {x: 96, y: 54},
          cp1: {x: 72, y: 50},
        },
      ],
    },
  ]

  const children: EngineRenderableNode[] = [
    ...shapeNodes,
    {
      id: 'text-rich',
      type: 'text',
      x: 120,
      y: 0,
      width: 96,
      height: 32,
      text: 'Engine',
      runs: [
        {
          text: 'Engine',
          style: {
            fill: '#111827',
            fontWeight: 600,
          },
        },
      ],
      style: {
        fontFamily: 'Geist',
        fontSize: 16,
        fill: '#111827',
      },
      wrap: 'word',
    },
    {
      id: 'image-clipped',
      type: 'image',
      x: 120,
      y: 48,
      width: 64,
      height: 44,
      assetId: 'asset-photo',
      sourceRect: {
        x: 10,
        y: 20,
        width: 80,
        height: 60,
      },
      naturalSize: {
        width: 400,
        height: 300,
      },
      imageSmoothing: true,
      clip: {
        clipShape: {
          kind: 'rect',
          rect: {
            x: 120,
            y: 48,
            width: 64,
            height: 44,
          },
          radius: 8,
        },
        rule: 'evenodd',
      },
    },
  ]

  return {
    revision: 1,
    width: 320,
    height: 240,
    nodes: [
      {
        id: 'group-root',
        type: 'group',
        opacity: 0.95,
        transform: {
          matrix: [1, 0, 100, 0, 1, 50],
        },
        children,
      },
    ],
  }
}

/**
 * Resolves all node ids in one scene snapshot for stable coverage assertions.
 */
function collectSceneNodeIds(nodes: readonly EngineRenderableNode[]): string[] {
  const ids: string[] = []

  for (const node of nodes) {
    ids.push(node.id)
    if (node.type === 'group') {
      ids.push(...collectSceneNodeIds(node.children))
    }
  }

  return ids
}

test('engine scene object model publishes every supported node and shape kind', () => {
  assert.deepEqual(ENGINE_RENDERABLE_NODE_TYPES, EXPECTED_RENDERABLE_NODE_TYPES)
  assert.deepEqual(ENGINE_SHAPE_TYPES, EXPECTED_SHAPE_TYPES)
})

test('engine scene object model accepts documented shared and extension properties', () => {
  const shadow: EngineShadow = {
    color: '#00000033',
    offsetX: 2,
    offsetY: 3,
    blur: 4,
  }
  const cornerRadii: EngineRectangleCornerRadii = {
    topLeft: 1,
    topRight: 2,
    bottomRight: 3,
    bottomLeft: 4,
  }
  const clip: EngineNodeClip = {
    clipNodeId: 'clip-source',
    clipShape: {
      kind: 'path',
      points: [
        {x: 0, y: 0},
        {x: 10, y: 0},
        {x: 10, y: 10},
      ],
      closed: true,
    },
    rule: 'evenodd',
  }
  const arrowhead: EngineStrokeArrowhead = 'diamond'
  const scene: EngineSceneSnapshot = {
    revision: 'documented-extension-props',
    width: 256,
    height: 256,
    metadata: {
      planVersion: 1,
      bufferVersion: 2,
      dirtyNodeIds: ['rect-all-props'],
      removedNodeIds: ['removed-node'],
    },
    nodes: [
      {
        id: 'group-all-props',
        type: 'group',
        opacity: 0.8,
        blendMode: 'multiply',
        transform: {
          matrix: [1, 0, 4, 0, 1, 8],
        },
        shadow,
        clip,
        children: [
          {
            id: 'rect-all-props',
            type: 'shape',
            shape: 'rect',
            x: 0,
            y: 0,
            width: 24,
            height: 16,
            cornerRadius: 2,
            cornerRadii,
            fill: '#ffffff',
            stroke: '#111827',
            strokeWidth: 1,
            opacity: 0.9,
            blendMode: 'screen',
            transform: {
              matrix: [1, 0, 1, 0, 1, 2],
            },
            shadow,
            clip,
          },
          {
            id: 'ellipse-all-props',
            type: 'shape',
            shape: 'ellipse',
            x: 30,
            y: 0,
            width: 20,
            height: 18,
            ellipseStartAngle: 15,
            ellipseEndAngle: 270,
            fill: '#fef3c7',
            stroke: '#92400e',
            strokeWidth: 2,
          },
          {
            id: 'line-all-props',
            type: 'shape',
            shape: 'line',
            x: 0,
            y: 40,
            width: 40,
            height: 0,
            points: [
              {x: 0, y: 40},
              {x: 40, y: 40},
            ],
            strokeStartArrowhead: arrowhead,
            strokeEndArrowhead: 'bar',
            stroke: '#2563eb',
            strokeWidth: 3,
          },
          {
            id: 'path-all-props',
            type: 'shape',
            shape: 'path',
            x: 0,
            y: 60,
            width: 60,
            height: 30,
            points: [
              {x: 0, y: 60},
              {x: 60, y: 90},
            ],
            bezierPoints: [
              {anchor: {x: 0, y: 60}},
              {anchor: {x: 60, y: 90}, cp1: {x: 20, y: 50}, cp2: {x: 40, y: 100}},
            ],
            pointCount: 2,
            bezierPointCount: 2,
            closed: false,
            strokeStartArrowhead: 'circle',
            strokeEndArrowhead: 'triangle',
            fill: '#ddd6fe',
            stroke: '#6d28d9',
            strokeWidth: 2,
          },
          {
            id: 'text-all-props',
            type: 'text',
            x: 80,
            y: 0,
            width: 100,
            height: 40,
            text: 'Text',
            runs: [
              {
                text: 'Text',
                style: {
                  fontStyle: 'italic',
                  fill: '#111827',
                },
              },
            ],
            wrap: 'char',
            cacheKey: 'text-cache',
            lineCount: 1,
            maxLineHeight: 18,
            style: {
              fontFamily: 'Geist',
              fontSize: 16,
              fontWeight: 600,
              fontStyle: 'normal',
              lineHeight: 20,
              letterSpacing: 0.2,
              fill: '#111827',
              stroke: '#ffffff',
              strokeWidth: 1,
              align: 'center',
              verticalAlign: 'middle',
              shadow,
            },
            shadow,
            clip,
          },
          {
            id: 'image-all-props',
            type: 'image',
            x: 80,
            y: 60,
            width: 48,
            height: 32,
            assetId: 'asset-id',
            sourceRect: {
              x: 1,
              y: 2,
              width: 30,
              height: 20,
            },
            naturalSize: {
              width: 300,
              height: 200,
            },
            imageSmoothing: false,
            shadow,
            clip,
          },
        ],
      },
    ],
  }

  assert.equal(scene.nodes[0]?.type, 'group')
  assert.equal(scene.metadata?.dirtyNodeIds?.[0], 'rect-all-props')
})

test('engine scene store indexes and queries every supported object kind', () => {
  const scene = createEngineObjectModelScene()
  const store = createEngineSceneStore({initialScene: scene})
  const expectedNodeIds = collectSceneNodeIds(scene.nodes)

  for (const nodeId of expectedNodeIds) {
    assert.ok(store.getNode(nodeId), `${nodeId} should be addressable from the scene store`)
  }

  const queriedNodeIds = store.query({
    x: 90,
    y: 40,
    width: 240,
    height: 160,
  })

  assert.deepEqual(new Set(queriedNodeIds), new Set(expectedNodeIds))
  assert.equal(store.getDiagnostics().nodeCount, expectedNodeIds.length)
  assert.equal(store.getDiagnostics().indexedNodeCount, expectedNodeIds.length)
})

test('engine scene object model supports point candidates, hit plans, and frame plans', () => {
  const scene = createEngineObjectModelScene()
  const store = createEngineSceneStore({initialScene: scene})
  const linePoint = {x: 140, y: 84}
  const lineCandidates = store.queryPointCandidates(linePoint, 2)

  assert.equal(lineCandidates.includes('shape-line'), true)

  const rectPoint = {x: 108, y: 58}
  const hitSummary = store.hitTestAllWithSummary(rectPoint, 1)
  const hitPlan = prepareEngineHitPlan({
    scene: store.getSnapshot(),
    point: rectPoint,
    tolerance: 1,
    queryPointCandidates: store.queryPointCandidates,
    hits: hitSummary.hits,
    exactCheckCount: hitSummary.exactCheckCount,
    exactCheckBudget: hitSummary.exactCheckBudget,
    exactBudgetExceeded: hitSummary.exactBudgetExceeded,
  })

  assert.equal(hitPlan.primaryHitNodeId, 'shape-rect')
  assert.equal(hitPlan.hitCount, 1)
  assert.equal(hitPlan.candidateNodeIds.includes('shape-rect'), true)

  const framePlan = prepareEngineFramePlan({
    scene: store.getSnapshot(),
    viewport: {
      viewportWidth: 320,
      viewportHeight: 240,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    },
    queryCandidates: store.queryCandidates,
    padding: 0,
  })

  assert.equal(framePlan.sceneNodeCount, collectSceneNodeIds(scene.nodes).length)
  assert.equal(framePlan.candidateNodeIds.includes('image-clipped'), true)
  assert.equal(framePlan.candidateNodeIds.includes('shape-path'), true)
})

test('engine scene object model hit-tests every clickable renderable object kind', () => {
  const store = createEngineSceneStore({initialScene: createEngineObjectModelScene()})
  const clickCases = [
    {nodeId: 'shape-rect', point: {x: 108, y: 58}, tolerance: 1},
    {nodeId: 'shape-ellipse', point: {x: 150, y: 60}, tolerance: 1},
    {nodeId: 'shape-line', point: {x: 145, y: 84}, tolerance: 3},
    {nodeId: 'shape-polygon', point: {x: 112, y: 110}, tolerance: 1},
    {nodeId: 'shape-path', point: {x: 152, y: 132}, tolerance: 3},
    {nodeId: 'text-rich', point: {x: 230, y: 60}, tolerance: 1},
    {nodeId: 'image-clipped', point: {x: 230, y: 110}, tolerance: 1},
  ] as const

  for (const clickCase of clickCases) {
    const hit = store.hitTest(clickCase.point, clickCase.tolerance)

    assert.equal(hit?.nodeId, clickCase.nodeId, `${clickCase.nodeId} should be directly clickable`)
  }
})

test('engine scene hit-test resolves exact geometry beyond AABB candidates', () => {
  const store = createEngineSceneStore({
    initialScene: {
      revision: 'exact-hit-geometry',
      width: 420,
      height: 360,
      nodes: [
        {
          id: 'rounded-rect',
          type: 'shape',
          shape: 'rect',
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          cornerRadius: 32,
          fill: '#dbeafe',
          stroke: '#2563eb',
          strokeWidth: 4,
        },
        {
          id: 'ellipse-arc',
          type: 'shape',
          shape: 'ellipse',
          x: 120,
          y: 10,
          width: 100,
          height: 80,
          ellipseStartAngle: 0,
          ellipseEndAngle: 90,
          fill: '#fef3c7',
          stroke: '#d97706',
          strokeWidth: 4,
        },
        {
          id: 'line-stroke',
          type: 'shape',
          shape: 'line',
          x: 20,
          y: 140,
          width: 120,
          height: 0,
          points: [
            {x: 20, y: 140},
            {x: 140, y: 140},
          ],
          stroke: '#0f766e',
          strokeWidth: 4,
        },
        {
          id: 'wide-stroke-line',
          type: 'shape',
          shape: 'line',
          x: 170,
          y: 88,
          width: 90,
          height: 0,
          points: [
            {x: 170, y: 88},
            {x: 260, y: 88},
          ],
          stroke: '#ef4444',
          strokeWidth: 14,
        },
        {
          id: 'polygon-triangle',
          type: 'shape',
          shape: 'polygon',
          x: 180,
          y: 120,
          width: 90,
          height: 80,
          points: [
            {x: 225, y: 120},
            {x: 270, y: 200},
            {x: 180, y: 200},
          ],
          fill: '#dcfce7',
          stroke: '#16a34a',
          strokeWidth: 3,
          closed: true,
        },
        {
          id: 'open-path',
          type: 'shape',
          shape: 'path',
          x: 20,
          y: 230,
          width: 120,
          height: 80,
          points: [
            {x: 20, y: 300},
            {x: 80, y: 230},
            {x: 140, y: 300},
          ],
          closed: false,
          stroke: '#7c3aed',
          strokeWidth: 4,
        },
        {
          id: 'closed-path',
          type: 'shape',
          shape: 'path',
          x: 180,
          y: 230,
          width: 90,
          height: 80,
          points: [
            {x: 225, y: 230},
            {x: 270, y: 310},
            {x: 180, y: 310},
          ],
          closed: true,
          fill: '#ede9fe',
          stroke: '#7c3aed',
          strokeWidth: 3,
        },
        {
          id: 'clipped-image',
          type: 'image',
          x: 300,
          y: 20,
          width: 80,
          height: 80,
          assetId: 'asset',
          clip: {
            clipShape: {
              kind: 'rect',
              rect: {x: 320, y: 40, width: 40, height: 40},
            },
          },
        },
      ],
    },
  })

  assert.equal(store.hitTest({x: 12, y: 12}, 0), null, 'rounded corner cutout should reject AABB-only hits')
  assert.equal(store.hitTest({x: 50, y: 50}, 0)?.nodeId, 'rounded-rect')
  assert.equal(store.hitTest({x: 130, y: 80}, 0), null, 'ellipse arc should reject points outside angle sweep')
  assert.equal(store.hitTest({x: 190, y: 30}, 0)?.nodeId, 'ellipse-arc')
  assert.equal(store.hitTest({x: 80, y: 148}, 2), null, 'click tolerance should miss thin line when too far')
  assert.equal(store.hitTest({x: 80, y: 148}, 9)?.nodeId, 'line-stroke', 'hover tolerance should hit line stroke')
  assert.equal(store.hitTest({x: 210, y: 94}, 1)?.nodeId, 'wide-stroke-line', 'stroke width should contribute to click hit area')
  assert.equal(store.hitTest({x: 185, y: 125}, 0), null, 'triangle AABB corner should miss exact polygon')
  assert.equal(store.hitTest({x: 225, y: 172}, 0)?.nodeId, 'polygon-triangle')
  assert.equal(store.hitTest({x: 80, y: 282}, 0), null, 'open path should not fill its interior')
  assert.equal(store.hitTest({x: 80, y: 232}, 6)?.nodeId, 'open-path')
  assert.equal(store.hitTest({x: 225, y: 282}, 0)?.nodeId, 'closed-path')
  assert.equal(store.hitTest({x: 306, y: 26}, 0), null, 'inline clip should reject image AABB outside clip')
  assert.equal(store.hitTest({x: 340, y: 60}, 0)?.nodeId, 'clipped-image')
})
