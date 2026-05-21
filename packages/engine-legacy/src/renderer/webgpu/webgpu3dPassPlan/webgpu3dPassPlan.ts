// Module responsibility: plan WebGPU 3D pass batches for material, lighting, and instancing readiness.
// Non-responsibility: issuing GPU commands or replacing the existing renderer execution path.

import type {
  EngineLightingBinding,
  EngineLightingRigSnapshot,
} from '../../../lighting/contracts.ts'
import type {
  EngineMaterialBinding,
  EngineMaterialRegistrySnapshot,
  EngineMaterialShadingModel,
} from '../../../material/contracts.ts'
import type {
  EngineNodeId,
  EngineRenderableNode,
} from '../../../scene/types/types.ts'

/**
 * Declares one node-level WebGPU 3D pass planning candidate.
 */
export interface EngineWebGPU3DPassCandidate {
  /** Node id represented by this pass candidate. */
  nodeId: EngineNodeId
  /** Scene node type used for render-path support checks. */
  nodeType: EngineRenderableNode['type']
  /** Optional material id referenced by the candidate. */
  materialId?: string
  /** Optional node-level lighting override. */
  lightingMode?: 'inherit' | 'unlit' | 'lit'
  /** Optional geometry key used to group instanced draws. */
  geometryKey?: string
  /** Optional instance id used for diagnostics and future instance buffers. */
  instanceId?: string
}

/**
 * Declares one grouped WebGPU 3D pass batch.
 */
export interface EngineWebGPU3DPassBatch {
  /** Stable grouping key for material, lighting, and geometry state. */
  batchKey: string
  /** Material binding resolved for this batch. */
  material: EngineMaterialBinding
  /** Lighting binding resolved for this batch. */
  lighting: EngineLightingBinding
  /** Geometry key shared by all candidates in this batch. */
  geometryKey: string
  /** Node ids included in this batch. */
  nodeIds: readonly EngineNodeId[]
  /** Instance ids included in this batch. */
  instanceIds: readonly string[]
}

/**
 * Declares WebGPU 3D pass capability coverage diagnostics.
 */
export interface EngineWebGPU3DPassCoverage {
  /** Number of candidates accepted by the WebGPU 3D pass planner. */
  supportedCount: number
  /** Number of candidates rejected by pass capability checks. */
  unsupportedCount: number
  /** Normalized native 3D pass coverage ratio in range [0, 1]. */
  nativeCoverageRatio: number
  /** Number of batches that can use instanced submission semantics. */
  instancedBatchCount: number
  /** Number of lit batches requiring scene lighting bindings. */
  litBatchCount: number
  /** Number of unlit batches requiring no scene lighting. */
  unlitBatchCount: number
}

/**
 * Declares one WebGPU 3D pass planning result.
 */
export interface EngineWebGPU3DPassPlan {
  /** Batches grouped by material, lighting, and geometry state. */
  batches: readonly EngineWebGPU3DPassBatch[]
  /** Unsupported candidate node ids in input order. */
  unsupportedNodeIds: readonly EngineNodeId[]
  /** Capability coverage diagnostics for B3/B6 readiness tracking. */
  coverage: EngineWebGPU3DPassCoverage
}

/**
 * Declares one WebGPU 3D pass planning input.
 */
export interface EngineWebGPU3DPassPlanInput {
  /** Candidates to group for native WebGPU 3D pass execution. */
  candidates: readonly EngineWebGPU3DPassCandidate[]
  /** Optional material registry used to resolve shading models. */
  materialRegistry?: EngineMaterialRegistrySnapshot
  /** Optional lighting rig used by lit batches. */
  lightingRig?: EngineLightingRigSnapshot
}

/**
 * Intent: resolve a WebGPU 3D pass plan grouped by material, lighting, and geometry state.
 * @param input WebGPU 3D pass planning input.
 * @returns WebGPU 3D pass plan with readiness coverage diagnostics.
 */
