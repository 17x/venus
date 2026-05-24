import assert from "node:assert/strict";
import test from "node:test";

import { createEngineDocumentStoreModule } from "../kernel/core/document/document-store-module";
import {
  applyDocumentChangeSet,
  createDocumentSnapshot,
  validateDecodedFramePayloadDescriptor,
  validateDecodedFrameTimelineAlignment,
  validateDocumentLinearizedDeltaEnvelope,
} from "../kernel/document/document-store";
import {
  ENGINE_RUNTIME_DOCUMENT_WARNING_CODE,
  ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS,
} from "../kernel/document/document-warning-codes";

/**
 * Verifies core document store module preserves canonical snapshot-creation behavior.
 */
test("document store module snapshot creation parity", () => {
  const module = createEngineDocumentStoreModule();

  const fromModule = module.createSnapshot({
    revision: 7,
    nodes: {
      b: {
        id: "b",
        kind: "shape",
        payload: { transformRevision: 2 },
      },
      a: {
        id: "a",
        kind: "group",
        payload: { transformRevision: 1 },
      },
    },
  });
  const fromStore = createDocumentSnapshot({
    revision: 7,
    nodes: {
      b: {
        id: "b",
        kind: "shape",
        payload: { transformRevision: 2 },
      },
      a: {
        id: "a",
        kind: "group",
        payload: { transformRevision: 1 },
      },
    },
  });

  assert.deepEqual(fromModule, fromStore);
});

/**
 * Verifies core document store module preserves canonical change-set application behavior.
 */
test("document store module change-set apply parity", () => {
  const module = createEngineDocumentStoreModule();
  const initialSnapshot = createDocumentSnapshot({
    revision: 0,
    nodes: {
      nodeA: {
        id: "nodeA",
        kind: "shape",
        payload: { geometryRevision: 1 },
      },
    },
  });
  const changeSet = {
    id: "cs-1",
    operations: [
      {
        type: "upsert-node" as const,
        node: {
          id: "nodeB",
          kind: "text" as const,
          payload: { textRevision: 2 },
        },
      },
      {
        type: "remove-node" as const,
        nodeId: "nodeA",
      },
    ],
  };

  const fromModule = module.applyChangeSet(initialSnapshot, changeSet);
  const fromStore = applyDocumentChangeSet(initialSnapshot, changeSet);

  assert.deepEqual(fromModule, fromStore);
});

/**
 * Verifies linearized envelope validation accepts deterministic adapter payloads.
 */
test("document linearized envelope validation accepts valid payload", () => {
  const validation = validateDocumentLinearizedDeltaEnvelope(
    {
      id: "env-1",
      sourceAdapter: "bim-collab-adapter",
      baseRevision: 3,
      targetRevision: 4,
      sequence: 8,
      producedAtMs: 1716500000000,
      changeSet: {
        id: "cs-env-1",
        targetRevision: 4,
        operations: [
          {
            type: "upsert-node",
            node: {
              id: "node-1",
              kind: "shape",
              payload: { transformRevision: 1 },
            },
          },
        ],
      },
    },
    3,
  );

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.issues, []);
});

/**
 * Verifies linearized envelope validation rejects non-linear or schema-mismatched payloads.
 */
test("document linearized envelope validation rejects invalid payload", () => {
  const validation = validateDocumentLinearizedDeltaEnvelope(
    {
      id: "",
      sourceAdapter: "",
      baseRevision: 10,
      targetRevision: 9,
      sequence: -1,
      changeSet: {
        id: "cs-env-2",
        targetRevision: 11,
        operations: [],
      },
    },
    8,
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.issues.length > 0, true);
  assert.equal(
    validation.issues.some((issue) => issue.includes("does not match expectedBaseRevision")),
    true,
  );
});

/**
 * Verifies decoded-frame payload validation accepts a render-ready adapter descriptor.
 */
