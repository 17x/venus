import type { EngineRenderStats } from '../../renderer/types/index.ts'

/**
 * Declares runtime diagnostics for WebGPU camera snapshot and uniform payload readiness.
 */
export interface EngineRuntimeDiagnosticsWebGPUCamera3D {
  /** True when latest WebGPU frame consumed a 3D camera snapshot. */
  active: boolean
  /** Controller family of latest WebGPU camera snapshot. */
  controller: NonNullable<EngineRenderStats['webgpuCamera3DController']>
  /** Projection kind of latest WebGPU camera snapshot. */
  projectionKind: NonNullable<EngineRenderStats['webgpuCamera3DProjectionKind']>
  /** Byte size of the latest prepared camera uniform payload. */
  uniformBytes: number
  /** Float count of the latest prepared camera uniform payload. */
  uniformFloatCount: number
}
