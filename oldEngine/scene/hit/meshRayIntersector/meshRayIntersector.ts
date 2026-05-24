// Module responsibility: resolve deterministic 3D mesh/instance ray intersections for native hit adapters.
// Non-responsibility: owning scene traversal, acceleration structures, or renderer-specific mesh storage.

import type {
  EngineMat4,
  EngineRay3,
  EngineVec3,
} from '../../../math/dimension/types.ts'
import type { EngineHitTestResult } from '../../hitTest/hitTest.ts'
import type { EngineRenderableNode } from '../../types/types.ts'
import type { EngineRayHitResolutionSummary } from '../contracts.ts'

const RAY_EPSILON = 1e-8

/**
 * Declares one indexed triangle by vertex indices.
 */
export type EngineMeshRayTriangleIndex = readonly [number, number, number]

/**
 * Declares the minimal mesh geometry payload required by pure ray intersection.
 */
export interface EngineMeshRayGeometry {
  /** Mesh vertices in local or pre-transformed world space. */
  vertices: readonly EngineVec3[]
  /** Indexed triangle list referencing `vertices`. */
  triangles: readonly EngineMeshRayTriangleIndex[]
}

/**
 * Declares one mesh or instance candidate for ray-hit traversal.
 */
export interface EngineMeshRayCandidate {
  /** Scene node id that owns this mesh candidate. */
  nodeId: string
  /** Scene node type reported through shared hit-test result contracts. */
  nodeType: EngineRenderableNode['type']
  /** Optional instance id when the hit target represents an instanced mesh. */
  instanceId?: string
  /** Mesh geometry to test against the ray. */
  geometry: EngineMeshRayGeometry
  /** Optional row-major transform from local mesh coordinates to world space. */
  transform?: EngineMat4
  /** Optional render-order tie-breaker used after depth ordering. */
  zOrder?: number
  /** Optional hit score used by compatibility ordering. */
  score?: number
}

/**
 * Declares the input payload for one mesh/instance ray traversal.
 */
export interface EngineMeshRayHitInput {
  /** World-space ray to test against all candidates. */
  ray: EngineRay3
  /** Mesh or instance candidates in deterministic traversal order. */
  candidates: readonly EngineMeshRayCandidate[]
  /** Optional maximum accepted ray distance. */
  maxDistance?: number
  /** Optional maximum exact triangle checks for this traversal. */
  exactCheckBudget?: number
}

/**
 * Intent: resolve ordered mesh/instance ray hits using deterministic triangle traversal.
 * @param input Mesh ray traversal input.
 * @returns Native ray-hit summary compatible with the shared hit resolver.
 */
export function resolveEngineMeshRayHits(input: EngineMeshRayHitInput): EngineRayHitResolutionSummary {
  const hits: EngineHitTestResult[] = []
  const exactCheckBudget = Math.max(0, Math.floor(input.exactCheckBudget ?? Number.MAX_SAFE_INTEGER))
  let exactCheckCount = 0
  let exactBudgetExceeded = false
  let traversalIndex = 0

  for (const candidate of input.candidates) {
    for (let triangleIndex = 0; triangleIndex < candidate.geometry.triangles.length; triangleIndex += 1) {
      if (exactCheckCount >= exactCheckBudget) {
        // Stop at the declared triangle budget so high-frequency hit tests can degrade predictably.
        exactBudgetExceeded = true
        break
      }

      exactCheckCount += 1
      const triangle = candidate.geometry.triangles[triangleIndex]
      const intersection = intersectRayTriangle(
        input.ray,
        resolveVertex(candidate.geometry.vertices[triangle[0]], candidate.transform),
        resolveVertex(candidate.geometry.vertices[triangle[1]], candidate.transform),
        resolveVertex(candidate.geometry.vertices[triangle[2]], candidate.transform),
        input.maxDistance,
      )

      if (intersection) {
        hits.push(createMeshHitResult(candidate, traversalIndex, intersection))
      }
      traversalIndex += 1
    }

    if (exactBudgetExceeded) {
      break
    }
  }

  return {
    hits: hits.sort(compareMeshRayHits),
    exactCheckCount,
    exactCheckBudget,
    exactBudgetExceeded,
  }
}

/**
 * Intent: resolve a candidate vertex in world space.
 * @param vertex Local or world-space vertex.
 * @param transform Optional local-to-world transform.
 * @returns World-space vertex.
 */
function resolveVertex(vertex: EngineVec3, transform: EngineMat4 | undefined): EngineVec3 {
  if (!transform) {
    return vertex
  }

  const w = (transform[12] * vertex.x) + (transform[13] * vertex.y) + (transform[14] * vertex.z) + transform[15]
  const safeW = Math.abs(w) <= RAY_EPSILON ? 1 : w
  return {
    x: ((transform[0] * vertex.x) + (transform[1] * vertex.y) + (transform[2] * vertex.z) + transform[3]) / safeW,
    y: ((transform[4] * vertex.x) + (transform[5] * vertex.y) + (transform[6] * vertex.z) + transform[7]) / safeW,
    z: ((transform[8] * vertex.x) + (transform[9] * vertex.y) + (transform[10] * vertex.z) + transform[11]) / safeW,
  }
}

