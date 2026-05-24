import assert from "node:assert/strict";
import test from "node:test";

import type { EngineBackendCreateOptions } from "../backend-contracts";
import { createEngineBackendSelectorModule } from "./backendSelector";

/**
 * Verifies backend-selector module resolves first eligible probe for auto mode.
 */
test("backendSelector module resolves first eligible probe", () => {
  const module = createEngineBackendSelectorModule();
  const options: EngineBackendCreateOptions = {
    backend: "auto",
    surface: {
      width: 1024,
      height: 768,
    },
  };

  const result = module.resolveSelection(options, [
    { mode: "webgpu", canUse: () => false },
    { mode: "webgl", canUse: () => true },
    { mode: "canvas2d", canUse: () => true },
  ]);

  assert.equal(result.resolved, "webgl");
  assert.equal(result.fallbackReason, "auto-priority-webgl");
});

/**
 * Verifies backend-selector module preserves explicit supported backend request.
 */
test("backendSelector module preserves explicit supported backend request", () => {
  const module = createEngineBackendSelectorModule();
  const options: EngineBackendCreateOptions = {
    backend: "headless",
    surface: {
      width: 1920,
      height: 1080,
    },
  };

  const result = module.resolveSelection(options);

  assert.equal(result.requested, "headless");
  assert.equal(result.resolved, "headless");
  assert.equal(result.fallbackReason, null);
});

/**
 * Verifies backend-selector module falls back when explicit backend is unsupported.
 */
test("backendSelector module falls back for unsupported explicit backend", () => {
  const module = createEngineBackendSelectorModule();
  const options: EngineBackendCreateOptions = {
    backend: "webgpu",
    surface: {
      width: 1920,
      height: 1080,
    },
  };

  const result = module.resolveSelection(options, [
    { mode: "webgpu", canUse: () => false },
    { mode: "webgl", canUse: () => true },
    { mode: "canvas2d", canUse: () => true },
    { mode: "headless", canUse: () => true },
  ]);

  assert.equal(result.requested, "webgpu");
  assert.equal(result.resolved, "webgl");
  assert.equal(result.fallbackReason, "requested-unsupported-webgpu-fallback-webgl");
});
