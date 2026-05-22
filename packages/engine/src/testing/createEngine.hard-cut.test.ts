import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";
import type { EngineDocumentSnapshot } from "../document/document-contracts";

/**
 * Builds deterministic runtime adapter used by hard-cut API parity tests.
 * @param now Fixed timestamp returned by runtime adapter.
 */
function createDeterministicRuntimeAdapter(now: number) {
  return {
    requestFrame: (_callback: (timestampMs: number) => void) => 1,
    cancelFrame: (_handle: number) => {},
    now: () => now,
  };
}

/**
 * Verifies canonical engine handle exposes hard-cut API surface and deterministic behavior.
 */
test("createEngine hard-cut API parity", async () => {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    runtimeAdapter: createDeterministicRuntimeAdapter(128),
  });

  await engine.ready();
  engine.mount({ id: "host-a" });
  engine.configure({ quality: "balanced" });
  assert.equal(typeof engine.getConfig().quality, "string");
  engine.resetConfig();

  engine.setGraph({
    revision: 1,
    nodes: [
      { id: "node-a", kind: "shape", x: 0, y: 0, z: 0, width: 100, height: 60, depth: 20 },
      { id: "node-b", kind: "shape", x: 300, y: 200, z: 40, width: 80, height: 80, depth: 30 },
    ],
  });

  const queryResult = engine.query({ x: -10, y: -10, width: 150, height: 120 });
  assert.deepEqual(queryResult.nodeIds, ["node-a"]);

  const pickResult = engine.pick({ x: 40, y: 30 }, { tolerance: 10 });
  assert.equal(pickResult.hits[0]?.id, "node-a");

  const rayHit = engine.raycast(
    {
      originX: 10,
      originY: 10,
      originZ: 50,
      directionX: 0,
      directionY: 0,
      directionZ: -1,
    },
    { maxDistance: 100 },
  );
  assert.equal(rayHit?.id, "node-a");

  const firstRender = await engine.render();
  assert.equal(firstRender.drawCount >= 1, true);
  assert.equal(firstRender.visibleCount >= 1, true);
  const firstRenderNow = await engine.renderNow();
  assert.equal(firstRenderNow.drawCount >= 1, true);

  const firstDiagnostics = engine.getDiagnostics();
  assert.equal(firstDiagnostics.framePlan?.sceneNodeCount, 2);

  engine.updateGraph({
    patches: [
      {
        revision: 2,
        removeNodeIds: ["node-b"],
      },
    ],
  });

  const secondDiagnostics = engine.getDiagnostics();
  assert.equal(secondDiagnostics.framePlan?.sceneNodeCount, 1);
  assert.equal(Array.isArray(engine.getGraph().nodes), true);
  assert.equal(engine.validateGraph(engine.getGraph()).valid, true);
  assert.equal(Array.isArray(engine.normalizeGraph(engine.getGraph()).nodes), true);
  assert.equal(Array.isArray(engine.exportGraph().nodes), true);
  assert.equal(Array.isArray(engine.importGraph(engine.getGraph()).nodes), true);
  engine.batchUpdateGraph([{ patches: [{ upsertNodes: [{ id: "node-c", kind: "shape" }] }] }]);

  const nextView = engine.setView({
    viewportWidth: 800,
    viewportHeight: 600,
    offsetX: 10,
    offsetY: 20,
    scale: 1.25,
  });
  assert.equal(nextView.viewportWidth, 800);
  assert.equal(nextView.viewportHeight, 600);
  assert.equal(typeof engine.getView().scale, "number");
  assert.equal(typeof engine.fitToBounds({ x: 0, y: 0, width: 20, height: 20 }).offsetX, "number");
  assert.equal(typeof engine.resetView().offsetY, "number");
  engine.setViewportLayout({ mode: "single" });
  assert.equal(typeof engine.getViewportLayout(), "object");
  assert.equal(typeof engine.screenToWorld({ x: 10, y: 10 }).x, "number");
  assert.equal(typeof engine.worldToScreen({ x: 10, y: 10 }).y, "number");
  engine.setQuality("high");
  assert.equal(engine.getQuality(), "high");
  engine.setFrameBudget(12);
  assert.equal(engine.getFrameBudget(), 12);

  engine.setView({
    viewportWidth: 900,
    viewportHeight: 700,
    offsetX: 12,
    offsetY: 24,
  });

  engine.setOverlays([{ id: "overlay-a" }]);
  engine.appendOverlays([{ id: "overlay-b" }]);
  engine.updateOverlay("overlay-b", { label: "patched" });
  engine.removeOverlay("overlay-b");
  engine.setTransformPreview({ kind: "translate" });
  engine.clearTransformPreview();
  engine.setAnnotations([{ id: "anno-a" }]);
  engine.clearAnnotations();
  assert.equal(engine.getDiagnostics().overlays?.count, 1);

  engine.invalidate({
    reason: "scene-dirty",
    region: { x: 0, y: 0, width: 100, height: 100 },
  });
  assert.equal(engine.getDiagnostics().invalidate?.region?.width, 100);

  engine.invalidate({ reason: "manual-test" });
  assert.equal(engine.getDiagnostics().invalidate?.reason, "manual-test");

  assert.equal(Array.isArray(engine.pickRect({ x: 0, y: 0, width: 50, height: 50 }).hits), true);
  assert.equal(
    Array.isArray(engine.pickLasso({ points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }] }).hits),
    true,
  );
  assert.equal(Array.isArray(engine.queryFrustum({}).nodeIds), true);
  engine.setInteractionState({ dragging: true });
  engine.clearInteractionState();

  assert.equal(engine.loadAssets([{ id: "asset-a" }])[0]?.state, "loaded");
  assert.equal(engine.preloadAssets([{ id: "asset-b" }])[0]?.state, "preloaded");
  assert.equal(engine.unloadAssets(["asset-a"])[0]?.state, "unloaded");
  assert.equal(typeof engine.getAssetState("asset-a").state, "string");
  assert.equal(typeof engine.getAssetStats().totalCount, "number");
  engine.setMediaSources([{ id: "media-a" }]);
  engine.seekMedia(100);
  assert.equal(engine.captureImage().mimeType, "image/png");
  assert.equal(typeof engine.captureVideoFrame().timestampMs, "number");

  engine.setBackendPreference("headless");
  assert.equal(typeof engine.getCapabilities().schemaVersion, "number");
  const headlessSession = engine.createHeadlessSession();
  assert.equal(typeof headlessSession.sessionId, "string");
  assert.equal((await engine.renderHeadless()).drawCount >= 0, true);
  assert.equal(engine.destroyHeadlessSession(headlessSession.sessionId).destroyed, true);

  let lifecycleReadyCount = 0;
  let lifecycleBeforeMountCount = 0;
  let lifecycleMountedCount = 0;
  let lifecycleBeforeUnmountCount = 0;
  let lifecycleUnmountedCount = 0;
  let graphPatchedCount = 0;
  let viewChangedCount = 0;
  let viewportResizedCount = 0;
  let interactionStateChangedCount = 0;
  let interactionPickCompletedCount = 0;
  let interactionPickFailedCount = 0;
  let resourceLoadProgressCount = 0;
  let resourceLoadFailedCount = 0;
  let streamingBackpressureCount = 0;
  let diagnosticsWarningCount = 0;
  let diagnosticsTraceReadyCount = 0;
  let diagnosticsCaptureReadyCount = 0;
  let diagnosticsErrorCount = 0;
  let replayStartedCount = 0;
  let replayCompletedCount = 0;
  let replayFailedCount = 0;
  let sampledFrameCompletedCount = 0;
  let throttledFrameCompletedCount = 0;
  let beforeCompileHookCount = 0;
  let afterSubmitHookCount = 0;
  const listener = () => {};
  // Tracks lifecycle-ready emissions from the strengthened runtime event flow.
  const lifecycleReadyListener = () => {
    lifecycleReadyCount += 1;
  };
  // Tracks lifecycle-beforeMount emissions from mount transition.
  const lifecycleBeforeMountListener = () => {
    lifecycleBeforeMountCount += 1;
  };
  // Tracks lifecycle-mounted emissions from mount transition.
  const lifecycleMountedListener = () => {
    lifecycleMountedCount += 1;
  };
  // Tracks lifecycle-beforeUnmount emissions from unmount transition.
  const lifecycleBeforeUnmountListener = () => {
    lifecycleBeforeUnmountCount += 1;
  };
  // Tracks lifecycle-unmounted emissions from unmount transition.
  const lifecycleUnmountedListener = () => {
    lifecycleUnmountedCount += 1;
  };
  // Tracks graph-patched emissions used to verify pause/resume gating behavior.
  const graphPatchedListener = () => {
    graphPatchedCount += 1;
  };
  // Tracks view-changed emissions produced by view mutation APIs.
  const viewChangedListener = () => {
    viewChangedCount += 1;
  };
  // Tracks viewport-resized emissions produced by resize API.
  const viewportResizedListener = () => {
    viewportResizedCount += 1;
  };
  // Tracks interaction-state-changed emissions produced by interaction APIs.
  const interactionStateChangedListener = () => {
    interactionStateChangedCount += 1;
  };
  // Tracks successful pick completion emissions.
  const interactionPickCompletedListener = () => {
    interactionPickCompletedCount += 1;
  };
  // Tracks failed pick emissions.
  const interactionPickFailedListener = () => {
    interactionPickFailedCount += 1;
  };
  // Tracks resource load-progress emissions from asset load/preload operations.
  const resourceLoadProgressListener = () => {
    resourceLoadProgressCount += 1;
  };
  // Tracks resource load-failed emissions from invalid/missing asset operations.
  const resourceLoadFailedListener = () => {
    resourceLoadFailedCount += 1;
  };
  // Tracks streaming backpressure emissions when seeking without active media source.
  const streamingBackpressureListener = () => {
    streamingBackpressureCount += 1;
  };
  // Tracks diagnostics warning emissions when diagnostics are explicitly disabled.
  const diagnosticsWarningListener = () => {
    diagnosticsWarningCount += 1;
  };
  // Tracks diagnostics trace-ready emissions from runtime trace boundaries.
  const diagnosticsTraceReadyListener = () => {
    diagnosticsTraceReadyCount += 1;
  };
  // Tracks diagnostics capture-ready emissions from capture APIs.
  const diagnosticsCaptureReadyListener = () => {
    diagnosticsCaptureReadyCount += 1;
  };
  // Tracks diagnostics-error emissions generated from isolated listener failures.
  const diagnosticsErrorListener = () => {
    diagnosticsErrorCount += 1;
  };
  // Tracks replay-started emissions from token creation.
  const replayStartedListener = () => {
    replayStartedCount += 1;
  };
  // Tracks replay-completed emissions for accepted replay tokens.
  const replayCompletedListener = () => {
    replayCompletedCount += 1;
  };
  // Tracks replay-failed emissions for rejected replay tokens.
  const replayFailedListener = () => {
    replayFailedCount += 1;
  };
  // Intentionally throws to verify listener exception isolation and diagnostics.error emission path.
  const crashingViewChangedListener = () => {
    throw new Error("hard-cut-listener-failure");
  };
  // Tracks sampled frame-completed emissions to ensure sampleRate filtering is active.
  const sampledFrameCompletedListener = () => {
    sampledFrameCompletedCount += 1;
  };
  // Tracks throttled frame-completed emissions to ensure throttle window suppression is active.
  const throttledFrameCompletedListener = () => {
    throttledFrameCompletedCount += 1;
  };
  // Tracks before-compile hook delivery to verify hook-stage registration path.
  const beforeCompileHookListener = () => {
    beforeCompileHookCount += 1;
  };
  // Tracks after-submit hook delivery to verify render-stage hook dispatch path.
  const afterSubmitHookListener = () => {
    afterSubmitHookCount += 1;
  };
  engine.on("evt", listener);
  engine.off("evt", listener);
  engine.once("evt", listener);

  engine.events.on("engine.lifecycle.ready", lifecycleReadyListener, { scope: "session" });
  engine.events.on("engine.lifecycle.beforeMount", lifecycleBeforeMountListener, { scope: "session" });
  engine.events.on("engine.lifecycle.mounted", lifecycleMountedListener, { scope: "session" });
  engine.events.on("engine.lifecycle.beforeUnmount", lifecycleBeforeUnmountListener, { scope: "session" });
  engine.events.on("engine.lifecycle.unmounted", lifecycleUnmountedListener, { scope: "session" });
  engine.events.on("engine.document.graphPatched", graphPatchedListener, { scope: "session" });
  engine.events.on("engine.view.changed", viewChangedListener, { scope: "session" });
  engine.events.on("engine.view.viewportResized", viewportResizedListener, { scope: "session" });
  engine.events.on("engine.interaction.stateChanged", interactionStateChangedListener, { scope: "session" });
  engine.events.on("engine.interaction.pickCompleted", interactionPickCompletedListener, { scope: "session" });
  engine.events.on("engine.interaction.pickFailed", interactionPickFailedListener, { scope: "session" });
  engine.events.on("engine.resource.loadProgress", resourceLoadProgressListener, { scope: "session" });
  engine.events.on("engine.resource.loadFailed", resourceLoadFailedListener, { scope: "session" });
  engine.events.on("engine.streaming.backpressure", streamingBackpressureListener, { scope: "session" });
  engine.events.on("engine.diagnostics.warning", diagnosticsWarningListener, { scope: "session" });
  engine.events.on("engine.diagnostics.traceReady", diagnosticsTraceReadyListener, { scope: "session" });
  engine.events.on("engine.diagnostics.captureReady", diagnosticsCaptureReadyListener, { scope: "session" });
  engine.events.on("engine.diagnostics.error", diagnosticsErrorListener, { scope: "session" });
  engine.events.on("engine.replay.started", replayStartedListener, { scope: "session" });
  engine.events.on("engine.replay.completed", replayCompletedListener, { scope: "session" });
  engine.events.on("engine.replay.failed", replayFailedListener, { scope: "session" });
  engine.events.on("engine.view.changed", crashingViewChangedListener, { scope: "trace" });
  engine.events.on("engine.render.frameCompleted", sampledFrameCompletedListener, {
    sampleRate: 0.5,
    scope: "trace",
  });
  engine.events.on("engine.render.frameCompleted", throttledFrameCompletedListener, {
    throttleMs: 100,
    scope: "trace",
  });
  engine.events.onMany(["engine.render.frameStarted", "engine.render.frameCompleted"], listener, {
    scope: "trace",
  });
  engine.hooks.beforeCompile(beforeCompileHookListener, { scope: "trace" });
  engine.hooks.afterSubmit(afterSubmitHookListener, { scope: "trace" });

  await engine.ready();
  assert.equal(lifecycleReadyCount >= 1, true);
  engine.unmount();
  engine.mount({ id: "host-b" });
  engine.setView({ offsetX: 16, offsetY: 24, scale: 1.1 });
  engine.resize(960, 720);
  engine.setInteractionState({ dragging: true, mode: "batch-25" });
  engine.clearInteractionState();
  engine.pick({ x: 20, y: 20 });
  engine.pick({ x: -9999, y: -9999 });
  engine.loadAssets([{ id: "asset-c" }, { id: "" }]);
  engine.preloadAssets([{ id: "asset-d" }]);
  engine.unloadAssets(["asset-missing"]);
  engine.setMediaSources([]);
  engine.seekMedia(240);
  const traceSession = engine.runtime.observability.startTrace({ name: "hard-cut-trace" });
  engine.runtime.observability.stopTrace(traceSession.traceId);
  engine.runtime.captureCommandTrace({ label: "hard-cut-command-trace" });
  engine.captureFrame();
  assert.equal(lifecycleBeforeMountCount >= 1, true);
  assert.equal(lifecycleMountedCount >= 1, true);
  assert.equal(lifecycleBeforeUnmountCount >= 1, true);
  assert.equal(lifecycleUnmountedCount >= 1, true);

  engine.events.pause("engine.document.graphPatched");
  engine.updateGraph({ patches: [{ upsertNodes: [{ id: "node-d", kind: "shape" }] }] });
  assert.equal(graphPatchedCount, 0);
  engine.events.resume("engine.document.graphPatched");
  engine.updateGraph({ patches: [{ upsertNodes: [{ id: "node-e", kind: "shape" }] }] });
  assert.equal(graphPatchedCount, 1);

  await engine.render();
  await engine.render();
  assert.equal(sampledFrameCompletedCount <= 2, true);
  assert.equal(sampledFrameCompletedCount >= 1, true);
  assert.equal(throttledFrameCompletedCount, 1);
  assert.equal(beforeCompileHookCount >= 2, true);
  assert.equal(afterSubmitHookCount >= 1, true);
  assert.equal(typeof engine.hooks.getStats().totalListeners, "number");
  assert.equal(viewChangedCount >= 1, true);
  assert.equal(viewportResizedCount >= 1, true);
  assert.equal(interactionStateChangedCount >= 1, true);
  assert.equal(interactionPickCompletedCount >= 1, true);
  assert.equal(interactionPickFailedCount >= 1, true);
  assert.equal(resourceLoadProgressCount >= 2, true);
  assert.equal(resourceLoadFailedCount >= 1, true);
  assert.equal(streamingBackpressureCount >= 1, true);
  assert.equal(diagnosticsTraceReadyCount >= 1, true);
  assert.equal(diagnosticsCaptureReadyCount >= 1, true);
  assert.equal(diagnosticsErrorCount >= 1, true);
  engine.setDiagnosticsEnabled(false);
  assert.equal(diagnosticsWarningCount >= 1, true);
  const replayToken = engine.createReplayToken("hard-cut");
  assert.equal(replayStartedCount >= 1, true);
  assert.equal(engine.replay(replayToken.token).accepted, true);
  assert.equal(replayCompletedCount >= 1, true);
  assert.equal(engine.replay("invalid-replay-token").accepted, false);
  assert.equal(replayFailedCount >= 1, true);

  assert.equal(typeof engine.events.getListenerStats().totalListeners, "number");
  engine.events.off("engine.lifecycle.ready", lifecycleReadyListener);
  engine.events.off("engine.lifecycle.beforeMount", lifecycleBeforeMountListener);
  engine.events.off("engine.lifecycle.mounted", lifecycleMountedListener);
  engine.events.off("engine.lifecycle.beforeUnmount", lifecycleBeforeUnmountListener);
  engine.events.off("engine.lifecycle.unmounted", lifecycleUnmountedListener);
  engine.events.off("engine.document.graphPatched", graphPatchedListener);
  engine.events.off("engine.view.changed", viewChangedListener);
  engine.events.off("engine.view.viewportResized", viewportResizedListener);
  engine.events.off("engine.interaction.stateChanged", interactionStateChangedListener);
  engine.events.off("engine.interaction.pickCompleted", interactionPickCompletedListener);
  engine.events.off("engine.interaction.pickFailed", interactionPickFailedListener);
  engine.events.off("engine.resource.loadProgress", resourceLoadProgressListener);
  engine.events.off("engine.resource.loadFailed", resourceLoadFailedListener);
  engine.events.off("engine.streaming.backpressure", streamingBackpressureListener);
  engine.events.off("engine.diagnostics.warning", diagnosticsWarningListener);
  engine.events.off("engine.diagnostics.traceReady", diagnosticsTraceReadyListener);
  engine.events.off("engine.diagnostics.captureReady", diagnosticsCaptureReadyListener);
  engine.events.off("engine.diagnostics.error", diagnosticsErrorListener);
  engine.events.off("engine.replay.started", replayStartedListener);
  engine.events.off("engine.replay.completed", replayCompletedListener);
  engine.events.off("engine.replay.failed", replayFailedListener);
  engine.events.off("engine.view.changed", crashingViewChangedListener);
  engine.events.off("engine.render.frameCompleted", sampledFrameCompletedListener);
  engine.events.off("engine.render.frameCompleted", throttledFrameCompletedListener);
  engine.events.offAll("trace");
  engine.hooks.offAll("trace");

  const extensionRegistration = engine.extension.register({ id: "plugin-a", version: "1.0.0" });
  assert.equal(extensionRegistration.pluginId, "plugin-a");
  assert.equal(Array.isArray(engine.extension.list()), true);
  assert.equal(engine.extension.getState("plugin-a").state, "registered");
  assert.equal(engine.extension.unregister("plugin-a").removed, true);

  const scheduledTask = engine.scheduler.schedule({ kind: "noop" }, { queue: "render", budgetMs: 4 });
  assert.equal(typeof scheduledTask.taskId, "string");
  assert.equal(engine.scheduler.getQueueStats().pending >= 0, true);
  assert.equal(engine.scheduler.cancel(scheduledTask.taskId).cancelled, true);
  assert.equal(engine.scheduler.flush("render").flushed >= 0, true);

  engine.cache.set("scene", "k1", { ok: true }, { tags: ["dirty:geometry"] });
  assert.equal(typeof engine.cache.get("scene", "k1"), "object");
  engine.cache.invalidateByTag("dirty:geometry");
  assert.equal(engine.cache.get("scene", "k1"), undefined);
  assert.equal(typeof engine.cache.getStats("scene").entryCount, "number");

  engine.policy.setRenderPolicy({ mode: "balanced" });
  engine.policy.setResourcePolicy({ budgetMb: 128 });
  engine.policy.setFallbackPolicy({ prefer: "canvas2d" });
  assert.equal(typeof engine.policy.getEffectivePolicy().render, "object");

  engine.security.setTrustLevel("high");
  engine.security.setResourceAccessPolicy({ quota: 10 });
  assert.equal(Array.isArray(engine.security.getAuditLog({ limit: 5 })), true);

  assert.equal(typeof engine.getMetrics().drawCount, "number");
  assert.equal(engine.captureDebugFrame().mimeType, "image/png");
  engine.unmount();
  engine.clearOverlays();
  engine.clearGraph();

  engine.dispose();
});

