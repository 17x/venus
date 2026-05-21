import type { BezierPoint } from '../../../runtime/model/index.ts'

/**
 * Declares input contract for path anchor deletion policy.
 */
export interface ResolvePathAnchorDeleteBezierPointsInput {
  /** Stores current bezier point list for target path. */
  bezierPoints: BezierPoint[]
  /** Stores anchor index that should be removed. */
  anchorIndex: number
  /** Stores whether path should keep closed-topology minimum anchors. */
  isClosedPath: boolean
}

/**
 * Declares input contract for path anchor type-toggle policy.
 */
export interface ResolvePathAnchorToggleBezierPointsInput {
  /** Stores current bezier point list for target path. */
  bezierPoints: BezierPoint[]
  /** Stores anchor index whose handle mode should be toggled. */
  anchorIndex: number
}

/**
 * Declares input contract for path anchor insertion policy.
 */
export interface ResolvePathAnchorInsertBezierPointsInput {
  /** Stores current bezier point list for target path. */
  bezierPoints: BezierPoint[]
  /** Stores segment start anchor index where new anchor should be inserted after. */
  segmentIndex: number
  /** Stores world point where new anchor should be created. */
  point: {x: number; y: number}
}

/**
 * Declares input contract for path segment split policy.
 */
export interface ResolvePathSegmentSplitBezierPointsInput {
  /** Stores current bezier point list for target path. */
  bezierPoints: BezierPoint[]
  /** Stores segment start anchor index where split anchor should be inserted. */
  segmentIndex: number
  /** Stores split position sampled from hit-test result. */
  point: {x: number; y: number}
}

/**
 * Declares input contract for path close/open toggle policy.
 */
export interface ResolvePathToggleClosedBezierPointsInput {
  /** Stores current bezier point list for target path. */
  bezierPoints: BezierPoint[]
  /** Stores whether path is currently treated as closed. */
  isClosedPath: boolean
}

/**
 * Resolves one safe unit vector between two points.
 * @param from Source point.
 * @param to Target point.
 * @returns Normalized vector or null when points overlap.
 */
function resolveUnitVector(from: {x: number; y: number}, to: {x: number; y: number}) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length <= 0) {
    return null
  }

  return {
    x: dx / length,
    y: dy / length,
    length,
  }
}

/**
 * Resolves one cloned bezier point list for immutable path edits.
 * @param bezierPoints Source bezier point list.
 * @returns Deep-cloned bezier point list.
 */
function cloneBezierPoints(bezierPoints: BezierPoint[]): BezierPoint[] {
  return bezierPoints.map((item) => ({
    anchor: {...item.anchor},
    cp1: item.cp1 ? {...item.cp1} : undefined,
    cp2: item.cp2 ? {...item.cp2} : undefined,
  }))
}

/**
 * Resolves whether first and last anchors share the same coordinate.
 * @param bezierPoints Current bezier point list.
 * @returns True when path already ends with duplicated head anchor.
 */
function resolveClosedByTailAnchor(bezierPoints: BezierPoint[]) {
  if (bezierPoints.length < 2) {
    return false
  }

  const head = bezierPoints[0]
  const tail = bezierPoints[bezierPoints.length - 1]
  return head.anchor.x === tail.anchor.x && head.anchor.y === tail.anchor.y
}

/**
 * Removes one anchor from bezier point list while keeping minimal topology constraints.
 * @param input Path anchor deletion input.
 * @returns Updated bezier points or null when operation is invalid.
 */
export function resolvePathAnchorDeleteBezierPoints(
  input: ResolvePathAnchorDeleteBezierPointsInput,
): BezierPoint[] | null {
  if (!Number.isInteger(input.anchorIndex) || input.anchorIndex < 0) {
    return null
  }

  if (input.anchorIndex >= input.bezierPoints.length) {
    return null
  }

  const nextCount = input.bezierPoints.length - 1
  const minimumAnchorCount = input.isClosedPath ? 3 : 2
  if (nextCount < minimumAnchorCount) {
    return null
  }

  const cloned = cloneBezierPoints(input.bezierPoints)
  cloned.splice(input.anchorIndex, 1)
  return cloned
}

/**
 * Toggles one anchor between corner mode and smooth mode.
 * @param input Path anchor toggle input.
 * @returns Updated bezier points or null when operation is invalid.
 */
