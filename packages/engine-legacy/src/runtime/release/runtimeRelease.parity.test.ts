import assert from "node:assert/strict";
import test from "node:test";

import {
  computeEngineCrossBackendSceneParitySuite,
  type EngineCrossBackendSceneParitySample,
} from "./crossBackendSceneParitySuite";
import {
  computeEngineFallbackParityGate2d3d,
  type EngineFallbackParitySample2d3d,
} from "./fallbackParityGate2d3d";

// Intent: guard legacy release parity suite semantics used by cutover parity gate.
test("cross-backend scene parity suite returns true only when all samples preserve parity", () => {
  const passingSamples: EngineCrossBackendSceneParitySample[] = [
    { sceneId: "scene-a", backendPair: "canvas2d:webgl", parityPreserved: true },
    { sceneId: "scene-b", backendPair: "webgl:webgpu", parityPreserved: true },
  ];

  const failingSamples: EngineCrossBackendSceneParitySample[] = [
    { sceneId: "scene-a", backendPair: "canvas2d:webgl", parityPreserved: true },
    { sceneId: "scene-c", backendPair: "canvas2d:webgpu", parityPreserved: false },
  ];

  assert.equal(computeEngineCrossBackendSceneParitySuite(passingSamples), true);
  assert.equal(computeEngineCrossBackendSceneParitySuite(failingSamples), false);
  assert.equal(computeEngineCrossBackendSceneParitySuite([]), false);
});

// Intent: ensure critical fallback mismatch remains a hard parity failure in legacy gate.
test("fallback parity gate fails only when critical samples diverge across 2d/3d", () => {
  const passingSamples: EngineFallbackParitySample2d3d[] = [
    { id: "s1", reason2d: "oom", reason3d: "oom", critical: true },
    { id: "s2", reason2d: "unsupported", reason3d: "fallback", critical: false },
  ];

  const failingSamples: EngineFallbackParitySample2d3d[] = [
    { id: "s1", reason2d: "oom", reason3d: "feature-disabled", critical: true },
  ];

  assert.equal(computeEngineFallbackParityGate2d3d(passingSamples), true);
  assert.equal(computeEngineFallbackParityGate2d3d(failingSamples), false);
});
