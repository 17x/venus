import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

/**
 * Verifies release resource examples use generic runtime residency and decode contracts.
 */
test("resource asset release example tracks compression residency deterministically", () => {
  const engine = createEngine({
    surface: createTestSurface(256, 256),
    backend: "headless",
  });

  const registered = engine.runtime.resource.register({
    id: "resource-example-mesh",
    kind: "mesh",
    sizeBytes: 4096,
    compression: {
      codec: "meshopt",
      payloadBytes: 1024,
      decodedBytesEstimate: 4096,
      policy: {
        payloadKind: "geometry",
        deltaPolicy: "keyframe",
        chunkPolicy: "streaming",
        checkpointMode: "revision",
        decodeContext: {
          interactionActive: true,
          zoomBucket: "mid",
          lodTier: "medium",
        },
      },
    },
  });
  const pinned = engine.runtime.resource.pin("resource-example-mesh");
  const ready = engine.runtime.resource.update("resource-example-mesh", {
    compression: null,
  });
  const residency = engine.runtime.resource.getResidency("resource-example-mesh");

  assert.equal(registered.decodeStatus, "queued");
  assert.equal(registered.decodePrecisionPolicy, "interaction");
  assert.equal(registered.decodeCheckpointMode, "revision");
  assert.equal(pinned.pinned, true);
  assert.equal(ready.decodeStatus, "ready");
  assert.equal(ready.compression, null);
  assert.equal(residency.sizeBytes, 4096);

  engine.dispose();
});
