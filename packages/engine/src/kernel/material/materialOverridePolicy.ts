/**
 * Declares the material override policy for editor operations.
 * Supports per-instance material overrides while preserving the base material reference.
 */
export interface EngineMaterialOverridePolicy {
  /** Whether material overrides are allowed on this entity. */
  allowOverrides: boolean;
  /** Base material id that overrides inherit from. */
  baseMaterialId: string | null;
  /** Per-property overrides applied on top of the base material. */
  propertyOverrides: Partial<EnginePbrOverrideProperties>;
  /** Whether overrides should be merged with parent scene-node material overrides. */
  inheritFromParent: boolean;
}

/**
 * Declares PBR property overrides that can be applied per-instance.
 */
export interface EnginePbrOverrideProperties {
  /** Override base color factor. */
  baseColor?: [number, number, number, number];
  /** Override metallic factor. */
  metallic?: number;
  /** Override roughness factor. */
  roughness?: number;
  /** Override emissive factor. */
  emissive?: [number, number, number];
  /** Override opacity. */
  opacity?: number;
  /** Override double-sided flag. */
  doubleSided?: boolean;
}

/**
 * Resolves the effective material for one entity considering override policy.
 * Returns the base material id when no overrides are active.
 * @param overridePolicy Material override policy for the entity.
 */
export function resolveEffectiveMaterialId(
  overridePolicy: EngineMaterialOverridePolicy,
): string | null {
  if (!overridePolicy.allowOverrides || !overridePolicy.baseMaterialId) {
    return overridePolicy.baseMaterialId;
  }
  return overridePolicy.baseMaterialId;
}
