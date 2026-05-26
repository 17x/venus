/**
 * Declares one shader uniform binding descriptor for material-to-shader parameter mapping.
 */
export interface EngineShaderUniformBinding {
  /** Uniform name as declared in the GLSL shader. */
  name: string;
  /** Uniform type token for type-safe binding. */
  type: "float" | "vec2" | "vec3" | "vec4" | "mat3" | "mat4" | "sampler2D" | "samplerCube";
  /** Material property path for value resolution (e.g. "baseColor", "metallic"). */
  materialProperty: string;
  /** Default value when the material property is not set. */
  defaultValue: number | readonly number[];
}

/**
 * Declares one shader texture binding for material texture mapping.
 */
export interface EngineShaderTextureBinding {
  /** Sampler name as declared in the GLSL shader. */
  name: string;
  /** Texture unit index for GLSL binding. */
  unit: number;
  /** Material texture property path (e.g. "baseColorTexture", "normalTexture"). */
  materialTextureProperty: string;
}

/**
 * Declares the shader binding path contract for material-to-shader parameter resolution.
 */
export interface EngineShaderBindingPath {
  /** Ordered uniform bindings for this shader-material pair. */
  uniforms: readonly EngineShaderUniformBinding[];
  /** Ordered texture bindings for this shader-material pair. */
  textures: readonly EngineShaderTextureBinding[];
}

/**
 * Creates an empty shader binding path.
 */
export function createEmptyShaderBindingPath(): EngineShaderBindingPath {
  return { uniforms: [], textures: [] };
}