export function resolveEngineWebGPU3DPassPlan(input: EngineWebGPU3DPassPlanInput): EngineWebGPU3DPassPlan {
  const batchesByKey = new Map<string, MutablePassBatch>()
  const unsupportedNodeIds: EngineNodeId[] = []

  for (const candidate of input.candidates) {
    if (!isSupported3DPassCandidate(candidate)) {
      unsupportedNodeIds.push(candidate.nodeId)
      continue
    }

    const material = resolveMaterialBinding(candidate, input.materialRegistry)
    const lighting = resolveLightingBinding(candidate, material.shadingModel, input.lightingRig)
    const geometryKey = candidate.geometryKey ?? `${candidate.nodeType}:default`
    const batchKey = [
      material.materialId ?? 'material:none',
      material.shadingModel,
      lighting.mode,
      geometryKey,
    ].join('|')
    const batch = batchesByKey.get(batchKey) ?? {
      batchKey,
      material,
      lighting,
      geometryKey,
      nodeIds: [],
      instanceIds: [],
    }
    batch.nodeIds.push(candidate.nodeId)
    if (candidate.instanceId) {
      batch.instanceIds.push(candidate.instanceId)
    }
    batchesByKey.set(batchKey, batch)
  }

  const batches = Array.from(batchesByKey.values()).map((batch) => ({
    batchKey: batch.batchKey,
    material: batch.material,
    lighting: batch.lighting,
    geometryKey: batch.geometryKey,
    nodeIds: batch.nodeIds,
    instanceIds: batch.instanceIds,
  }))

  return {
    batches,
    unsupportedNodeIds,
    coverage: resolvePassCoverage(input.candidates.length, unsupportedNodeIds.length, batches),
  }
}

/**
 * Stores mutable batch assembly state before returning immutable arrays.
 */
interface MutablePassBatch {
  /** Stable batch key. */
  batchKey: string
  /** Resolved material binding. */
  material: EngineMaterialBinding
  /** Resolved lighting binding. */
  lighting: EngineLightingBinding
  /** Shared geometry grouping key. */
  geometryKey: string
  /** Mutable node id accumulator. */
  nodeIds: EngineNodeId[]
  /** Mutable instance id accumulator. */
  instanceIds: string[]
}

/**
 * Intent: check whether a candidate can enter the native 3D WebGPU pass planner.
 * @param candidate Candidate to evaluate.
 * @returns True when the candidate is supported.
 */
function isSupported3DPassCandidate(candidate: EngineWebGPU3DPassCandidate): boolean {
  return candidate.nodeType === 'shape' || candidate.nodeType === 'image'
}

/**
 * Intent: resolve the material binding for a pass candidate.
 * @param candidate Candidate with optional material reference.
 * @param registry Optional material registry snapshot.
 * @returns Effective material binding.
 */
function resolveMaterialBinding(
  candidate: EngineWebGPU3DPassCandidate,
  registry: EngineMaterialRegistrySnapshot | undefined,
): EngineMaterialBinding {
  const material = candidate.materialId
    ? registry?.materialsById[candidate.materialId]
    : undefined
  const shadingModel: EngineMaterialShadingModel = material?.shadingModel ?? 'unlit'

  return {
    materialId: material?.id ?? candidate.materialId,
    shadingModel,
    baseColor: material?.surface?.baseColor,
    opacity: material?.surface?.opacity,
  }
}

/**
 * Intent: resolve the lighting binding for a material and candidate override.
 * @param candidate Candidate with optional lighting override.
 * @param shadingModel Effective material shading model.
 * @param lightingRig Optional scene lighting rig.
 * @returns Effective lighting binding.
 */
function resolveLightingBinding(
  candidate: EngineWebGPU3DPassCandidate,
  shadingModel: EngineMaterialShadingModel,
  lightingRig: EngineLightingRigSnapshot | undefined,
): EngineLightingBinding {
  const effectiveLightingMode = candidate.lightingMode === 'inherit'
    ? shadingModel
    : candidate.lightingMode ?? shadingModel
  if (effectiveLightingMode !== 'lit') {
    return {mode: 'none'}
  }

  return {
    mode: 'scene-lights',
    activeLightIds: lightingRig?.lights.map((light) => light.id) ?? [],
  }
}

/**
 * Intent: resolve B3/B6 coverage counters from pass batches.
 * @param candidateCount Total candidate count.
 * @param unsupportedCount Unsupported candidate count.
 * @param batches Supported pass batches.
 * @returns Coverage diagnostics.
 */
function resolvePassCoverage(
  candidateCount: number,
  unsupportedCount: number,
  batches: readonly EngineWebGPU3DPassBatch[],
): EngineWebGPU3DPassCoverage {
  const supportedCount = Math.max(0, candidateCount - unsupportedCount)
  return {
    supportedCount,
    unsupportedCount,
    nativeCoverageRatio: candidateCount === 0 ? 1 : supportedCount / candidateCount,
    instancedBatchCount: batches.filter((batch) => batch.instanceIds.length > 1).length,
    litBatchCount: batches.filter((batch) => batch.lighting.mode === 'scene-lights').length,
    unlitBatchCount: batches.filter((batch) => batch.lighting.mode === 'none').length,
  }
}