export function resolvePathAnchorToggleBezierPoints(
  input: ResolvePathAnchorToggleBezierPointsInput,
): BezierPoint[] | null {
  if (!Number.isInteger(input.anchorIndex) || input.anchorIndex < 0) {
    return null
  }

  if (input.anchorIndex >= input.bezierPoints.length) {
    return null
  }

  const cloned = cloneBezierPoints(input.bezierPoints)
  const target = cloned[input.anchorIndex]
  const hasHandles = Boolean(target.cp1 || target.cp2)

  if (hasHandles) {
    target.cp1 = undefined
    target.cp2 = undefined
    return cloned
  }

  const previous = cloned[input.anchorIndex - 1] ?? null
  const next = cloned[input.anchorIndex + 1] ?? null
  const incoming = previous ? resolveUnitVector(target.anchor, previous.anchor) : null
  const outgoing = next ? resolveUnitVector(target.anchor, next.anchor) : null

  if (!incoming && !outgoing) {
    return cloned
  }

  const incomingLength = incoming ? Math.min(incoming.length * 0.35, 48) : null
  const outgoingLength = outgoing ? Math.min(outgoing.length * 0.35, 48) : null

  const mirrorSource = incoming ?? outgoing
  if (!mirrorSource) {
    return cloned
  }

  const inVector = incoming ?? {
    x: -mirrorSource.x,
    y: -mirrorSource.y,
  }
  const outVector = outgoing ?? {
    x: -mirrorSource.x,
    y: -mirrorSource.y,
  }

  const inLength = incomingLength ?? Math.min(mirrorSource.length * 0.35, 48)
  const outLength = outgoingLength ?? Math.min(mirrorSource.length * 0.35, 48)

  target.cp1 = {
    x: target.anchor.x + inVector.x * inLength,
    y: target.anchor.y + inVector.y * inLength,
  }
  target.cp2 = {
    x: target.anchor.x + outVector.x * outLength,
    y: target.anchor.y + outVector.y * outLength,
  }

  return cloned
}

/**
 * Inserts one anchor point after target segment index.
 * @param input Path anchor insertion input.
 * @returns Updated bezier points or null when operation is invalid.
 */
export function resolvePathAnchorInsertBezierPoints(
  input: ResolvePathAnchorInsertBezierPointsInput,
): BezierPoint[] | null {
  if (!Number.isInteger(input.segmentIndex) || input.segmentIndex < 0) {
    return null
  }

  if (input.segmentIndex >= input.bezierPoints.length - 1) {
    return null
  }

  const cloned = cloneBezierPoints(input.bezierPoints)
  cloned.splice(input.segmentIndex + 1, 0, {
    anchor: {
      x: input.point.x,
      y: input.point.y,
    },
    cp1: undefined,
    cp2: undefined,
  })
  return cloned
}

/**
 * Splits one path segment by inserting an anchor at sampled segment position.
 * @param input Path segment split input.
 * @returns Updated bezier points or null when operation is invalid.
 */
export function resolvePathSegmentSplitBezierPoints(
  input: ResolvePathSegmentSplitBezierPointsInput,
): BezierPoint[] | null {
  return resolvePathAnchorInsertBezierPoints({
    bezierPoints: input.bezierPoints,
    segmentIndex: input.segmentIndex,
    point: input.point,
  })
}

/**
 * Toggles path closure by appending/removing duplicated head anchor at tail.
 * @param input Path close/open toggle input.
 * @returns Updated bezier points or null when operation is invalid.
 */
export function resolvePathToggleClosedBezierPoints(
  input: ResolvePathToggleClosedBezierPointsInput,
): BezierPoint[] | null {
  const cloned = cloneBezierPoints(input.bezierPoints)
  if (cloned.length === 0) {
    return null
  }

  if (input.isClosedPath) {
    if (cloned.length <= 2) {
      return null
    }

    if (resolveClosedByTailAnchor(cloned)) {
      cloned.pop()
    }

    if (cloned.length < 2) {
      return null
    }

    return cloned
  }

  if (cloned.length < 3) {
    return null
  }

  if (resolveClosedByTailAnchor(cloned)) {
    return cloned
  }

  const head = cloned[0]
  cloned.push({
    anchor: {
      x: head.anchor.x,
      y: head.anchor.y,
    },
    cp1: undefined,
    cp2: undefined,
  })
  return cloned
}
