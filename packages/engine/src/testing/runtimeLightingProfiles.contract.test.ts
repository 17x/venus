import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

/**
 * Verifies runtime lighting profiles expose neutral tokens while preserving legacy aliases.
 */
test("runtime lighting profiles prefer neutral tokens and keep legacy aliases compatible", () => {
  const engine = createEngine({ surface: createTestSurface(128, 128) });

  const inspection = engine.runtime.lighting.applyProfile("inspection");
  assert.deepEqual(
    inspection.lights.map((light) => light.id),
    ["inspection-key", "inspection-hemi"],
  );

  const dynamic = engine.runtime.lighting.applyProfile("dynamic");
  assert.deepEqual(
    dynamic.lights.map((light) => light.id),
    ["dynamic-key", "dynamic-bounce", "dynamic-ambient"],
  );

  const legacyEditor = engine.runtime.lighting.applyProfile("editor" as never);
  assert.deepEqual(legacyEditor, inspection);

  const legacyGameplay = engine.runtime.lighting.applyProfile("gameplay" as never);
  assert.deepEqual(legacyGameplay, dynamic);
});
