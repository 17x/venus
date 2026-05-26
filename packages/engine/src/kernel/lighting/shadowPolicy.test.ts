import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultShadowPolicy, createZeroShadowDiagnostics } from "./shadowPolicy";

test("default shadow policy has shadows disabled", () => {
  const policy = createDefaultShadowPolicy();
  assert.equal(policy.enabled, false);
});

test("default shadow policy uses PCF type at 1024 resolution", () => {
  const policy = createDefaultShadowPolicy();
  assert.equal(policy.type, "pcf");
  assert.equal(policy.mapSize, 1024);
});

test("default shadow policy has sensible bias values", () => {
  const policy = createDefaultShadowPolicy();
  assert.ok(policy.bias > 0 && policy.bias < 0.01);
  assert.ok(policy.normalBias > 0 && policy.normalBias < 0.1);
});

test("zero shadow diagnostics has all zeros", () => {
  const diag = createZeroShadowDiagnostics();
  assert.equal(diag.shadowMapCount, 0);
  assert.equal(diag.shadowDrawCallCount, 0);
  assert.equal(diag.shadowTextureBytes, 0);
});
