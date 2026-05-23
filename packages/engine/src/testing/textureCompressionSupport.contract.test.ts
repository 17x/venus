import assert from "node:assert/strict";
import test from "node:test";

import { resolveEngineTextureCompressionSupport } from "../platform/protocol/backend/texture-compression";

/**
 * Verifies WebGPU texture-compression support keeps direct compressed upload profile.
 */
test("texture compression support resolves WebGPU profile", () => {
  const support = resolveEngineTextureCompressionSupport("webgpu");

  assert.deepEqual(support.formats, ["bc7", "etc2", "astc"]);
  assert.equal(support.transcodeRequired, false);
});

/**
 * Verifies WebGL texture-compression support keeps transcode-required profile.
 */
test("texture compression support resolves WebGL profile", () => {
  const support = resolveEngineTextureCompressionSupport("webgl");

  assert.deepEqual(support.formats, ["etc1", "etc2", "astc"]);
  assert.equal(support.transcodeRequired, true);
});

/**
 * Verifies canvas2d/headless texture-compression support remains empty and deterministic.
 */
test("texture compression support resolves non-gpu profiles", () => {
  const canvas2dSupport = resolveEngineTextureCompressionSupport("canvas2d");
  const headlessSupport = resolveEngineTextureCompressionSupport("headless");

  assert.deepEqual(canvas2dSupport.formats, []);
  assert.equal(canvas2dSupport.transcodeRequired, false);
  assert.deepEqual(headlessSupport.formats, []);
  assert.equal(headlessSupport.transcodeRequired, false);
});