/**
 * Verifies runtime foundation namespaces expose Batch-1/2/3 minimal callable API set.
 */
test("createEngine runtime foundation namespaces are callable", () => {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    runtimeAdapter: createDeterministicRuntimeAdapter(512),
  });

  const documentRevision = engine.runtime.document.getRevision();
  const schemaVersion = engine.runtime.document.getSchemaVersion();
  assert.equal(typeof documentRevision, "number");
  assert.equal(typeof schemaVersion, "number");
  const createdSnapshot = engine.runtime.document.createSnapshot({
    revision: documentRevision,
    nodes: {},
  });
  const validatedSnapshot = engine.runtime.document.validateSnapshot({
    snapshot: createdSnapshot,
  });
  assert.equal(validatedSnapshot.valid, true);
  const baseSnapshot: EngineDocumentSnapshot = {
    revision: documentRevision,
    nodes: {},
  };
  const targetSnapshot: EngineDocumentSnapshot = {
    revision: documentRevision + 1,
    nodes: {
      "node-a": {
        id: "node-a",
        kind: "shape",
        payload: {
          geometryRevision: 1,
        },
      },
    },
  };
  const documentDiff = engine.runtime.document.diffSnapshots({
    base: baseSnapshot,
    target: targetSnapshot,
  });
  assert.deepEqual(documentDiff.addedNodeIds, ["node-a"]);
  const rebasedChangeSet = engine.runtime.document.rebaseChangeSet({
    baseRevision: documentRevision,
    changeSet: {
      id: "rebase-1",
      operations: [],
    },
  });
  assert.equal(rebasedChangeSet.targetRevision, documentRevision + 1);
  const serializedSnapshot = engine.runtime.document.serializeSnapshot({
    snapshot: targetSnapshot,
  });
  assert.equal(typeof serializedSnapshot.payload, "string");
  const deserializedSnapshot = engine.runtime.document.deserializeSnapshot({
    payload: serializedSnapshot.payload,
  });
  assert.equal(deserializedSnapshot.revision, targetSnapshot.revision);

  const compiledWorld = engine.runtime.world.compileFromDocument({
    snapshot: targetSnapshot,
  });
  const worldSnapshot = engine.runtime.world.getWorldSnapshot();
  const worldEntityResult = engine.runtime.world.queryEntity({ entityId: "node-a" });
  const worldComponentResult = engine.runtime.world.queryComponent({ component: "geometry" });
  const worldStats = engine.runtime.world.getGraphStats();
  const clearedWorld = engine.runtime.world.clear();
  assert.equal(compiledWorld.worldRevision >= 0, true);
  assert.equal(worldEntityResult.found, true);
  assert.equal(worldComponentResult.entityIds.includes("node-a"), true);
  assert.equal(clearedWorld.clearedEntityCount >= 0, true);
  assert.equal(typeof worldSnapshot.worldRevision, "number");
  assert.equal(Array.isArray(worldSnapshot.entities), true);
  assert.equal(worldStats.worldRevision, worldSnapshot.worldRevision);
  assert.equal(worldStats.entityCount, worldSnapshot.entities.length);

  const dirtyStateBefore = engine.runtime.dirty.getState();
  const dirtyStateAfter = engine.runtime.dirty.mark({
    domain: "geometry",
    token: "test-mark",
  });
  const dirtyStateBatch = engine.runtime.dirty.markBatch({
    domains: ["material", "visibility"],
    token: "test-mark-batch",
  });
  const dirtyPendingDomains = engine.runtime.dirty.getPendingDomains();
  const dirtyFlushResult = engine.runtime.dirty.flush({
    domains: ["geometry"],
  });
  const dirtyResetResult = engine.runtime.dirty.reset();
  assert.equal(Array.isArray(dirtyStateBefore.pendingDomains), true);
  assert.equal(dirtyStateAfter.pendingDomains.includes("geometry"), true);
  assert.equal(dirtyStateBatch.pendingDomains.includes("material"), true);
  assert.equal(Array.isArray(dirtyPendingDomains), true);
  assert.equal(dirtyFlushResult.flushedCount >= 0, true);
  assert.equal(dirtyResetResult.reset, true);

  const encoder = engine.runtime.command.createEncoder({ profile: "default" });
  const encoded = engine.runtime.command.encode({
    commands: [
      { id: "cmd-2", kind: "draw", payload: {} },
      { id: "cmd-1", kind: "set-state", payload: {} },
    ],
  });
  assert.equal(typeof encoded.bufferId, "string");
  assert.equal(encoded.commandCount, 2);
  assert.deepEqual(
    encoded.commands.map((command) => command.id),
    ["cmd-1", "cmd-2"],
  );

  const validation = engine.runtime.command.validate({
    commands: encoded.commands,
  });
  const optimized = engine.runtime.command.optimize({
    commands: encoded.commands,
    profile: "balanced",
  });
  const inspected = engine.runtime.command.inspect({
    commands: optimized.commands,
  });
  const replayed = engine.runtime.command.replay({
    commands: optimized.commands,
  });
  assert.equal(typeof encoder.encoderId, "string");
  assert.equal(validation.valid, true);
  assert.equal(inspected.valid, true);
  assert.equal(replayed.replayedCount, optimized.commandCount);

  const availableBackends = engine.runtime.backend.listAvailable();
  const selectedBackend = engine.runtime.backend.select({ preference: "auto" });
  const activeBackend = engine.runtime.backend.getActive();
  const backendCapabilities = engine.runtime.backend.getCapabilities();
  const backendLimits = engine.runtime.backend.getLimits();
  const fallbackTrace = engine.runtime.backend.getFallbackTrace();
  const headlessProbe = engine.runtime.backend.probeHeadless();
  assert.equal(typeof selectedBackend.resolved, "string");
  assert.equal(availableBackends.available.includes(activeBackend.active), true);
  assert.equal(typeof backendCapabilities.compute, "boolean");
  assert.equal(backendLimits.maxTextureSize > 0, true);
  assert.equal(Array.isArray(fallbackTrace.fallbackTrace), true);
  assert.equal(typeof headlessProbe.supported, "boolean");

  const framePlan = engine.runtime.plan.createFramePlan({
    nodeCount: 2,
    viewportWidth: 640,
    viewportHeight: 480,
    interactionActive: false,
  });
  assert.equal(typeof framePlan.planId, "string");
  assert.equal(framePlan.shortlistCandidateRatio >= 0, true);

  const visibilityPlan = engine.runtime.plan.createVisibilityPlan({
    candidateNodeIds: ["node-b", "node-a"],
  });
  assert.deepEqual(visibilityPlan.visibleNodeIds, ["node-a", "node-b"]);

  const roiPlan = engine.runtime.plan.createRoiPlan({
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    margin: 5,
  });
  assert.equal(roiPlan.width, 110);
  assert.equal(engine.runtime.plan.inspect(framePlan).valid, true);

  const resource = engine.runtime.resource.register({
    id: "resource-1",
    kind: "texture",
    sizeBytes: 256,
  });
  assert.equal(resource.id, "resource-1");
  const pinnedResource = engine.runtime.resource.pin("resource-1");
  assert.equal(pinnedResource.pinned, true);
  const unpinnedResource = engine.runtime.resource.unpin("resource-1");
  assert.equal(unpinnedResource.pinned, false);
  const gcResult = engine.runtime.resource.collectGarbage({ budgetBytes: 1024 });
  assert.equal(gcResult.releasedResourceIds.includes("resource-1"), true);

  const traceStart = engine.runtime.observability.startTrace({ name: "hard-cut" });
  const traceGet = engine.runtime.observability.getTrace(traceStart.traceId);
  assert.equal(traceGet.traceId, traceStart.traceId);
  const traceStop = engine.runtime.observability.stopTrace(traceStart.traceId);
  assert.equal(traceStop.durationMs >= 0, true);
  const metricsSnapshot = engine.runtime.observability.getMetricsSnapshot();
  assert.equal(typeof metricsSnapshot.encodedCommandCount, "number");
  const captured = engine.runtime.observability.captureFrame({ label: "hard-cut" });
  assert.equal(captured.label, "hard-cut");
  const replayToken = engine.runtime.observability.createReplayToken("integration");
  const replayResult = engine.runtime.observability.replay(replayToken.token);
  assert.equal(replayResult.accepted, true);

  const directDocumentSnapshot = engine.runtime.getDocumentSnapshot();
  assert.equal(typeof directDocumentSnapshot.revision, "number");
  assert.equal(typeof engine.runtime.getDocumentRevision(), "number");
  const directApplyChangeSet = engine.runtime.applyChangeSet({
    baseRevision: directDocumentSnapshot.revision,
    changeSet: {
      id: "direct-change-set-1",
      operations: [],
    },
  });
  assert.equal(directApplyChangeSet.nextRevision, directDocumentSnapshot.revision + 1);

  const directCompiledWorld = engine.runtime.compileWorld();
  const directWorldSnapshot = engine.runtime.getRuntimeWorld();
  const directWorldStats = engine.runtime.getRuntimeWorldStats();
  assert.equal(typeof directCompiledWorld.worldRevision, "number");
  assert.equal(typeof directWorldSnapshot.worldRevision, "number");
  assert.equal(typeof directWorldStats.entityCount, "number");

  const directDirtyState = engine.runtime.getDirtyState();
  const directMarkDirty = engine.runtime.markDirty("geometry", "direct-mark");
  const directFlushDirty = engine.runtime.flushDirtyState(["geometry"]);
  assert.equal(Array.isArray(directDirtyState.pendingDomains), true);
  assert.equal(directMarkDirty.pendingDomains.includes("geometry"), true);
  assert.equal(directFlushDirty.flushedCount >= 0, true);

  const directIncremental = engine.runtime.scheduleIncrementalCompile({
    reason: "test-direct-incremental",
  });
  const directFull = engine.runtime.forceFullCompile("test-direct-full");
  assert.equal(directIncremental.scheduled, true);
  assert.equal(directFull.reason, "test-direct-full");

  const directRenderPlan = engine.runtime.createRenderPlan({
    nodeCount: 3,
    viewportWidth: 640,
    viewportHeight: 480,
    interactionActive: false,
  });
  const directInspectPlan = engine.runtime.inspectRenderPlan(directRenderPlan);
  const directEncoded = engine.runtime.encodeCommandBuffer({
    commands: [
      { id: "direct-encode-1", kind: "draw", payload: {} },
      { id: "direct-encode-2", kind: "set-state", payload: {} },
    ],
  });
  const directValidated = engine.runtime.validateCommandBuffer({
    commands: directEncoded.commands,
  });
  assert.equal(typeof directRenderPlan.planId, "string");
  assert.equal(directInspectPlan.valid, true);
  assert.equal(directValidated.valid, true);

  const directSubmit = engine.runtime.submit({
    commands: [
      { id: "direct-cmd-1", kind: "draw", payload: {} },
      { id: "direct-cmd-2", kind: "set-state", payload: {} },
    ],
  });
  const directSubmitBatch = engine.runtime.submitBatch([
    {
      commands: [{ id: "direct-batch-cmd-1", kind: "draw", payload: {} }],
    },
    {
      commands: [{ id: "direct-batch-cmd-2", kind: "set-state", payload: {} }],
    },
  ]);
  assert.equal(directSubmit.submittedCount, 2);
  assert.equal(directSubmitBatch.submittedCount, 2);

  const directResource = engine.runtime.createGpuResource({
    id: "direct-resource-1",
    kind: "texture",
    sizeBytes: 512,
  });
  const directResourceUpdate = engine.runtime.updateGpuResource("direct-resource-1", {
    sizeBytes: 1024,
  });
  const directResourceReadback = engine.runtime.readbackResource({
    resourceId: "direct-resource-1",
  });
  const directResourceDestroy = engine.runtime.destroyGpuResource("direct-resource-1");
  assert.equal(directResource.exists, true);
  assert.equal(directResourceUpdate.exists, true);
  assert.equal(directResourceReadback.byteLength, 1024);
  assert.equal(directResourceDestroy.exists, true);

  const directUploadBatch = engine.runtime.createUploadBatch({
    resourceIds: ["res-a", "res-b"],
  });
  const directBarrierPlan = engine.runtime.createBarrierPlan({
    resourceIds: ["res-a", "res-b"],
  });
  const directBarrierApply = engine.runtime.applyBarrierPlan({
    planId: directBarrierPlan.planId,
  });
  assert.equal(directUploadBatch.resourceCount, 2);
  assert.equal(directBarrierPlan.resourceCount, 2);
  assert.equal(directBarrierApply.applied, true);

  const directViewportCandidates = engine.runtime.queryViewportCandidates({
    x: 0,
    y: 0,
    width: 200,
    height: 120,
  });
  const directFrustumSet = engine.runtime.queryFrustumVisibleSet({
    tag: "frustum-test",
  });
  const directSpatialIndex = engine.runtime.querySpatialIndex({
    tag: "spatial-test",
  });
  assert.equal(Array.isArray(directViewportCandidates.nodeIds), true);
  assert.equal(Array.isArray(directFrustumSet.nodeIds), true);
  assert.equal(Array.isArray(directSpatialIndex.nodeIds), true);

  const directBackendState = engine.runtime.getBackendState();
  const directBackendSwitch = engine.runtime.switchBackend("webgpu", {
    reason: "hard-cut-direct-switch",
  });
  const directBackendFallbackHistory = engine.runtime.getBackendFallbackHistory();
  const directBackendDebug = engine.runtime.setBackendDebugOptions({
    strict: true,
  });
  assert.equal(typeof directBackendState.resolved, "string");
  assert.equal(typeof directBackendSwitch.resolved, "string");
  assert.equal(Array.isArray(directBackendFallbackHistory.history), true);
  assert.equal(directBackendDebug.accepted, true);

  const directCaptureFrame = engine.runtime.captureFrame({
    label: "direct-capture",
  });
  const directCommandTrace = engine.runtime.captureCommandTrace({
    label: "direct-trace",
  });
  const directReplayToken = engine.runtime.createReplayToken("direct");
  const directReplay = engine.runtime.replay(directReplayToken.token);
  const directMetrics = engine.runtime.getMetrics();
  const directTrace = engine.runtime.getTrace(directCommandTrace.traceId);
  assert.equal(directCaptureFrame.label, "direct-capture");
  assert.equal(typeof directCommandTrace.traceId, "string");
  assert.equal(directReplay.accepted, true);
  assert.equal(typeof directMetrics.drawCount, "number");
  assert.equal(directTrace.traceId, directCommandTrace.traceId);

  const runtimeNodeTransform = engine.runtime.world.queryNodeTransform({
    x: 10,
    y: 20,
    width: 100,
    height: 80,
    rotation: 15,
  });
  const runtimeSvgTransform = engine.runtime.world.formatNodeSvgTransform(runtimeNodeTransform);
  assert.equal(Array.isArray(runtimeNodeTransform.matrix), true);
  assert.equal(typeof runtimeSvgTransform === "string" || typeof runtimeSvgTransform === "undefined", true);

  const runtimeHitGeometry = engine.runtime.plan.createHitGeometryPayload({
    nodes: [],
    pointer: { x: 0, y: 0 },
  });
  const runtimeHitTolerance = engine.runtime.plan.resolveHitTolerance({
    viewportScale: 2,
    viewportWidth: 640,
    viewportHeight: 480,
  });
  const runtimeFrameRequest = engine.runtime.plan.requestFrame("interactive");
  const runtimeFrameCancel = engine.runtime.plan.cancelFrame(runtimeFrameRequest.requestId);
  const runtimePlanInterval = engine.runtime.plan.setInteractiveInterval(5);
  const runtimePlanSchedulerDiagnostics = engine.runtime.plan.getSchedulerDiagnostics();
  assert.equal(Array.isArray(runtimeHitGeometry.pointHitNodeIds), true);
  assert.equal(runtimeHitTolerance.screenPx >= 0, true);
  assert.equal(runtimeFrameRequest.scheduled, true);
  assert.equal(runtimeFrameCancel.cancelled, true);
  assert.equal(runtimePlanInterval.intervalMs, 5);
  assert.equal(typeof runtimePlanSchedulerDiagnostics.lastQueueWaitMs, "number");

  const capabilitySpatialQuery = engine.capability.spatial.query({
    x: 0,
    y: 0,
    width: 100,
    height: 80,
  });
  const capabilityPick = engine.capability.picking.pick({ x: 10, y: 10 });
  const capabilityRaycast = engine.capability.picking.raycast({
    originX: 0,
    originY: 0,
    originZ: 1,
    directionX: 0,
    directionY: 0,
    directionZ: -1,
  });
  const capabilityHitGeometry = engine.capability.spatial.createHitGeometryPayload({
    nodes: [],
    pointer: { x: 0, y: 0 },
  });
  const capabilityAdaptiveTolerance = engine.capability.picking.getAdaptiveTolerance({
    viewportScale: 1.5,
  });
  const capabilityGeometryTransform = engine.capability.geometry.computeNodeTransform({
    x: 0,
    y: 0,
    width: 40,
    height: 30,
    rotation: 10,
  });
  const capabilityGeometrySvgTransform = engine.capability.geometry.formatNodeSvgTransform(
    capabilityGeometryTransform,
  );
  const capabilityDiagnostics = engine.capability.diagnostics.getSummary();
  const capabilityReplayToken = engine.capability.replay.createToken("capability");
  const capabilityReplayValid = engine.capability.replay.validateToken(capabilityReplayToken.token);
  const capabilityReplayRun = engine.capability.replay.run(capabilityReplayToken.token);
  const capabilityReplayExport = engine.capability.replay.export(capabilityReplayToken.token);
  assert.equal(Array.isArray(capabilitySpatialQuery.nodeIds), true);
  assert.equal(Array.isArray(capabilityPick.hits), true);
  assert.equal(capabilityRaycast === null || typeof capabilityRaycast.id === "string", true);
  assert.equal(Array.isArray(capabilityHitGeometry.selected), true);
  assert.equal(capabilityAdaptiveTolerance.worldPx >= 0, true);
  assert.equal(Array.isArray(capabilityGeometryTransform.inverseMatrix), true);
  assert.equal(
    typeof capabilityGeometrySvgTransform === "string" || typeof capabilityGeometrySvgTransform === "undefined",
    true,
  );
  assert.equal(typeof capabilityDiagnostics.pixelRatio, "number");
  assert.equal(capabilityReplayValid.valid, true);
  assert.equal(capabilityReplayRun.accepted, true);
  assert.equal(capabilityReplayExport.accepted, true);

  engine.dispose();
});