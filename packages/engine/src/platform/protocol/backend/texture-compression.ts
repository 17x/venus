import type {
  EngineProtocolBackendMode,
  EngineProtocolResolvedBackendMode,
} from "./backend-mode";

/**
 * Minimal surface contract consumed by texture-compression capability probes.
 */
export interface EngineTextureCompressionSurface {
  /** Surface width in CSS pixels. */
  width: number;
  /** Surface height in CSS pixels. */
  height: number;
  /** Optional canvas-like host handle used for WebGL extension probes. */
  canvas?: {
    /** Canvas width in device pixels. */
    width: number;
    /** Canvas height in device pixels. */
    height: number;
    /** Resolves one rendering context by id. */
    getContext: (
      contextId: "2d" | "webgl" | "webgl2",
    ) => CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext | null;
  };
  /**
   * Optional WebGPU compression probe payload from host adapters.
   * AI-TEMP: Adapter-level probe bridge until runtime WebGPU feature probing is unified; remove when WebGPU capability API is centralized; ref DEX-035.
   */
  webgpuProbe?: EngineTextureCompressionWebgpuProbe;
}

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
 * Upload-path decision resolved from backend texture-compression support.
 */
export interface EngineTextureCompressionUploadDecision {
  /** Resolved upload path for texture payloads on the active backend. */
  path: "direct" | "transcode" | "uncompressed";
  /** Optional reason describing why fallback path was selected. */
  fallbackReason: string | null;
}

/**
 * WebGL extension name list used for compressed-texture capability negotiation.
 */
export interface EngineTextureCompressionWebglExtensionProbe {
  /** Canonical extension names currently exposed by host WebGL context. */
  names: readonly string[];
}

/**
 * WebGPU probe payload for compressed texture format negotiation.
 */
export interface EngineTextureCompressionWebgpuProbe {
  /** Supported compressed texture format identifiers reported by host adapter. */
  formats: readonly string[];
  /** Whether runtime transcode is required for this host feature set. */
  transcodeRequired?: boolean;
}

/**
 * Resolves a WebGL extension-name snapshot from the provided surface.
 * @param surface Engine surface that may expose a WebGL context.
 */
function resolveWebglCompressionExtensionProbe(
  surface: EngineTextureCompressionSurface,
): EngineTextureCompressionWebglExtensionProbe {
  const canvas = surface.canvas;
  if (!canvas) {
    return { names: [] };
  }

  const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  const webglContext = context as Pick<WebGLRenderingContext, "getSupportedExtensions"> | null;
  if (!webglContext || typeof webglContext.getSupportedExtensions !== "function") {
    return { names: [] };
  }

  const names = webglContext.getSupportedExtensions();
  return {
    names: Array.isArray(names) ? names : [],
  };
}

/**
 * Resolves deterministic WebGL compressed-texture format list from extension names.
 * @param probe WebGL extension-name probe snapshot.
 */
function resolveWebglCompressionFormatsFromExtensions(
  probe: EngineTextureCompressionWebglExtensionProbe,
): readonly string[] {
  const extensionSet = new Set(probe.names);
  const formats: string[] = [];

  if (extensionSet.has("WEBGL_compressed_texture_etc1")) {
    formats.push("etc1");
  }
  if (
    extensionSet.has("WEBGL_compressed_texture_etc")
    || extensionSet.has("WEBGL_compressed_texture_es3_0")
  ) {
    formats.push("etc2");
  }
  if (extensionSet.has("WEBGL_compressed_texture_astc")) {
    formats.push("astc");
  }
  if (extensionSet.has("EXT_texture_compression_bptc")) {
    formats.push("bc7");
  }

  return formats;
}

/**
 * Resolves deterministic WebGPU compression support from host probe payload.
 * @param probe Optional WebGPU probe payload from surface adapter.
 */
function resolveWebgpuCompressionSupportFromProbe(
  probe?: EngineTextureCompressionWebgpuProbe,
): EngineTextureCompressionSupport {
  if (!probe) {
    return resolveEngineTextureCompressionSupport("webgpu");
  }

  const normalizedFormats = [...new Set(probe.formats.filter((format) => typeof format === "string" && format.length > 0))];
  if (normalizedFormats.length === 0) {
    return {
      formats: [],
      transcodeRequired: false,
    };
  }

  return {
    formats: normalizedFormats,
    transcodeRequired: probe.transcodeRequired === true,
  };
}

/**
 * Resolves texture compression support from one backend mode.
 * @param mode Active backend mode resolved by runtime backend selection.
 */
export function resolveEngineTextureCompressionSupport(
  mode: EngineProtocolBackendMode,
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

/**
 * Resolves texture-compression support by backend mode plus host extension probe.
 * @param mode Active backend mode resolved by runtime backend selection.
 * @param surface Engine surface used for host extension negotiation.
 */
export function resolveEngineTextureCompressionSupportFromSurface(
  mode: EngineProtocolResolvedBackendMode,
  surface: EngineTextureCompressionSurface,
): EngineTextureCompressionSupport {
  if (mode === "webgpu") {
    return resolveWebgpuCompressionSupportFromProbe(surface.webgpuProbe);
  }

  if (mode !== "webgl") {
    return resolveEngineTextureCompressionSupport(mode);
  }

  const formats = resolveWebglCompressionFormatsFromExtensions(
    resolveWebglCompressionExtensionProbe(surface),
  );
  if (formats.length === 0) {
    return {
      formats: [],
      transcodeRequired: false,
    };
  }

  return {
    formats,
    transcodeRequired: true,
  };
}

/**
 * Resolves upload-path decision from texture-compression support snapshot.
 * @param support Texture-compression support snapshot for active backend mode.
 */
export function resolveEngineTextureCompressionUploadDecision(
  support: EngineTextureCompressionSupport,
): EngineTextureCompressionUploadDecision {
  if (support.formats.length === 0) {
    return {
      path: "uncompressed",
      fallbackReason: "NO_COMPRESSED_TEXTURE_PATH",
    };
  }

  if (support.transcodeRequired) {
    return {
      path: "transcode",
      fallbackReason: "TRANSCODE_REQUIRED_BY_BACKEND",
    };
  }

  return {
    path: "direct",
    fallbackReason: null,
  };
}
