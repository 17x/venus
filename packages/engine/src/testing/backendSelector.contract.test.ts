import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultEngineBackendProbes,
  resolveAutoBackendMode,
  resolveBackendSelection,
  type EngineBackendProbe,
} from "../backend/backendSelector";

/**
 * Verifies default backend probe registry keeps architecture-priority order stable.
 */
test("backend selector default probe order remains architecture-priority", () => {
  const probes = createDefaultEngineBackendProbes();
  assert.deepEqual(
    probes.map((probe) => probe.mode),
    ["webgpu", "webgl", "canvas2d", "headless"],
  );
});

/**
 * Verifies custom selector probe registry resolves first eligible backend deterministically.
 */
test("backend selector resolves first eligible probe deterministically", () => {
  const probeCalls: string[] = [];
  const probes: readonly EngineBackendProbe[] = [
    {
      mode: "webgpu",
      canUse: () => {
        probeCalls.push("webgpu");
        return false;
      },
    },
    {
      mode: "webgl",
      canUse: () => {
        probeCalls.push("webgl");
        return true;
      },
    },
    {
      mode: "canvas2d",
      canUse: () => {
        probeCalls.push("canvas2d");
        return true;
      },
    },
  ];

  const resolved = resolveAutoBackendMode({ width: 100, height: 100 }, probes);
  assert.equal(resolved, "webgl");
  assert.deepEqual(probeCalls, ["webgpu", "webgl"]);
});

/**
 * Verifies backend selection keeps explicit mode requests outside auto-probe execution.
 */
test("backend selector preserves explicit requested mode", () => {
  const result = resolveBackendSelection({
    backend: "headless",
    surface: {
      width: 320,
      height: 240,
    },
  });

  assert.equal(result.requested, "headless");
  assert.equal(result.resolved, "headless");
  assert.equal(result.fallbackReason, null);
  assert.equal(result.nativeEligible, true);
});
