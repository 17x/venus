// Module responsibility: turn WebGPU 3D pass batches into deterministic resource binding payload budgets.
// Non-responsibility: allocating GPU buffers, bind groups, or command encoders.

import type {
  EngineWebGPU3DPassPlan,
} from '../webgpu3dPassPlan/webgpu3dPassPlan.ts'
import type {
  EngineWebGPUCameraUniformPlan,
} from '../webgpuCameraUniformPlan/webgpuCameraUniformPlan.ts'

const MATERIAL_UNIFORM_BYTES = 32
const LIGHT_UNIFORM_BYTES = 32
const INSTANCE_UNIFORM_BYTES = 64

/**
 * Declares aggregate WebGPU resource binding readiness for one 3D pass plan.
 */
export interface EngineWebGPU3DBindingPlanSummary {
  /** Number of pass batches represented by this binding plan. */
  batchCount: number
  /** Number of material uniform payloads required by planned batches. */
  materialUniformCount: number
  /** Estimated bytes required by material uniform payloads. */
  materialUniformBytes: number
  /** Number of unique scene lights referenced by lit batches. */
  lightUniformCount: number
  /** Estimated bytes required by light uniform payloads. */
  lightUniformBytes: number
  /** Number of instance payloads required by planned batches. */
  instanceUniformCount: number
  /** Estimated bytes required by instance payloads. */
  instanceUniformBytes: number
  /** Byte size of the active camera uniform payload, when available. */
  cameraUniformBytes: number
  /** Estimated total bytes represented by this binding plan. */
  totalUniformBytes: number
}

/**
 * Declares WebGPU binding plan metadata produced before true GPU bind-group execution.
 */
export interface EngineWebGPU3DBindingPlan {
  /** Aggregate binding payload summary for runtime diagnostics and upload budgeting. */
  summary: EngineWebGPU3DBindingPlanSummary
}

/**
 * Declares inputs required to resolve a WebGPU 3D binding payload plan.
 */
export interface EngineWebGPU3DBindingPlanInput {
  /** WebGPU 3D pass plan whose batches need binding resources. */
  passPlan: EngineWebGPU3DPassPlan
  /** Optional camera uniform payload prepared for the current frame. */
  cameraUniformPlan?: EngineWebGPUCameraUniformPlan | null
}

/**
 * Intent: estimate stable WebGPU binding resource payloads for one 3D pass plan.
 * @param input Binding planning input containing pass batches and optional camera uniform payload.
 * @returns WebGPU binding plan summary ready for diagnostics and future GPU upload wiring.
 */
export function resolveEngineWebGPU3DBindingPlan(
  input: EngineWebGPU3DBindingPlanInput,
): EngineWebGPU3DBindingPlan {
  const lightIds = new Set<string>()
  let instanceUniformCount = 0

  for (const batch of input.passPlan.batches) {
    instanceUniformCount += Math.max(1, batch.instanceIds.length)
    for (const lightId of batch.lighting.activeLightIds ?? []) {
      lightIds.add(lightId)
    }
  }

  const materialUniformCount = input.passPlan.batches.length
  const materialUniformBytes = materialUniformCount * MATERIAL_UNIFORM_BYTES
  const lightUniformCount = lightIds.size
  const lightUniformBytes = lightUniformCount * LIGHT_UNIFORM_BYTES
  const instanceUniformBytes = instanceUniformCount * INSTANCE_UNIFORM_BYTES
  const cameraUniformBytes = input.cameraUniformPlan?.byteLength ?? 0

  return {
    summary: {
      batchCount: input.passPlan.batches.length,
      materialUniformCount,
      materialUniformBytes,
      lightUniformCount,
      lightUniformBytes,
      instanceUniformCount,
      instanceUniformBytes,
      cameraUniformBytes,
      totalUniformBytes: materialUniformBytes + lightUniformBytes + instanceUniformBytes + cameraUniformBytes,
    },
  }
}
