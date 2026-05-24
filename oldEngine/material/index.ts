/**
 * Material domain barrel for public/runtime-facing material contracts and shading helpers.
 * Keeps material-lighting surfaces discoverable without exposing core-private paths.
 */
export type {
  EngineMaterialBinding,
  EngineMaterialDefinition,
  EngineMaterialRegistrySnapshot,
  EngineMaterialShadingModel,
  EngineMaterialSurface,
} from './contracts.ts'
export type {
  EngineDrawCommandShadingBinding,
} from '../core/materialLighting/materialLighting.ts'
export {
  resolveEngineDrawCommandShadingBinding,
} from '../core/materialLighting/materialLighting.ts'
