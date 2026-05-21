/**
 * Lighting domain barrel for public/runtime-facing lighting contracts.
 * Consolidates lighting type exports behind a stable domain entrypoint.
 */
export type {
  EngineAmbientLight,
  EngineDirectionalLight,
  EngineLightBase,
  EngineLightDefinition,
  EngineLightingBinding,
  EngineLightingRigSnapshot,
  EngineLightType,
} from './contracts.ts'
