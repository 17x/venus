import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

/**
 * Builds deterministic runtime adapter for event pause/resume governance checks.
 */
function createDeterministicRuntimeAdapter() {
  return {
    requestFrame: (_callback: (timestampMs: number) => void) => 1,
    cancelFrame: (_handle: number) => {},
    now: () => 128,
  };
}

/**
 * Verifies document/view/interaction/resource/diagnostics events obey pause/resume gating in a focused test module.
 */
test("createEngine event gating pause/resume for document view interaction resources diagnostics", async () => {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    runtimeAdapter: createDeterministicRuntimeAdapter(),
  });

  await engine.ready();
  engine.mount({ id: "event-gating-host" });
  engine.setGraph({
    nodes: [
      {
        id: "event-node-a",
        kind: "shape",
        x: 0,
        y: 0,
        z: 0,
        width: 120,
        height: 80,
        depth: 10,
      },
    ],
  });

  let documentGraphPatchedCount = 0;
  let viewChangedCount = 0;
  let interactionStateChangedCount = 0;
  let interactionPickCompletedCount = 0;
  let interactionPickFailedCount = 0;
  let queryExecutedCount = 0;
  let queryEmptyCount = 0;
  let resourceLoadProgressCount = 0;
  let resourceLoadFailedCount = 0;
  let streamingBackpressureCount = 0;
  let diagnosticsWarningCount = 0;

  // Tracks document graph patch events for pause/resume gating checks.
  const documentGraphPatchedListener = () => {
    documentGraphPatchedCount += 1;
  };
  // Tracks view changed events for pause/resume gating checks.
  const viewChangedListener = () => {
    viewChangedCount += 1;
  };
  // Tracks interaction state changes for pause/resume gating checks.
  const interactionStateChangedListener = () => {
    interactionStateChangedCount += 1;
  };
  // Tracks successful pick events for pause/resume gating checks.
  const interactionPickCompletedListener = () => {
    interactionPickCompletedCount += 1;
  };
  // Tracks failed pick events for pause/resume gating checks.
  const interactionPickFailedListener = () => {
    interactionPickFailedCount += 1;
  };
  // Tracks query executed events for pause/resume gating checks.
  const queryExecutedListener = () => {
    queryExecutedCount += 1;
  };
  // Tracks query empty events for pause/resume gating checks.
  const queryEmptyListener = () => {
    queryEmptyCount += 1;
  };
  // Tracks resource load progress events for pause/resume gating checks.
  const resourceLoadProgressListener = () => {
    resourceLoadProgressCount += 1;
  };
  // Tracks resource load failure events for pause/resume gating checks.
  const resourceLoadFailedListener = () => {
    resourceLoadFailedCount += 1;
  };
  // Tracks streaming backpressure events for pause/resume gating checks.
  const streamingBackpressureListener = () => {
    streamingBackpressureCount += 1;
  };
  // Tracks diagnostics warning events for pause/resume gating checks.
  const diagnosticsWarningListener = () => {
    diagnosticsWarningCount += 1;
  };

  engine.events.on("engine.document.graphPatched", documentGraphPatchedListener, { scope: "session" });
  engine.events.on("engine.view.changed", viewChangedListener, { scope: "session" });
  engine.events.on("engine.interaction.stateChanged", interactionStateChangedListener, { scope: "session" });
  engine.events.on("engine.interaction.pickCompleted", interactionPickCompletedListener, { scope: "session" });
  engine.events.on("engine.interaction.pickFailed", interactionPickFailedListener, { scope: "session" });
  engine.events.on("engine.query.executed", queryExecutedListener, { scope: "session" });
  engine.events.on("engine.query.empty", queryEmptyListener, { scope: "session" });
  engine.events.on("engine.resource.loadProgress", resourceLoadProgressListener, { scope: "session" });
  engine.events.on("engine.resource.loadFailed", resourceLoadFailedListener, { scope: "session" });
  engine.events.on("engine.streaming.backpressure", streamingBackpressureListener, { scope: "session" });
  engine.events.on("engine.diagnostics.warning", diagnosticsWarningListener, { scope: "session" });

  // Verifies document.graphPatched gating around updateGraph patch operations.
  const graphPatchedBaseline = documentGraphPatchedCount;
  engine.events.pause("engine.document.graphPatched");
  engine.updateGraph({ patches: [{ upsertNodes: [{ id: "event-node-b", kind: "shape" }] }] });
  assert.equal(documentGraphPatchedCount, graphPatchedBaseline);
  engine.events.resume("engine.document.graphPatched");
  engine.updateGraph({ patches: [{ upsertNodes: [{ id: "event-node-c", kind: "shape" }] }] });
  assert.equal(documentGraphPatchedCount > graphPatchedBaseline, true);

  // Verifies view.changed gating around viewport transform updates.
  const viewChangedBaseline = viewChangedCount;
  engine.events.pause("engine.view.changed");
  engine.setView({ offsetX: 12, offsetY: 16, scale: 1.1 });
  assert.equal(viewChangedCount, viewChangedBaseline);
  engine.events.resume("engine.view.changed");
  engine.setView({ offsetX: 20, offsetY: 24, scale: 1.2 });
  assert.equal(viewChangedCount > viewChangedBaseline, true);

  // Verifies interaction.stateChanged gating around interaction state transitions.
  const interactionStateBaseline = interactionStateChangedCount;
  engine.events.pause("engine.interaction.stateChanged");
  engine.setInteractionState({ dragging: true, mode: "event-gating" });
  assert.equal(interactionStateChangedCount, interactionStateBaseline);
  engine.events.resume("engine.interaction.stateChanged");
  engine.clearInteractionState();
  assert.equal(interactionStateChangedCount > interactionStateBaseline, true);

  // Verifies interaction.pickCompleted gating around successful picks.
  const pickCompletedBaseline = interactionPickCompletedCount;
  engine.events.pause("engine.interaction.pickCompleted");
  engine.pick({ x: 20, y: 20 });
  assert.equal(interactionPickCompletedCount, pickCompletedBaseline);
  engine.events.resume("engine.interaction.pickCompleted");
  engine.pick({ x: 20, y: 20 });
  assert.equal(interactionPickCompletedCount > pickCompletedBaseline, true);

  // Verifies interaction.pickFailed gating around failed picks.
  const pickFailedBaseline = interactionPickFailedCount;
  engine.events.pause("engine.interaction.pickFailed");
  engine.pick({ x: -9999, y: -9999 });
  assert.equal(interactionPickFailedCount, pickFailedBaseline);
  engine.events.resume("engine.interaction.pickFailed");
  engine.pick({ x: -9999, y: -9999 });
  assert.equal(interactionPickFailedCount > pickFailedBaseline, true);

  // Verifies query.executed gating around non-empty query results.
  const queryExecutedBaseline = queryExecutedCount;
  engine.events.pause("engine.query.executed");
  engine.query({ x: -10, y: -10, width: 200, height: 120 });
  assert.equal(queryExecutedCount, queryExecutedBaseline);
  engine.events.resume("engine.query.executed");
  engine.query({ x: -10, y: -10, width: 200, height: 120 });
  assert.equal(queryExecutedCount > queryExecutedBaseline, true);

  // Verifies query.empty gating around empty query outcomes.
  const queryEmptyBaseline = queryEmptyCount;
  engine.events.pause("engine.query.empty");
  engine.query({ x: 9999, y: 9999, width: 10, height: 10 });
  assert.equal(queryEmptyCount, queryEmptyBaseline);
  engine.events.resume("engine.query.empty");
  engine.query({ x: 9999, y: 9999, width: 10, height: 10 });
  assert.equal(queryEmptyCount > queryEmptyBaseline, true);

  // Verifies resource.loadProgress gating around successful resource loads.
  const loadProgressBaseline = resourceLoadProgressCount;
  engine.events.pause("engine.resource.loadProgress");
  engine.loadAssets([{ id: "asset-progress-paused" }]);
  assert.equal(resourceLoadProgressCount, loadProgressBaseline);
  engine.events.resume("engine.resource.loadProgress");
  engine.loadAssets([{ id: "asset-progress-resumed" }]);
  assert.equal(resourceLoadProgressCount > loadProgressBaseline, true);

  // Verifies resource.loadFailed gating around invalid resource loads.
  const loadFailedBaseline = resourceLoadFailedCount;
  engine.events.pause("engine.resource.loadFailed");
  engine.loadAssets([{ id: "" }]);
  assert.equal(resourceLoadFailedCount, loadFailedBaseline);
  engine.events.resume("engine.resource.loadFailed");
  engine.loadAssets([{ id: "" }]);
  assert.equal(resourceLoadFailedCount > loadFailedBaseline, true);

  // Verifies streaming.backpressure gating around media seek pressure signals.
  const backpressureBaseline = streamingBackpressureCount;
  engine.setMediaSources([]);
  engine.events.pause("engine.streaming.backpressure");
  engine.seekMedia(240);
  assert.equal(streamingBackpressureCount, backpressureBaseline);
  engine.events.resume("engine.streaming.backpressure");
  engine.seekMedia(480);
  assert.equal(streamingBackpressureCount > backpressureBaseline, true);

  // Verifies diagnostics.warning gating around diagnostics policy transitions.
  const diagnosticsWarningBaseline = diagnosticsWarningCount;
  engine.events.pause("engine.diagnostics.warning");
  engine.setDiagnosticsEnabled(false);
  assert.equal(diagnosticsWarningCount, diagnosticsWarningBaseline);
  engine.events.resume("engine.diagnostics.warning");
  engine.setDiagnosticsEnabled(true);
  engine.setDiagnosticsEnabled(false);
  assert.equal(diagnosticsWarningCount > diagnosticsWarningBaseline, true);

  engine.events.off("engine.document.graphPatched", documentGraphPatchedListener);
  engine.events.off("engine.view.changed", viewChangedListener);
  engine.events.off("engine.interaction.stateChanged", interactionStateChangedListener);
  engine.events.off("engine.interaction.pickCompleted", interactionPickCompletedListener);
  engine.events.off("engine.interaction.pickFailed", interactionPickFailedListener);
  engine.events.off("engine.query.executed", queryExecutedListener);
  engine.events.off("engine.query.empty", queryEmptyListener);
  engine.events.off("engine.resource.loadProgress", resourceLoadProgressListener);
  engine.events.off("engine.resource.loadFailed", resourceLoadFailedListener);
  engine.events.off("engine.streaming.backpressure", streamingBackpressureListener);
  engine.events.off("engine.diagnostics.warning", diagnosticsWarningListener);

  engine.unmount();
  engine.clearGraph();
  engine.dispose();
});
