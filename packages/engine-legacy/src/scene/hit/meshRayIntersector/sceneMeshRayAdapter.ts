// Module responsibility: adapt scene/asset mesh payloads into pure mesh ray-hit candidates.
// Non-responsibility: owning scene mesh storage, loading assets, or executing ray intersections.

import type { EngineMat4 } from '../../../math/dimension/types.ts'
import type { EngineNodeId, EngineRenderableNode } from '../../types/types.ts'
import type { EngineMeshRayCandidate, EngineMeshRayGeometry } from './meshRayIntersector.ts'

/**
 * Declares one scene-level mesh source that can be converted into ray-hit candidates.
 */
export interface EngineSceneMeshRaySource {
  /** Scene node id that owns the mesh source. */
  nodeId: EngineNodeId
  /** Existing scene node type used for shared hit-test compatibility. */
  nodeType: EngineRenderableNode['type']
  /** Optional inline mesh geometry for sources that already resolved asset payloads. */
  geometry?: EngineMeshRayGeometry
  /** Optional mesh asset id used to resolve geometry from the adapter registry. */
  meshAssetId?: string
  /** Optional local-to-world transform used by non-instanced mesh sources. */
  transform?: EngineMat4
  /** Optional render-order tie-breaker used after ray-distance ordering. */
  zOrder?: number
  /** Optional hit score used by compatibility ordering. */
  score?: number
  /** Optional instances emitted as independent ray-hit candidates. */
  instances?: readonly EngineSceneMeshRayInstance[]
}

/**
 * Declares one mesh instance payload attached to a scene mesh source.
 */
export interface EngineSceneMeshRayInstance {
  /** Stable instance id exposed through hit-test metadata. */
  instanceId: string
  /** Instance local-to-world transform. */
  transform: EngineMat4
  /** Optional instance-level render-order tie-breaker. */
  zOrder?: number
  /** Optional instance-level hit score. */
  score?: number
}

/**
 * Declares one adapter input for converting mesh sources into ray candidates.
 */
export interface EngineSceneMeshRayCandidateInput {
  /** Mesh sources in deterministic scene traversal order. */
  sources: readonly EngineSceneMeshRaySource[]
  /** Optional geometry registry indexed by mesh asset id. */
  geometryByAssetId?: Readonly<Record<string, EngineMeshRayGeometry>>
}

/**
 * Declares one adapter result for mesh ray candidates and skipped source diagnostics.
 */
export interface EngineSceneMeshRayCandidateResult {
  /** Ray-hit candidates ready for resolveEngineMeshRayHits. */
  candidates: readonly EngineMeshRayCandidate[]
  /** Source node ids skipped because no inline or registry geometry was available. */
  skippedNodeIds: readonly EngineNodeId[]
  /** Mesh asset ids skipped because the registry did not contain geometry. */
  skippedMissingGeometryAssetIds: readonly string[]
}

/**
 * Intent: convert scene mesh sources into deterministic mesh ray-hit candidates.
 * @param input Scene mesh sources plus optional asset geometry registry.
 * @returns Candidate list and explicit skipped-source diagnostics.
 */
export function resolveEngineSceneMeshRayCandidates(
  input: EngineSceneMeshRayCandidateInput,
): EngineSceneMeshRayCandidateResult {
  const candidates: EngineMeshRayCandidate[] = []
  const skippedNodeIds: EngineNodeId[] = []
  const skippedMissingGeometryAssetIds: string[] = []

  for (const source of input.sources) {
    const geometry = resolveSourceGeometry(source, input.geometryByAssetId)
    if (!geometry) {
      skippedNodeIds.push(source.nodeId)
      if (source.meshAssetId) {
        skippedMissingGeometryAssetIds.push(source.meshAssetId)
      }
      continue
    }

    if (source.instances && source.instances.length > 0) {
      candidates.push(...source.instances.map((instance) => ({
        nodeId: source.nodeId,
        nodeType: source.nodeType,
        instanceId: instance.instanceId,
        geometry,
        transform: instance.transform,
        zOrder: instance.zOrder ?? source.zOrder,
        score: instance.score ?? source.score,
      })))
      continue
    }

    candidates.push({
      nodeId: source.nodeId,
      nodeType: source.nodeType,
      geometry,
      transform: source.transform,
      zOrder: source.zOrder,
      score: source.score,
    })
  }

  return {
    candidates,
    skippedNodeIds,
    skippedMissingGeometryAssetIds,
  }
}

/**
 * Intent: resolve inline or registry-backed geometry for one mesh source.
 * @param source Mesh source whose geometry should be resolved.
 * @param geometryByAssetId Optional registry indexed by mesh asset id.
 * @returns Mesh ray geometry or null when the source cannot be intersected.
 */
function resolveSourceGeometry(
  source: EngineSceneMeshRaySource,
  geometryByAssetId: Readonly<Record<string, EngineMeshRayGeometry>> | undefined,
): EngineMeshRayGeometry | null {
  if (source.geometry) {
    return source.geometry
  }

  if (!source.meshAssetId) {
    return null
  }

  return geometryByAssetId?.[source.meshAssetId] ?? null
}
