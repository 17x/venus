import {
  isPointInsideEngineClipShape,
  isPointInsideEngineShapeHitArea,
  type EngineEditorHitTestNode,
} from '../../interaction/hitTest/hitTest.ts'
import type {
  EngineClipShape,
  EnginePoint,
  EngineRenderableNode,
  EngineShapeNode,
} from '../types/types.ts'
import type { MutableEngineSceneState } from '../patch/patch.ts'

export interface EngineHitTestResult {
  index: number
  nodeId: string
  nodeType: EngineRenderableNode['type']
  hitType: 'shape-body'
  score: number
  zOrder: number
  hitPoint: EnginePoint
}

export interface EngineHitExecutionSummary {
  hits: EngineHitTestResult[]
  exactCheckCount: number
  // Maximum exact checks allowed for this hit-test execution.
  exactCheckBudget: number
  // Whether exact traversal stopped because the exact-check cap was reached.
  exactBudgetExceeded: boolean
}

export interface EngineHitExecutionOptions {
  // Optional cap for exact geometry checks during one hit-test execution.
  maxExactCandidateCount?: number
}

type Matrix2D = readonly [number, number, number, number, number, number]
const IDENTITY_MATRIX: Matrix2D = [1, 0, 0, 0, 1, 0]
const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2
const TEXT_WIDTH_ESTIMATE_MULTIPLIER = 0.6
const MATRIX_INVERSION_EPSILON = 1e-8
const LINE_ENDPOINT_MIN_COUNT = 2

// Resolve only the primary hit while preserving shared exact-check accounting.
/**
 * Handles hitTestEngineSceneState.
 * @param state state parameter.
 * @param point point parameter.
 * @param tolerance tolerance parameter.
 * @param options Options object for this operation.
 */
export function hitTestEngineSceneState(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance = 0,
  options: EngineHitExecutionOptions = {},
): EngineHitTestResult | null {
  const results = hitTestEngineSceneStateAll(state, point, tolerance, options)
  return results[0] ?? null
}

// Resolve all ordered hits for a point query while sharing budget options.
/**
 * Handles hitTestEngineSceneStateAll.
 * @param state state parameter.
 * @param point point parameter.
 * @param tolerance tolerance parameter.
 * @param options Options object for this operation.
 */
export function hitTestEngineSceneStateAll(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance = 0,
  options: EngineHitExecutionOptions = {},
): EngineHitTestResult[] {
  return hitTestEngineSceneStateAllWithSummary(state, point, tolerance, options).hits
}

// Execute one hit-test pass and capture exact-check budget diagnostics.
/**
 * Handles hitTestEngineSceneStateAllWithSummary.
 * @param state state parameter.
 * @param point point parameter.
 * @param tolerance tolerance parameter.
 * @param options Options object for this operation.
 */
export function hitTestEngineSceneStateAllWithSummary(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance = 0,
  options: EngineHitExecutionOptions = {},
): EngineHitExecutionSummary {
  const maxExactCandidateCount = Math.max(
    0,
    Number.isFinite(options.maxExactCandidateCount)
      ? (options.maxExactCandidateCount as number)
      : Number.POSITIVE_INFINITY,
  )
  const candidateIdSet = resolveHitCandidateIdSet(state, point, tolerance)
  if (candidateIdSet && candidateIdSet.size === 0) {
    return {
      hits: [],
      exactCheckCount: 0,
      exactCheckBudget: maxExactCandidateCount,
      exactBudgetExceeded: false,
    }
  }

  const totalNodeCount = countSceneNodes(state.nodes)
  const hits: EngineHitTestResult[] = []
  let traversalIndex = totalNodeCount
  let exactCheckCount = 0
  let exactBudgetExceeded = false

  // Walk the scene in reverse paint order and prune subtrees that have no
  // coarse point candidates so hit execution does not rebuild a full flattened
  // scene for every pointer query.
  const visitReverse = (
    nodes: readonly EngineRenderableNode[],
    parentMatrix: Matrix2D,
  ) => {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      if (exactBudgetExceeded) {
        return
      }

      const node = nodes[index]
      const worldMatrix = multiplyMatrix(parentMatrix, node.transform?.matrix ?? IDENTITY_MATRIX)

      if (node.type === 'group') {
        if (!candidateIdSet || candidateIdSet.has(node.id)) {
          visitReverse(node.children, worldMatrix)
        }
      }

      traversalIndex -= 1
      const flattenedIndex = traversalIndex

      if (candidateIdSet && !candidateIdSet.has(node.id)) {
        continue
      }

      if (exactCheckCount >= maxExactCandidateCount) {
        exactBudgetExceeded = true
        return
      }

      exactCheckCount += 1
      if (!isPointInsideNode(point, node, worldMatrix, tolerance)) {
        continue
      }

      hits.push({
        index: flattenedIndex,
        nodeId: node.id,
        nodeType: node.type,
        hitType: 'shape-body',
        score: totalNodeCount - flattenedIndex,
        zOrder: flattenedIndex,
        hitPoint: point,
      })
    }
  }

  visitReverse(state.nodes, IDENTITY_MATRIX)

  return {
    hits,
    exactCheckCount,
    exactCheckBudget: maxExactCandidateCount,
    exactBudgetExceeded,
  }
}

