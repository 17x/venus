import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveBackendSelection,
  resolveBackendSelectionFromProtocol,
  type EngineBackendProbe,
} from "../platform/protocol/backend/backend-selection";

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
