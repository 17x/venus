import assert from "node:assert/strict";
import test from "node:test";
import { createEngine, createTestSurface } from "../index";

/**
 * Verifies game editor-runtime isomorphism keeps authoring preview deterministic.
 */
test("game editor authoring preview keeps incremental compile output deterministic", () => {
  const createPreview = () => {
    const engine = createEngine({
      surface: createTestSurface(480, 320),
      backend: "headless",
    });

    // Simulate game level editor with authored scene graph
    engine.setGraph({
      revision: 1,
      nodes: [
        { id: "terrain-floor", kind: "shape", x: 0, y: 200, width: 480, height: 120 },
        { id: "wall-left", kind: "shape", x: 0, y: 80, width: 20, height: 120 },
        { id: "wall-right", kind: "shape", x: 460, y: 80, width: 20, height: 120 },
        { id: "player-spawn", kind: "shape", x: 200, y: 180, width: 10, height: 20 },
        { id: "enemy-1", kind: "shape", x: 100, y: 170, width: 12, height: 18 },
        { id: "enemy-2", kind: "shape", x: 350, y: 140, width: 12, height: 18 },
        { id: "pickup-health", kind: "shape", x: 50, y: 120, width: 8, height: 8 },
        { id: "pickup-ammo", kind: "shape", x: 400, y: 100, width: 8, height: 8 },
      ],
    });

    // Incremental compile: add runtime-only objects
    engine.setGraph({
      revision: 2,
      nodes: [
        { id: "terrain-floor", kind: "shape", x: 0, y: 200, width: 480, height: 120 },
        { id: "wall-left", kind: "shape", x: 0, y: 80, width: 20, height: 120 },
        { id: "wall-right", kind: "shape", x: 460, y: 80, width: 20, height: 120 },
        { id: "player-spawn", kind: "shape", x: 200, y: 180, width: 10, height: 20 },
        { id: "runtime-particle-1", kind: "shape", x: 200, y: 160, width: 4, height: 4 },
        { id: "runtime-particle-2", kind: "shape", x: 220, y: 150, width: 4, height: 4 },
      ],
    });

    const frame = engine.captureFrame({ label: "game-preview" });
    const token = engine.runtime.observability.createReplayToken("game-editor");
    const replay = engine.runtime.observability.replay(token.token);
    const stats = engine.getStats();

    engine.dispose();
    return {
      captureTs: typeof frame.timestampMs === "number",
      replayAccepted: replay.accepted,
      drawCount: stats.lastExecutionDrawCount ?? 0,
    };
  };

  assert.deepEqual(createPreview(), createPreview());
});

/**
 * Verifies runtime preview consistency APIs keep authoring output aligned.
 */
test("game editor runtime preview consistency stays deterministic", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 240),
    backend: "headless",
  });

  // Authoring scene graph
  engine.setGraph({
    revision: 1,
    nodes: [
      { id: "auth-platform", kind: "shape", x: 40, y: 160, width: 240, height: 20 },
      { id: "auth-player", kind: "shape", x: 150, y: 140, width: 16, height: 20 },
    ],
  });

  const frame1 = engine.captureFrame({ label: "auth-preview-1" });
  const frame2 = engine.captureFrame({ label: "auth-preview-2" });

  assert.equal(typeof frame1.timestampMs, "number");
  assert.equal(typeof frame2.timestampMs, "number");
  // Runtime preview frames should be timestamp-ordered
  assert.equal(frame2.timestampMs >= frame1.timestampMs, true);

  engine.dispose();
});

/**
 * Verifies runtime authoring graph parity APIs report deterministic structural equality and diffs.
 */
test("runtime authoring namespace compares graph snapshots and preview tokens deterministically", () => {
  const engine = createEngine({
    surface: createTestSurface(320, 240),
    backend: "headless",
  });

  const authoring = engine.runtime.authoring.createGraphSnapshot({
    graphId: "preview-graph",
    role: "authoring",
    revision: 1,
    nodes: [
      { id: "platform", kind: "shape" },
      { id: "player", kind: "shape" },
    ],
    materials: [{ id: "mat-a" }],
  });
  const runtime = engine.runtime.authoring.createGraphSnapshot({
    graphId: "preview-graph",
    role: "runtime",
    revision: 2,
    nodes: [
      { id: "player", kind: "shape" },
      { id: "platform", kind: "shape" },
    ],
    materials: [{ id: "mat-a" }],
  });

  const matched = engine.runtime.authoring.compareGraphSnapshots({
    authoring: authoring.snapshotId,
    runtime: runtime.snapshotId,
  });
  assert.equal(matched.matching, true);
  assert.equal(matched.revisionDelta, 1);
  assert.deepEqual(matched.sharedNodeIds, ["platform", "player"]);
  assert.deepEqual(matched.addedNodeIds, []);
  assert.deepEqual(matched.removedNodeIds, []);

  const changed = engine.runtime.authoring.compareGraphSnapshots({
    authoring: authoring.snapshotId,
    runtime: {
      graphId: "preview-graph",
      role: "runtime",
      revision: 3,
      nodes: [
        { id: "platform", kind: "shape" },
        { id: "runtime-only", kind: "shape" },
      ],
      materials: [{ id: "mat-b" }],
    },
  });
  assert.equal(changed.matching, false);
  assert.deepEqual(changed.addedNodeIds, ["runtime-only"]);
  assert.deepEqual(changed.removedNodeIds, ["player"]);
  assert.deepEqual(changed.addedMaterialIds, ["mat-b"]);
  assert.deepEqual(changed.removedMaterialIds, ["mat-a"]);

  const previewToken = engine.runtime.authoring.createPreviewToken({
    scope: "preview",
    snapshot: runtime.snapshotId,
    stepIndex: 4,
  });
  assert.equal(previewToken.snapshotId, runtime.snapshotId);
  assert.equal(previewToken.stepIndex, 4);
  assert.equal(previewToken.signature, runtime.signature);
  assert.equal(engine.runtime.authoring.getDiagnostics().previewTokenCount, 1);
  assert.equal(engine.runtime.authoring.getDiagnostics().lastComparisonMatching, false);

  engine.dispose();
});