// Reuse the engine spatial index as a coarse shortlist so hit execution can
// skip exact geometry checks for nodes that do not intersect the point region.
/**
 * Handles resolveHitCandidateIdSet.
 * @param state state parameter.
 * @param point point parameter.
 * @param tolerance tolerance parameter.
 */
function resolveHitCandidateIdSet(
  state: MutableEngineSceneState,
  point: EnginePoint,
  tolerance: number,
) {
  const radius = Math.max(0, tolerance)
  const candidateIds = state.spatialIndex.search({
    minX: point.x - radius,
    minY: point.y - radius,
    maxX: point.x + radius,
    maxY: point.y + radius,
  }).map((item) => item.id)

  return new Set(candidateIds)
}

/**
 * Handles isPointInsideNode.
 * @param point point parameter.
 * @param node Target node.
 * @param worldMatrix worldMatrix parameter.
 * @param tolerance tolerance parameter.
 */
function isPointInsideNode(
  point: EnginePoint,
  node: EngineRenderableNode,
  worldMatrix: Matrix2D,
  tolerance: number,
): boolean {
  const localPoint = projectPointToLocalSpace(point, worldMatrix)
  if (!localPoint) {
    return false
  }

  switch (node.type) {
    case 'image':
      return isPointInsideNodeClip(localPoint, node) && isPointInsideRect(
        localPoint,
        node.x ?? 0,
        node.y ?? 0,
        node.width ?? 0,
        node.height ?? 0,
        tolerance,
      )
    case 'text': {
      const width = node.width ?? estimateTextWidth(node)
      const lineHeight = node.style.lineHeight ?? node.style.fontSize * TEXT_LINE_HEIGHT_MULTIPLIER
      const height = node.height ?? lineHeight
      return isPointInsideNodeClip(localPoint, node) && isPointInsideRect(
        localPoint,
        node.x,
        node.y,
        width,
        height,
        tolerance,
      )
    }
    case 'group':
      return false
    case 'shape':
      return isPointInsideNodeClip(localPoint, node) && isPointInsideEngineShapeHitArea(
        localPoint,
        toEditorHitTestShape(node),
        {
          tolerance: resolveShapeHitTolerance(node, tolerance),
          strictStrokeHitTest: false,
        },
      )
    default:
      return false
  }
}

/**
 * Resolves visual stroke-aware hit tolerance for exact shape checks.
 * Currently uses center-aligned stroke semantics: the hit band straddles
 * the geometry edge by half the stroke width on each side.
 * Future: inside/outside alignment should shift the band entirely inside
 * or outside the geometry edge respectively.
 * @param node Target shape node.
 * @param tolerance Caller-provided pointer tolerance.
 */
function resolveShapeHitTolerance(
  node: EngineShapeNode,
  tolerance: number,
) {
  const strokeHalfWidth = Math.max(0, node.strokeWidth ?? 0) / 2
  return Math.max(0, tolerance, strokeHalfWidth)
}

/**
 * Converts one render-facing engine shape into the shared geometry hit-test
 * shape contract used by interaction helpers.
 * @param node Target shape node.
 */
