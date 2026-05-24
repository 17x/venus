/**
 * Declares supported light types for baseline mixed 2D/3D runtime lighting.
 */
export type EngineLightType = 'ambient' | 'directional'

/**
 * Declares one base light payload shared by all light variants.
 */
export interface EngineLightBase {
  /** Stable light identifier referenced by lighting diagnostics and tooling. */
  id: string
  /** Light color represented as CSS-like color string. */
  color?: string
  /** Light intensity multiplier. */
  intensity?: number
}

/**
 * Declares one ambient light definition.
 */
export interface EngineAmbientLight extends EngineLightBase {
  /** Discriminant for ambient light type. */
  type: 'ambient'
}

/**
 * Declares one directional light definition.
 */
export interface EngineDirectionalLight extends EngineLightBase {
  /** Discriminant for directional light type. */
  type: 'directional'
  /** Directional light vector x component. */
  directionX: number
  /** Directional light vector y component. */
  directionY: number
  /** Directional light vector z component. */
  directionZ: number
}

/**
 * Declares one light definition variant.
 */
export type EngineLightDefinition =
  | EngineAmbientLight
  | EngineDirectionalLight

/**
 * Declares scene-level lighting rig snapshot.
 */
export interface EngineLightingRigSnapshot {
  /** Light list consumed by renderer lighting paths. */
  lights: readonly EngineLightDefinition[]
}

/**
 * Declares one resolved lighting binding attached to draw commands.
 */
export interface EngineLightingBinding {
  /** Effective lighting mode for this draw command. */
  mode: 'none' | 'scene-lights'
  /** Active light ids used by this draw command in scene-lights mode. */
  activeLightIds?: readonly string[]
}
