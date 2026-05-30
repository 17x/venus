import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBackendSelection,
  resolveBackendSelectionFromProtocol,
  type EngineBackendProbe,
} from "../platform/protocol/backend/backend-selection";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies protocol backend-selection contract preserves canonical selector behavior.
 */
test("protocol backend selection remains canonical-equivalent", () => {
  const probes: readonly EngineBackendProbe[] = [
    {
      mode: "webgpu",
      canUse: () => false,
    },
    {
      mode: "webgl",
      canUse: () => false,
    },
    {
      mode: "canvas2d",
      canUse: () => true,
    },
    {
      mode: "headless",
      canUse: () => true,
    },
  ];
  const options = {
    backend: "auto" as const,
    surface: {
      width: 320,
      height: 180,
    },
  };

  const fromProtocol = resolveBackendSelectionFromProtocol(options, probes);
  const fromCanonical = resolveBackendSelection(options, probes);

  assert.deepEqual(fromProtocol, fromCanonical);
  assert.equal(fromProtocol.resolved, "canvas2d");
  assert.equal(fromProtocol.fallbackReason, "auto-priority-canvas2d");
});

/**
 * Verifies requested backend fallback records deterministic diagnostics fields.
 */
test("protocol backend selection records unsupported requested backend fallback", () => {
  const probes: readonly EngineBackendProbe[] = [
    { mode: "webgpu", canUse: () => false },
    { mode: "webgl", canUse: () => true },
    { mode: "canvas2d", canUse: () => true },
    { mode: "headless", canUse: () => true },
  ];
  const selection = resolveBackendSelectionFromProtocol(
    {
      backend: "webgpu",
      surface: { width: 640, height: 360 },
    },
    probes,
  );

  assert.deepEqual(selection, {
    requested: "webgpu",
    resolved: "webgl",
    fallbackReason: "requested-unsupported-webgpu-fallback-webgl",
    nativeEligible: true,
  });
});

/**
 * Verifies runtime capture/readback APIs expose deterministic diagnostics payloads.
 */
test("runtime backend capture and readback diagnostics stay deterministic", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 180),
    backend: "headless",
  });
  const resource = engine.runtime.createGpuResource({
    id: "diagnostic-resource",
    kind: "texture",
    sizeBytes: 256,
  });
  const update = engine.runtime.updateGpuResource("diagnostic-resource", { sizeBytes: 256 });
  const readback = engine.runtime.readbackResource({ resourceId: "diagnostic-resource" });
  const capture = engine.runtime.captureFrame({ label: "backend-diagnostics" });

  assert.equal(resource.exists, true);
  assert.equal(update.exists, true);
  assert.equal(typeof readback.byteLength, "number");
  assert.equal(readback.resourceId, "diagnostic-resource");
  assert.equal(capture.label, "backend-diagnostics");
  assert.equal(typeof capture.timestampMs, "number");

  engine.dispose();
});