function toEditorHitTestShape(node: EngineShapeNode): EngineEditorHitTestNode {
  if (node.shape === 'line') {
    const endpoints = resolveLineEndpoints(node)
    return {
      id: node.id,
      type: 'lineSegment',
      x: endpoints.start.x,
      y: endpoints.start.y,
      width: endpoints.end.x - endpoints.start.x,
      height: endpoints.end.y - endpoints.start.y,
      stroke: {enabled: hasStroke(node)},
      fill: {enabled: false},
      strokeWidth: node.strokeWidth,
      strokeAlign: node.strokeAlign,
      strokeDashArray: node.strokeDashArray,
      strokeCap: node.strokeCap,
      strokeJoin: node.strokeJoin,
    }
  }

  return {
    id: node.id,
    type: toEditorShapeType(node),
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 0,
    height: node.height ?? 0,
    fill: {enabled: hasFill(node)},
    stroke: {enabled: hasStroke(node)},
    strokeWidth: node.strokeWidth,
    strokeAlign: node.strokeAlign,
    strokeDashArray: node.strokeDashArray,
    strokeCap: node.strokeCap,
    strokeJoin: node.strokeJoin,
    cornerRadius: node.cornerRadius,
    cornerRadii: node.cornerRadii,
    points: node.points ? [...node.points] : undefined,
    bezierPoints: node.bezierPoints ? [...node.bezierPoints] : undefined,
    closed: node.closed,
    ellipseStartAngle: node.ellipseStartAngle,
    ellipseEndAngle: node.ellipseEndAngle,
    ellipseDrawWedgeLine: node.ellipseDrawWedgeLine,
  }
}

/**
 * Resolves one engine shape kind into the editor-geometry hit-test kind.
 * @param node Target shape node.
 */
function toEditorShapeType(node: EngineShapeNode): EngineEditorHitTestNode['type'] {
  switch (node.shape) {
    case 'rect':
      return 'rectangle'
    case 'ellipse':
      return 'ellipse'
    case 'polygon':
      return 'polygon'
    case 'path':
      return 'path'
    case 'line':
      return 'lineSegment'
    default:
      return 'rectangle'
  }
}

/**
 * Resolves explicit line points before falling back to the node diagonal.
 * @param node Target shape node.
 */
function resolveLineEndpoints(node: EngineShapeNode) {
  if (node.points && node.points.length >= LINE_ENDPOINT_MIN_COUNT) {
    return {
      start: node.points[0],
      end: node.points[node.points.length - 1],
    }
  }

  return {
    start: {x: node.x ?? 0, y: node.y ?? 0},
    end: {x: (node.x ?? 0) + (node.width ?? 0), y: (node.y ?? 0) + (node.height ?? 0)},
  }
}

/**
 * Resolves whether one engine shape exposes a fill hit area.
 * @param node Target shape node.
 */
function hasFill(node: EngineShapeNode) {
  if (node.shape === 'line') {
    return false
  }

  return Boolean((node.fill && node.fill !== 'transparent') || (node.fills?.length ?? 0) > 0)
}

/**
 * Resolves whether one engine shape exposes a stroke hit area.
 * @param node Target shape node.
 */
function hasStroke(node: EngineShapeNode) {
  return Boolean(node.stroke && (node.strokeWidth ?? 1) > 0)
}

/**
 * Applies inline clipping to scene hit-test results.
 * @param point Local-space point.
 * @param node Target renderable node.
 */
function isPointInsideNodeClip(
  point: EnginePoint,
  node: EngineRenderableNode,
): boolean {
  const clipShape = node.clip?.clipShape
  if (!clipShape) {
    return true
  }

  return isPointInsideEngineClipShape(
    point,
    toEditorClipShape(node.id, clipShape),
    {
      tolerance: 0,
    },
  )
}

/**
 * Converts inline engine clip geometry to the shared geometry hit-test contract.
 * @param ownerId ownerId parameter.
 * @param clipShape clipShape parameter.
 */
