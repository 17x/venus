/**
 * Declares the texture compression format tokens supported by the engine texture pipeline.
 */
export type EngineTextureCompressionFormat =
  /** KTX2 with Basis Universal supercompression. */
  | "ktx2-basis"
  /** KTX2 with UASTC encoding. */
  | "ktx2-uastc"
  /** Standard PNG/JPEG (no GPU compression). */
  | "png"
  /** WebP format. */
  | "webp";

/**
 * Declares the texture pipeline policy for runtime asset ingestion.
 */
export interface EngineTexturePipelinePolicy {
  /** Preferred GPU compression format. */
  preferredFormat: EngineTextureCompressionFormat;
  /** Fallback format when GPU compression is unavailable. */
  fallbackFormat: EngineTextureCompressionFormat;
  /** Maximum texture resolution (power of 2). */
  maxResolution: number;
  /** Whether mipmap generation is enabled. */
  generateMipmaps: boolean;
  /** Texture anisotropy level (1 = disabled). */
  anisotropy: number;
  /** Whether KTX2/Basis transcoding is preferred over raw formats. */
  preferGpuCompression: boolean;
}

/**
 * Creates the default texture pipeline policy.
 */
export function createDefaultTexturePipelinePolicy(): EngineTexturePipelinePolicy {
  return {
    preferredFormat: "ktx2-basis",
    fallbackFormat: "png",
    maxResolution: 4096,
    generateMipmaps: true,
    anisotropy: 4,
    preferGpuCompression: true,
  };
}

/**
 * Resolves the effective texture format based on GPU capability and policy.
 * @param policy Texture pipeline policy.
 * @param supportsKtx2 Whether the GPU supports KTX2/Basis transcoding.
 */
export function resolveEffectiveTextureFormat(
  policy: EngineTexturePipelinePolicy,
  supportsKtx2: boolean,
): EngineTextureCompressionFormat {
  if (policy.preferGpuCompression && supportsKtx2) {
    return policy.preferredFormat;
  }
  return policy.fallbackFormat;
}
