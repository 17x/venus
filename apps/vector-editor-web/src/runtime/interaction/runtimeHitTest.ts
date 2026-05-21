import type {DocumentNode} from '../model/index.ts'

/**
 * Declares local visibility-budget output used by worker hit-test selection.
 */
export interface RuntimeVisibilityHitTestBudget {
  /** Stores resolved hit mode after local visibility cost budgeting. */
  hitMode: 'exact' | 'bbox_then_exact' | 'bbox'
  /** Stores max number of candidates allowed to run exact checks. */
  maxExactCandidateCount: number
}

/**
 * Declares local visibility-budget input sampled from current candidate set.
 */
export interface RuntimeVisibilityHitTestBudgetInput {
  /** Stores number of spatial candidates around current pointer position. */
  candidateCount: number
  /** Stores area (px^2 in world units) for top-ranked candidate. */
  topCandidateAreaPx2: number
  /** Stores shortest edge length for top-ranked candidate. */
  topCandidateMinEdgePx: number
  /** Stores interaction-specific precision boost from caller. */
  interactionBoost?: number
  /** Stores semantic-specific precision boost from caller. */
  semanticBoost?: number
}

/**
 * Resolves whether pointer is inside a shape using vector-local geometry policy.
 * @param pointer Pointer position in world coordinates.
 * @param shape Target shape snapshot from document model.
 * @param options Optional hit-test knobs for tolerance and frame selection.
 */
export function isPointInsideRuntimeShapeHitArea(
  pointer: {x: number; y: number},
  shape: DocumentNode,
  options?: {
    tolerance?: number
    allowFrameSelection?: boolean
    strictStrokeHitTest?: boolean
  },
) {
  if (options?.allowFrameSelection === false && shape.type === 'frame') {
    return false
  }

  const tolerance = Math.max(0, options?.tolerance ?? 0)
  const bounds = getShapeBounds(shape)
  if (!isPointInsideBounds(pointer, bounds, tolerance)) {
    return false
  }

  if (shape.type === 'lineSegment') {
    // AI-TEMP: line precise stroke distance is approximated locally; remove when lib ships canonical line hit-test API; ref vector-engine-vnext-hard-cut-blockers-2026-05-21.
    const threshold = options?.strictStrokeHitTest ? tolerance : tolerance * 1.5
    const start = {x: shape.x, y: shape.y}
    const end = {x: shape.x + shape.width, y: shape.y + shape.height}
    return distancePointToSegment(pointer, start, end) <= Math.max(1, threshold)
  }

  return true
}

/**
 * Resolves whether pointer is inside a clip-shape boundary using tighter defaults.
 * @param pointer Pointer position in world coordinates.
 * @param clipSource Clip-shape node used by masked objects.
 */
export function isPointInsideRuntimeClipShape(
  pointer: {x: number; y: number},
  clipSource: DocumentNode,
) {
  // AI-TEMP: clip path exact geometry falls back to bounds hit-test; remove when lib clip-path containment helper is available; ref vector-engine-vnext-hard-cut-blockers-2026-05-21.
  return isPointInsideRuntimeShapeHitArea(pointer, clipSource, {tolerance: 1.5})
}

/**
 * Resolves candidate budget for exact hit-tests from local visibility heuristics.
 * @param input Candidate visibility features sampled by worker hit-test stage.
 */
export function resolveRuntimeVisibilityHitTestBudget(
  input: RuntimeVisibilityHitTestBudgetInput,
): RuntimeVisibilityHitTestBudget {
  const boost = Math.max(0, input.interactionBoost ?? 0) + Math.max(0, input.semanticBoost ?? 0)
  const density = Math.max(1, input.candidateCount)
  const tinyTopCandidate = input.topCandidateAreaPx2 <= 64 || input.topCandidateMinEdgePx <= 8

  if (density >= 64 && !tinyTopCandidate && boost < 2) {
    return {hitMode: 'bbox', maxExactCandidateCount: 1}
  }

  if (density >= 16 && boost < 4) {
    return {
      hitMode: 'bbox_then_exact',
      maxExactCandidateCount: tinyTopCandidate ? 8 : 4,
    }
  }

  return {
    hitMode: 'exact',
    maxExactCandidateCount: tinyTopCandidate ? 10 : 6,
  }
}

/**
 * Resolves normalized axis-aligned bounds for one shape.
 * @param shape Source shape from document model.
 */
function getShapeBounds(shape: Pick<DocumentNode, 'x' | 'y' | 'width' | 'height'>) {
  const minX = Math.min(shape.x, shape.x + shape.width)
  const minY = Math.min(shape.y, shape.y + shape.height)
  const maxX = Math.max(shape.x, shape.x + shape.width)
  const maxY = Math.max(shape.y, shape.y + shape.height)
  return {minX, minY, maxX, maxY}
}

/**
 * Resolves whether one pointer sits within expanded axis-aligned bounds.
 * @param pointer Pointer position in world coordinates.
 * @param bounds Normalized axis-aligned bounds.
 * @param tolerance Bounds expansion applied on each side.
 */
function isPointInsideBounds(
  pointer: {x: number; y: number},
  bounds: {minX: number; minY: number; maxX: number; maxY: number},
  tolerance: number,
) {
  return (
    pointer.x >= bounds.minX - tolerance &&
    pointer.x <= bounds.maxX + tolerance &&
    pointer.y >= bounds.minY - tolerance &&
    pointer.y <= bounds.maxY + tolerance
  )
}

/**
 * Resolves shortest distance from a point to a finite line segment.
 * @param point Query point in world coordinates.
 * @param start Segment start point.
 * @param end Segment end point.
 */
function distancePointToSegment(
  point: {x: number; y: number},
  start: {x: number; y: number},
  end: {x: number; y: number},
) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= Number.EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const projection = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, projection))
  const closest = {
    x: start.x + dx * t,
    y: start.y + dy * t,
  }
  return Math.hypot(point.x - closest.x, point.y - closest.y)
}