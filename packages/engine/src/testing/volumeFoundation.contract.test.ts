import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";
import { ENGINE_RUNTIME_VOLUME_FOUNDATION_API } from "../orchestration/runtime/volume/runtime-volume.foundation.contract";

/**
 * Verifies runtime volume foundation APIs expose deterministic slice-plan creation.
 */
test("runtime volume createSlicePlan exposes deterministic slice-plan contract", () => {
  const engine = createEngine({
    surface: createTestSurface(256, 256),
    backend: "headless",
  });

  const api = ENGINE_RUNTIME_VOLUME_FOUNDATION_API.createSlicePlan;
  assert.equal(api.name, "engine.runtime.volume.createSlicePlan");
  assert.equal(api.level, "foundation");
  assert.equal(api.stability, "beta");
  assert.equal(api.errorCodes.includes("ENGINE_VOLUME_INVALID_DESCRIPTOR"), true);
  assert.equal(typeof api.determinism, "string");
  assert.equal(api.determinism.length > 10, true);

  engine.dispose();
});

/**
 * Verifies runtime volume foundation APIs expose deterministic transfer-function contract.
 */
test("runtime volume resolveTransferFunction exposes deterministic transfer-function contract", () => {
  const api = ENGINE_RUNTIME_VOLUME_FOUNDATION_API.resolveTransferFunction;

  assert.equal(api.name, "engine.runtime.volume.resolveTransferFunction");
  assert.equal(api.level, "foundation");
  assert.equal(api.errorCodes.includes("ENGINE_VOLUME_INVALID_DESCRIPTOR"), true);
  assert.equal(typeof api.determinism, "string");
  assert.equal(api.determinism.length > 10, true);
});

/**
 * Verifies runtime volume foundation APIs expose deterministic residency-budget contract.
 */
test("runtime volume resolveResidencyBudget exposes deterministic residency-budget contract", () => {
  const api = ENGINE_RUNTIME_VOLUME_FOUNDATION_API.resolveResidencyBudget;

  assert.equal(api.name, "engine.runtime.volume.resolveResidencyBudget");
  assert.equal(api.level, "foundation");
  assert.equal(typeof api.determinism, "string");
  assert.equal(api.determinism.length > 10, true);
});