test("decoded frame payload validation accepts valid descriptor", () => {
  const validation = validateDecodedFramePayloadDescriptor({
    id: "frame-1",
    sourceAdapter: "video-timeline-adapter",
    trackId: "track-a",
    clipId: "clip-a",
    timestampMs: 2000,
    durationMs: 33.33,
    width: 1920,
    height: 1080,
    pixelFormat: "rgba8-unorm",
    colorSpace: "rec709",
    storageKind: "typed-array",
    byteLength: 8294400,
    keyFrame: true,
  });

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.issues, []);
});

/**
 * Verifies decoded-frame payload validation rejects schema-invalid descriptor fields.
 */
test("decoded frame payload validation rejects invalid descriptor", () => {
  const validation = validateDecodedFramePayloadDescriptor({
    id: "",
    sourceAdapter: "",
    trackId: "",
    clipId: "",
    timestampMs: -1,
    durationMs: 0,
    width: 0,
    height: -3,
    pixelFormat: "rgba8-unorm",
    colorSpace: "srgb",
    storageKind: "typed-array",
    byteLength: 0,
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.issues.length > 0, true);
  assert.equal(
    validation.issues.includes("payload.timestampMs must be a finite non-negative number"),
    true,
  );
});

/**
 * Verifies decoded-frame timeline alignment checks pass for monotonic and low-drift timestamps.
 */
test("decoded frame timeline alignment accepts monotonic low-drift payload", () => {
  const validation = validateDecodedFrameTimelineAlignment(
    {
      id: "frame-2",
      sourceAdapter: "video-timeline-adapter",
      trackId: "track-a",
      clipId: "clip-a",
      timestampMs: 2033.33,
      durationMs: 33.33,
      width: 1920,
      height: 1080,
      pixelFormat: "rgba8-unorm",
      colorSpace: "rec709",
      storageKind: "typed-array",
      byteLength: 8294400,
    },
    {
      previousTimestampMs: 2000,
      expectedTimelineTimestampMs: 2032,
      maxAllowedDriftMs: 34,
    },
  );

  assert.equal(validation.valid, true);
  assert.equal(validation.absoluteDriftMs !== null, true);
  assert.deepEqual(validation.issues, []);
});

/**
 * Verifies decoded-frame timeline alignment checks reject non-monotonic and high-drift timestamps.
 */
test("decoded frame timeline alignment rejects non-monotonic high-drift payload", () => {
  const validation = validateDecodedFrameTimelineAlignment(
    {
      id: "frame-3",
      sourceAdapter: "video-timeline-adapter",
      trackId: "track-a",
      clipId: "clip-a",
      timestampMs: 1500,
      durationMs: 33.33,
      width: 1280,
      height: 720,
      pixelFormat: "bgra8-unorm",
      colorSpace: "srgb",
      storageKind: "image-bitmap",
      byteLength: 3686400,
    },
    {
      previousTimestampMs: 2000,
      expectedTimelineTimestampMs: 2100,
      maxAllowedDriftMs: 20,
    },
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.issues.length >= 2, true);
  assert.equal(
    validation.issues.some((issue) => issue.includes("is lower than previousTimestampMs")),
    true,
  );
  assert.equal(
    validation.issues.some((issue) => issue.includes("exceeds maxAllowedDriftMs")),
    true,
  );
});

/**
 * Verifies runtime warning code baseline requirement mapping covers all codes with non-empty requirement sets.
 */
test("runtime document warning code baseline mapping stays complete", () => {
  const warningCodes = Object.values(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE).sort();
  const baselineCodes = Object.keys(ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS).sort();

  assert.deepEqual(baselineCodes, warningCodes);

  for (const warningCode of warningCodes) {
    const requirementIds = ENGINE_RUNTIME_DOCUMENT_WARNING_CODE_BASELINE_REQUIREMENTS[warningCode];
    assert.equal(requirementIds.length > 0, true);
  }
});
