/**
 * Declares the canonical material type tokens supported by the engine material system.
 */
export type EngineMaterialType =
  /** Physically-based rendering material with metallic-roughness workflow. */
  | "pbr"
  /** Unlit material with no lighting response. */
  | "unlit"
  /** Custom shader material with user-supplied GLSL. */
  | "custom";

/**
 * Base material entity contract shared by all material types.
 */
export interface EngineMaterialEntityBase {
  /** Unique material identifier. */
  id: string;
  /** Material type token classifying the shading model. */
  type: EngineMaterialType;
  /** Material name for editor display and debugging. */
  name: string;
}

/**
 * Texture sampler wrapping mode token for material texture coordinates.
 */
export type EngineTextureSamplerWrapMode = "clamp-to-edge" | "repeat" | "mirrored-repeat";

/**
 * Texture sampler filtering mode token.
 */
export type EngineTextureSamplerFilterMode = "nearest" | "linear";

/**
 * Texture sampler descriptor shared by graph materials and asset materials.
 */
export interface EngineTextureSamplerDescriptor {
  /** Horizontal UV wrapping mode. */
  wrapS?: EngineTextureSamplerWrapMode;
  /** Vertical UV wrapping mode. */
  wrapT?: EngineTextureSamplerWrapMode;
  /** Minification filter. */
  minFilter?: EngineTextureSamplerFilterMode;
  /** Magnification filter. */
  magFilter?: EngineTextureSamplerFilterMode;
}

/**
 * PBR material entity using the metallic-roughness workflow.
 * Aligned with glTF 2.0 PBR Metallic-Roughness material model.
 */
export interface EnginePbrMaterial extends EngineMaterialEntityBase {
  type: "pbr";
  /** Base color factor as RGBA channels (0–1). */
  baseColor: [number, number, number, number];
  /** Metallic factor (0 = dielectric, 1 = metallic). */
  metallic: number;
  /** Roughness factor (0 = smooth, 1 = rough). */
  roughness: number;
  /** Emissive color factor as RGB channels (0–1). */
  emissive: [number, number, number];
  /** Emissive intensity multiplier. */
  emissiveIntensity: number;
  /** Normal map scale factor applied to tangent-space normals. */
  normalScale: number;
  /** Ambient occlusion strength factor (0 = no AO, 1 = full AO). */
  aoStrength: number;
  /** Opacity factor (0 = fully transparent, 1 = fully opaque). */
  opacity: number;
  /** Whether the material uses alpha blending instead of alpha testing. */
  transparent: boolean;
  /** Alpha test threshold for alpha-to-coverage discard. */
  alphaTest: number;
  /** Whether back-face culling is disabled (double-sided rendering). */
  doubleSided: boolean;
  /** Base color texture URI or data-URL. */
  baseColorTexture?: string;
  /** Optional base color texture sampler descriptor. */
  baseColorTextureSampler?: EngineTextureSamplerDescriptor;
  /** Metallic-roughness texture URI (metallic in B, roughness in G). */
  metallicRoughnessTexture?: string;
  /** Optional metallic-roughness texture sampler descriptor. */
  metallicRoughnessTextureSampler?: EngineTextureSamplerDescriptor;
  /** Normal map texture URI for tangent-space normal perturbation. */
  normalTexture?: string;
  /** Optional normal texture sampler descriptor. */
  normalTextureSampler?: EngineTextureSamplerDescriptor;
  /** Ambient occlusion texture URI. */
  aoTexture?: string;
  /** Optional ambient occlusion texture sampler descriptor. */
  aoTextureSampler?: EngineTextureSamplerDescriptor;
  /** Emissive texture URI. */
  emissiveTexture?: string;
  /** Optional emissive texture sampler descriptor. */
  emissiveTextureSampler?: EngineTextureSamplerDescriptor;
}

/**
 * Unlit material entity with no lighting response (fullbright).
 */
export interface EngineUnlitMaterial extends EngineMaterialEntityBase {
  type: "unlit";
  /** Base color factor as RGBA channels (0–1). */
  baseColor: [number, number, number, number];
  /** Base color texture URI or data-URL. */
  baseColorTexture?: string;
  /** Optional base color texture sampler descriptor. */
  baseColorTextureSampler?: EngineTextureSamplerDescriptor;
  /** Opacity factor. */
  opacity: number;
}

/**
 * Custom shader material entity for user-supplied GLSL shading.
 */
export interface EngineCustomMaterial extends EngineMaterialEntityBase {
  type: "custom";
  /** Custom material properties exposed as uniform key-value pairs. */
  properties: Record<string, number | readonly number[] | string>;
  /** Vertex shader GLSL source. */
  vertexShader?: string;
  /** Fragment shader GLSL source. */
  fragmentShader?: string;
}

/**
 * Discriminated union of all supported material entity types.
 */
export type EngineMaterialEntity =
  | EnginePbrMaterial
  | EngineUnlitMaterial
  | EngineCustomMaterial;

/**
 * Material collection payload used in scene graph composition.
 */
export interface EngineMaterialCollection {
  /** Ordered material entities in the scene. */
  materials: readonly EngineMaterialEntity[];
}