/**
 * Intent: compute one Moller-Trumbore ray/triangle intersection.
 * @param ray World-space ray.
 * @param vertexA First triangle vertex.
 * @param vertexB Second triangle vertex.
 * @param vertexC Third triangle vertex.
 * @param maxDistance Optional maximum accepted ray distance.
 * @returns Hit distance and world-space point, or null when the ray misses.
 */
function intersectRayTriangle(
  ray: EngineRay3,
  vertexA: EngineVec3,
  vertexB: EngineVec3,
  vertexC: EngineVec3,
  maxDistance: number | undefined,
): {distance: number; point: EngineVec3} | null {
  const edgeAB = subtractVec3(vertexB, vertexA)
  const edgeAC = subtractVec3(vertexC, vertexA)
  const pVector = crossVec3(ray.direction, edgeAC)
  const determinant = dotVec3(edgeAB, pVector)
  if (Math.abs(determinant) <= RAY_EPSILON) {
    // Parallel or degenerate triangles cannot produce a stable depth-ordered hit.
    return null
  }

  const inverseDeterminant = 1 / determinant
  const originToA = subtractVec3(ray.origin, vertexA)
  const barycentricU = dotVec3(originToA, pVector) * inverseDeterminant
  if (barycentricU < 0 || barycentricU > 1) {
    return null
  }

  const qVector = crossVec3(originToA, edgeAB)
  const barycentricV = dotVec3(ray.direction, qVector) * inverseDeterminant
  if (barycentricV < 0 || barycentricU + barycentricV > 1) {
    return null
  }

  const distance = dotVec3(edgeAC, qVector) * inverseDeterminant
  if (distance < 0 || (maxDistance !== undefined && distance > maxDistance)) {
    return null
  }

  return {
    distance,
    point: addVec3(ray.origin, scaleVec3(ray.direction, distance)),
  }
}

/**
 * Intent: create one shared hit-test result from a mesh intersection.
 * @param candidate Mesh or instance candidate that produced the hit.
 * @param traversalIndex Deterministic triangle traversal index.
 * @param intersection Ray intersection details.
 * @returns Shared hit-test result with mesh/instance metadata.
 */
function createMeshHitResult(
  candidate: EngineMeshRayCandidate,
  traversalIndex: number,
  intersection: {distance: number; point: EngineVec3},
): EngineHitTestResult {
  return {
    index: traversalIndex,
    nodeId: candidate.nodeId,
    nodeType: candidate.nodeType,
    hitType: 'shape-body',
    score: candidate.score ?? 1,
    zOrder: candidate.zOrder ?? 0,
    hitPoint: {
      x: intersection.point.x,
      y: intersection.point.y,
    },
    hitTargetKind: candidate.instanceId ? 'instance' : 'mesh',
    instanceId: candidate.instanceId,
    rayDistance: intersection.distance,
  }
}

/**
 * Intent: order mesh ray hits by depth while preserving compatibility tie-breakers.
 * @param left Left hit result.
 * @param right Right hit result.
 * @returns Sort order.
 */
function compareMeshRayHits(left: EngineHitTestResult, right: EngineHitTestResult): number {
  const leftDistance = left.rayDistance ?? Number.POSITIVE_INFINITY
  const rightDistance = right.rayDistance ?? Number.POSITIVE_INFINITY
  if (leftDistance !== rightDistance) {
    return leftDistance - rightDistance
  }

  if (left.zOrder !== right.zOrder) {
    return right.zOrder - left.zOrder
  }

  return left.index - right.index
}

/**
 * Intent: subtract two vectors component-wise.
 * @param left Left vector.
 * @param right Right vector.
 * @returns Difference vector.
 */
function subtractVec3(left: EngineVec3, right: EngineVec3): EngineVec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z,
  }
}

/**
 * Intent: add two vectors component-wise.
 * @param left Left vector.
 * @param right Right vector.
 * @returns Sum vector.
 */
function addVec3(left: EngineVec3, right: EngineVec3): EngineVec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z,
  }
}

/**
 * Intent: scale one vector uniformly.
 * @param vector Vector to scale.
 * @param scale Scalar multiplier.
 * @returns Scaled vector.
 */
function scaleVec3(vector: EngineVec3, scale: number): EngineVec3 {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale,
  }
}

/**
 * Intent: compute one vector dot product.
 * @param left Left vector.
 * @param right Right vector.
 * @returns Dot product.
 */
function dotVec3(left: EngineVec3, right: EngineVec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z
}

/**
 * Intent: compute one vector cross product.
 * @param left Left vector.
 * @param right Right vector.
 * @returns Cross product.
 */
function crossVec3(left: EngineVec3, right: EngineVec3): EngineVec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  }
}
