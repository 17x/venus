import assert from "node:assert/strict";
import test from "node:test";

import type { EngineCreateOptions } from "../../orchestration/api/public-types";
import { createEngineBackendSelectorModule } from "./backendSelector";

/**
 * Verifies backend-selector module resolves first eligible probe for auto mode.
 */
test("backendSelector module resolves first eligible probe", () => {
  const module = createEngineBackendSelectorModule();
  const options: EngineCreateOptions = {
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
 * Verifies backend-selector module preserves explicit requested mode when mode is not auto.
 */
test("backendSelector module preserves explicit backend request", () => {
  const module = createEngineBackendSelectorModule();
  const options: EngineCreateOptions = {
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
