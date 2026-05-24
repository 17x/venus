/**
 * Declares supported material shading models for staged 2D/3D runtime migration.
 */
export type EngineMaterialShadingModel = 'unlit' | 'lit'

/**
 * Declares one physically-inspired surface payload used by material contracts.
 */
export interface EngineMaterialSurface {
  /** Base albedo color represented as CSS-like color string. */
  baseColor?: string
  /** Emissive color represented as CSS-like color string. */
  emissiveColor?: string
  /** Metalness factor in range [0, 1]. */
  metallic?: number
  /** Roughness factor in range [0, 1]. */
  roughness?: number
  /** Opacity factor in range [0, 1]. */
  opacity?: number
  /** Whether this material should render back faces. */
  doubleSided?: boolean
}

/**
 * Declares one named material definition in scene-level material registries.
 */
export interface EngineMaterialDefinition {
  /** Stable material identifier referenced by scene nodes. */
  id: string
  /** Shading model used by renderer lighting paths. */
  shadingModel: EngineMaterialShadingModel
  /** Surface payload used by renderer backends. */
  surface?: EngineMaterialSurface
}

/**
 * Declares scene-level material registry snapshot.
 */
export interface EngineMaterialRegistrySnapshot {
  /** Material definitions indexed by material id. */
  materialsById: Readonly<Record<string, EngineMaterialDefinition>>
}

/**
 * Declares one resolved material binding attached to draw commands.
 */
export interface EngineMaterialBinding {
  /** Material id associated with the draw command, if any. */
  materialId?: string
  /** Effective shading model chosen for this draw command. */
  shadingModel: EngineMaterialShadingModel
  /** Effective base color resolved for the draw command. */
  baseColor?: string
  /** Effective opacity resolved for the draw command. */
  opacity?: number
}
