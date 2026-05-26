/**
 * Declares the custom shader material sandbox contract with guardrails.
 * Allows user-supplied GLSL while enforcing engine governance boundaries.
 */
export interface EngineCustomShaderSandbox {
  /** Unique sandbox identifier. */
  id: string;
  /** Vertex shader GLSL source (validated before execution). */
  vertexShader: string;
  /** Fragment shader GLSL source (validated before execution). */
  fragmentShader: string;
  /** Declared uniform names and types for engine-side value injection. */
  uniforms: readonly EngineShaderUniformDecl[];
  /** Whether the shader can access depth buffer (restricted by default). */
  allowDepthAccess: boolean;
  /** Maximum instruction count before compilation is rejected. */
  maxInstructionCount: number;
  /** Whether the shader has passed engine validation. */
  validated: boolean;
}

/** Declares one uniform declaration for custom shader validation. */
export interface EngineShaderUniformDecl {
  name: string;
  type: "float" | "vec2" | "vec3" | "vec4" | "mat3" | "mat4" | "sampler2D" | "samplerCube";
}

/** Guardrail: forbidden GLSL tokens that are rejected during validation. */
export const FORBIDDEN_SHADER_TOKENS = [
  "discard",
  "gl_FragDepth",
  "atomic",
  "barrier",
  "memoryBarrier",
] as const;

/**
 * Validates custom shader source against engine guardrails.
 * @param source GLSL source to validate.
 * @returns True if the source passes all guardrail checks.
 */
export function validateShaderSource(source: string): boolean {
  return !FORBIDDEN_SHADER_TOKENS.some((token) => source.includes(token));
}
