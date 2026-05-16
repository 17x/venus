/**
 * Debug domain barrel aligned with the 2D->3D architecture blueprint.
 */
export type {
  EnginePerformanceGateStatus,
  EnginePerformanceGateThresholds,
} from '../runtime/createEngine/performanceGate.ts'
export {
  resolveEnginePerformanceGateStatus,
} from '../runtime/createEngine/performanceGate.ts'

export type {
  EngineRuntimeInspectorV2Snapshot,
} from './runtimeInspectorV2.ts'
export {
  resolveEngineRuntimeInspectorV2Snapshot,
} from './runtimeInspectorV2.ts'
