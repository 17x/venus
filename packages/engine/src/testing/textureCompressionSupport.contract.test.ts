import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveEngineTextureCompressionSupport,
  resolveEngineTextureCompressionSupportFromSurface,
  resolveEngineTextureCompressionUploadDecision,
} from "../platform/protocol/backend/texture-compression";
import type { EngineSurface } from "../orchestration/api/public-types";

/**
 * Verifies WebGPU texture-compression support keeps direct compressed upload profile.
 */
test("texture compression support resolves WebGPU profile", () => {
  const support = resolveEngineTextureCompressionSupport("webgpu");
  const uploadDecision = resolveEngineTextureCompressionUploadDecision(support);

  assert.deepEqual(support.formats, ["bc7", "etc2", "astc"]);
  assert.equal(support.transcodeRequired, false);
  assert.equal(uploadDecision.path, "direct");
  assert.equal(uploadDecision.fallbackReason, null);
});

/**
 * Verifies WebGPU probe payload from surface overrides default compression support deterministically.
 */
test("texture compression support negotiates WebGPU formats from surface probe", () => {
  const surface = {
    width: 1,
    height: 1,
    webgpuProbe: {
      formats: ["bc7", "astc"],
      transcodeRequired: true,
    },
  } as EngineSurface;
  const support = resolveEngineTextureCompressionSupportFromSurface("webgpu", surface);
  const uploadDecision = resolveEngineTextureCompressionUploadDecision(support);

  assert.deepEqual(support.formats, ["bc7", "astc"]);
  assert.equal(support.transcodeRequired, true);
  assert.equal(uploadDecision.path, "transcode");
  assert.equal(uploadDecision.fallbackReason, "TRANSCODE_REQUIRED_BY_BACKEND");
});

/**
 * Verifies WebGPU surface probe with empty format list falls back to uncompressed path.
 */
test("texture compression support falls back for WebGPU probe without compressed formats", () => {
  const surface = {
    width: 1,
    height: 1,
    webgpuProbe: {
      formats: [],
    },
  } as EngineSurface;
  const support = resolveEngineTextureCompressionSupportFromSurface("webgpu", surface);
  const uploadDecision = resolveEngineTextureCompressionUploadDecision(support);

  assert.deepEqual(support.formats, []);
  assert.equal(support.transcodeRequired, false);
  assert.equal(uploadDecision.path, "uncompressed");
  assert.equal(uploadDecision.fallbackReason, "NO_COMPRESSED_TEXTURE_PATH");
});

/**
 * Verifies WebGL texture-compression support keeps transcode-required profile.
 */
test("texture compression support resolves WebGL profile", () => {
  const support = resolveEngineTextureCompressionSupport("webgl");
  const uploadDecision = resolveEngineTextureCompressionUploadDecision(support);

  assert.deepEqual(support.formats, ["etc1", "etc2", "astc"]);
  assert.equal(support.transcodeRequired, true);
  assert.equal(uploadDecision.path, "transcode");
  assert.equal(uploadDecision.fallbackReason, "TRANSCODE_REQUIRED_BY_BACKEND");
});

/**
 * Verifies canvas2d/headless texture-compression support remains empty and deterministic.
 */
test("texture compression support resolves non-gpu profiles", () => {
  const canvas2dSupport = resolveEngineTextureCompressionSupport("canvas2d");
  const headlessSupport = resolveEngineTextureCompressionSupport("headless");
  const canvas2dDecision = resolveEngineTextureCompressionUploadDecision(canvas2dSupport);
  const headlessDecision = resolveEngineTextureCompressionUploadDecision(headlessSupport);

  assert.deepEqual(canvas2dSupport.formats, []);
  assert.equal(canvas2dSupport.transcodeRequired, false);
  assert.equal(canvas2dDecision.path, "uncompressed");
  assert.equal(canvas2dDecision.fallbackReason, "NO_COMPRESSED_TEXTURE_PATH");
  assert.deepEqual(headlessSupport.formats, []);
  assert.equal(headlessSupport.transcodeRequired, false);
  assert.equal(headlessDecision.path, "uncompressed");
  assert.equal(headlessDecision.fallbackReason, "NO_COMPRESSED_TEXTURE_PATH");
});

/**
 * Verifies WebGL extension negotiation resolves deterministic compressed format list.
 */
test("texture compression support negotiates WebGL formats from surface extensions", () => {
  const surface: EngineSurface = {
    width: 1,
    height: 1,
    canvas: {
      width: 1,
      height: 1,
      getContext: (contextId) => {
        if (contextId === "webgl" || contextId === "webgl2") {
          return {
            getSupportedExtensions: () => [
              "WEBGL_compressed_texture_etc1",
              "WEBGL_compressed_texture_etc",
              "WEBGL_compressed_texture_astc",
            ],
          } as unknown as WebGLRenderingContext;
        }
        return null;
      },
    },
  };
  const support = resolveEngineTextureCompressionSupportFromSurface("webgl", surface);
  const uploadDecision = resolveEngineTextureCompressionUploadDecision(support);

  assert.deepEqual(support.formats, ["etc1", "etc2", "astc"]);
  assert.equal(support.transcodeRequired, true);
  assert.equal(uploadDecision.path, "transcode");
  assert.equal(uploadDecision.fallbackReason, "TRANSCODE_REQUIRED_BY_BACKEND");
});

/**
 * Verifies WebGL extension negotiation falls back to uncompressed path when no extension is present.
 */
test("texture compression support returns uncompressed path without WebGL compression extensions", () => {
  const surface: EngineSurface = {
    width: 1,
    height: 1,
    canvas: {
      width: 1,
      height: 1,
      getContext: (contextId) => {
        if (contextId === "webgl" || contextId === "webgl2") {
          return {
            getSupportedExtensions: () => [],
          } as unknown as WebGLRenderingContext;
        }
        return null;
      },
    },
  };
  const support = resolveEngineTextureCompressionSupportFromSurface("webgl", surface);
  const uploadDecision = resolveEngineTextureCompressionUploadDecision(support);

  assert.deepEqual(support.formats, []);
  assert.equal(support.transcodeRequired, false);
  assert.equal(uploadDecision.path, "uncompressed");
  assert.equal(uploadDecision.fallbackReason, "NO_COMPRESSED_TEXTURE_PATH");
});
