import assert from "node:assert/strict";
import test from "node:test";

import { resolveLightingQualityPolicy } from "./lightingQualityTiers";

test("low pressure resolves to high quality tier", () => {
  const policy = resolveLightingQualityPolicy("low");
  assert.equal(policy.tier, "high");
  assert.equal(policy.maxShadowLights, 4);
  assert.equal(policy.maxTotalLights, 16);
  assert.equal(policy.shadowResolutionDivisor, 1);
});

test("medium pressure resolves to medium quality tier", () => {
  const policy = resolveLightingQualityPolicy("medium");
  assert.equal(policy.tier, "medium");
  assert.equal(policy.maxShadowLights, 2);
  assert.equal(policy.shadowResolutionDivisor, 2);
});

test("high pressure resolves to low quality tier with no shadows", () => {
  const policy = resolveLightingQualityPolicy("high");
  assert.equal(policy.tier, "low");
  assert.equal(policy.maxShadowLights, 0);
  assert.equal(policy.maxTotalLights, 4);
  assert.equal(policy.shadowResolutionDivisor, 4);
});