function toEditorClipShape(
  ownerId: string,
  clipShape: EngineClipShape,
): EngineEditorHitTestNode {
  if (clipShape.kind === 'rect') {
    return {
      id: `${ownerId}:clip`,
      type: 'rectangle',
      x: clipShape.rect.x,
      y: clipShape.rect.y,
      width: clipShape.rect.width,
      height: clipShape.rect.height,
      cornerRadius: clipShape.radius,
      fill: {enabled: true},
      stroke: {enabled: false},
    }
  }

  const bounds = getPointBounds(clipShape.points)
  return {
    id: `${ownerId}:clip`,
    type: 'path',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    points: [...clipShape.points],
    closed: clipShape.closed !== false,
    fill: {enabled: true},
    stroke: {enabled: false},
  }
}

/**
 * Resolves simple bounds for point-based clip paths.
 * @param points points parameter.
 */
function getPointBounds(points: readonly EnginePoint[]) {
  if (points.length === 0) {
    return {x: 0, y: 0, width: 0, height: 0}
  }

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Handles isPointInsideRect.
 * @param point point parameter.
 * @param x x parameter.
 * @param y y parameter.
 * @param width Width value.
 * @param height Height value.
 * @param tolerance tolerance parameter.
 */
function isPointInsideRect(
  point: EnginePoint,
  x: number,
  y: number,
  width: number,
  height: number,
  tolerance: number,
): boolean {
  const right = x + width
  const bottom = y + height
  return (
    point.x >= x - tolerance &&
    point.x <= right + tolerance &&
    point.y >= y - tolerance &&
    point.y <= bottom + tolerance
  )
}

/**
 * Handles estimateTextWidth.
 * @param node Target node.
 */
function estimateTextWidth(node: Extract<EngineRenderableNode, { type: 'text' }>) {
  if (node.runs && node.runs.length > 0) {
    let length = 0
    for (const run of node.runs) {
      length += run.text.length
    }
    return length * node.style.fontSize * TEXT_WIDTH_ESTIMATE_MULTIPLIER
  }

  const text = node.text ?? ''
  return text.length * node.style.fontSize * TEXT_WIDTH_ESTIMATE_MULTIPLIER
}

// Count flattened nodes without allocating the flattened array so hit scoring
// and z-order can stay compatible with the previous traversal contract.
/**
 * Handles countSceneNodes.
 * @param nodes nodes parameter.
 */
function countSceneNodes(nodes: readonly EngineRenderableNode[]) {
  let count = 0

  for (const node of nodes) {
    count += 1
    if (node.type === 'group') {
      count += countSceneNodes(node.children)
    }
  }

  return count
}

/**
 * Handles multiplyMatrix.
 * @param left left parameter.
 * @param right right parameter.
 */
function multiplyMatrix(left: Matrix2D, right: Matrix2D): Matrix2D {
  const [l00, l01, l02, l10, l11, l12] = left
  const [r00, r01, r02, r10, r11, r12] = right
  return [
    l00 * r00 + l01 * r10,
    l00 * r01 + l01 * r11,
    l00 * r02 + l01 * r12 + l02,
    l10 * r00 + l11 * r10,
    l10 * r01 + l11 * r11,
    l10 * r02 + l11 * r12 + l12,
  ]
}

/**
 * Handles projectPointToLocalSpace.
 * @param point point parameter.
 * @param worldMatrix worldMatrix parameter.
 */
function projectPointToLocalSpace(point: EnginePoint, worldMatrix: Matrix2D): EnginePoint | null {
  const inverse = invertMatrix(worldMatrix)
  if (!inverse) {
    return null
  }

  const [m00, m01, m02, m10, m11, m12] = inverse

  return {
    x: m00 * point.x + m01 * point.y + m02,
    y: m10 * point.x + m11 * point.y + m12,
  }
}

/**
 * Handles invertMatrix.
 * @param matrix Transform matrix.
 */
function invertMatrix(matrix: Matrix2D): Matrix2D | null {
  const [m00, m01, m02, m10, m11, m12] = matrix
  const determinant = m00 * m11 - m01 * m10
  if (Math.abs(determinant) < MATRIX_INVERSION_EPSILON) {
    return null
  }

  const inv = 1 / determinant
  return [
    m11 * inv,
    -m01 * inv,
    (m01 * m12 - m11 * m02) * inv,
    -m10 * inv,
    m00 * inv,
    (m10 * m02 - m00 * m12) * inv,
  ]
}
