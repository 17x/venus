import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultTexturePipelinePolicy,
  resolveEffectiveTextureFormat,
} from "./texturePipelinePolicy";

test("default texture policy prefers ktx2-basis", () => {
  const policy = createDefaultTexturePipelinePolicy();
  assert.equal(policy.preferredFormat, "ktx2-basis");
  assert.equal(policy.preferGpuCompression, true);
});

test("resolveEffectiveTextureFormat uses ktx2 when supported and preferred", () => {
  const policy = createDefaultTexturePipelinePolicy();
  assert.equal(resolveEffectiveTextureFormat(policy, true), "ktx2-basis");
});

test("resolveEffectiveTextureFormat falls back to png when ktx2 unsupported", () => {
  const policy = createDefaultTexturePipelinePolicy();
  assert.equal(resolveEffectiveTextureFormat(policy, false), "png");
});
