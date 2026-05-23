import type { EngineBackendMode } from "../../../orchestration/api/public-types";

/**
 * Texture compression support snapshot for one resolved backend mode.
 */
export interface EngineTextureCompressionSupport {
  /** Supported compressed texture format identifiers for this backend mode. */
  formats: readonly string[];
  /** Whether runtime must transcode texture payloads before upload. */
  transcodeRequired: boolean;
}

/**
 * Resolves texture compression support from one backend mode.
 * @param mode Active backend mode resolved by runtime backend selection.
 */
export function resolveEngineTextureCompressionSupport(
  mode: EngineBackendMode,
): EngineTextureCompressionSupport {
  if (mode === "webgpu") {
    return {
      formats: ["bc7", "etc2", "astc"],
      transcodeRequired: false,
    };
  }

  if (mode === "webgl") {
    return {
      formats: ["etc1", "etc2", "astc"],
      transcodeRequired: true,
    };
  }

  return {
    formats: [],
    transcodeRequired: false,
  };
}
