import type { EngineEditorPoint } from './hitTest.ts'

const PATH_HASH_CELL_SIZE_MULTIPLIER = 2
const PATH_HASH_MIN_SEGMENTS = 48
const PATH_HASH_NEIGHBOR_RADIUS = 1
const PATH_HASH_MAX_CELLS_PER_SEGMENT = 64
const TOLERANCE_ROUNDING_MIN = 0.5

/**
 * Stores one path stroke line-segment entry used by stroke hit checks.
 */
export type PathStrokeSegment = {x1: number; y1: number; x2: number; y2: number}

/**
 * Stores one optional path stroke spatial grid index for dense-segment paths.
 */
export interface PathStrokeSpatialGridEntry {
  cellSize: number
  buckets: Map<string, number[]>
}

// Resolve stroke candidate segments near the pointer by using a lightweight spatial hash on dense paths.
/**
 * Handles resolveCandidateSegmentsForPointer.
 * @param pointer Pointer position.
 * @param segments segments parameter.
 * @param cachedGrid cachedGrid parameter.
 */
export function resolveCandidateSegmentsForPointer(
  pointer: EngineEditorPoint,
  segments: PathStrokeSegment[],
  cachedGrid: PathStrokeSpatialGridEntry | null,
) {
  if (!cachedGrid) {
    return segments
  }

  const pointerCellX = Math.floor(pointer.x / cachedGrid.cellSize)
  const pointerCellY = Math.floor(pointer.y / cachedGrid.cellSize)
  const candidateIndexes = new Set<number>()

  // Probe 3x3 neighboring cells so border-adjacent segments are not missed.
  for (let offsetX = -PATH_HASH_NEIGHBOR_RADIUS; offsetX <= PATH_HASH_NEIGHBOR_RADIUS; offsetX += 1) {
    for (let offsetY = -PATH_HASH_NEIGHBOR_RADIUS; offsetY <= PATH_HASH_NEIGHBOR_RADIUS; offsetY += 1) {
      const key = resolveSpatialHashKey(pointerCellX + offsetX, pointerCellY + offsetY)
      const bucket = cachedGrid.buckets.get(key)
      if (!bucket) {
        continue
      }

      for (const segmentIndex of bucket) {
        candidateIndexes.add(segmentIndex)
      }
    }
  }

  // Fail-safe fallback keeps semantics stable even if hashing had no nearby buckets.
  if (candidateIndexes.size === 0) {
    return segments
  }

  return [...candidateIndexes].map((segmentIndex) => segments[segmentIndex])
}

// Resolve optional segment-grid index for dense stroke paths.
/**
 * Handles createPathStrokeSpatialGrid.
 * @param segments segments parameter.
 * @param tolerance tolerance parameter.
 */
export function createPathStrokeSpatialGrid(
  segments: PathStrokeSegment[],
  tolerance: number,
) {
  if (segments.length < PATH_HASH_MIN_SEGMENTS) {
    return null
  }

  const cellSize = Math.max(1, Math.max(TOLERANCE_ROUNDING_MIN, tolerance) * PATH_HASH_CELL_SIZE_MULTIPLIER)
  const buckets = new Map<string, number[]>()

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const minX = Math.min(segment.x1, segment.x2) - tolerance
    const minY = Math.min(segment.y1, segment.y2) - tolerance
    const maxX = Math.max(segment.x1, segment.x2) + tolerance
    const maxY = Math.max(segment.y1, segment.y2) + tolerance

    const startCellX = Math.floor(minX / cellSize)
    const endCellX = Math.floor(maxX / cellSize)
    const startCellY = Math.floor(minY / cellSize)
    const endCellY = Math.floor(maxY / cellSize)
    const coveredCellCount = (endCellX - startCellX + 1) * (endCellY - startCellY + 1)

    // Fallback to full scan when segment coverage is too broad for efficient bucketization.
    if (coveredCellCount > PATH_HASH_MAX_CELLS_PER_SEGMENT) {
      return null
    }

    for (let cellX = startCellX; cellX <= endCellX; cellX += 1) {
      for (let cellY = startCellY; cellY <= endCellY; cellY += 1) {
        const key = resolveSpatialHashKey(cellX, cellY)
        const bucket = buckets.get(key)
        if (bucket) {
          bucket.push(index)
          continue
        }
        buckets.set(key, [index])
      }
    }
  }

  return {
    cellSize,
    buckets,
  }
}

// Resolve one stable string key for 2D grid coordinates.
/**
 * Handles resolveSpatialHashKey.
 * @param cellX cellX parameter.
 * @param cellY cellY parameter.
 */
function resolveSpatialHashKey(cellX: number, cellY: number) {
  return `${cellX}:${cellY}`
}