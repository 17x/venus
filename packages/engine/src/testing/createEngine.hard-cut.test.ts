import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../index";

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
  let shouldInjectRenderFailure = false;
  let failNextNow = false;
  const runtimeAdapter = {
    requestFrame: (_callback: (timestampMs: number) => void) => 1,
    cancelFrame: (_handle: number) => {},
    // Uses one-shot failure injection so frame start can emit first and failure lands inside render try/catch.
    now: () => {
      if (failNextNow) {
        failNextNow = false;
        throw new Error("hard-cut-render-failure");
      }
      return 128;
    },
  };
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    runtimeAdapter,
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
  let lifecycleDisposedCount = 0;
  let lifecycleBeforeMountCount = 0;
  let lifecycleMountedCount = 0;
  let lifecycleBeforeUnmountCount = 0;
  let lifecycleUnmountedCount = 0;
  let documentGraphSetCount = 0;
  let documentRevisionChangedCount = 0;
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
  let renderBackendSwitchedCount = 0;
  let renderFrameStartedCount = 0;
  let renderFrameFailedCount = 0;
  let renderFrameCompletedCount = 0;
  let sampledFrameCompletedCount = 0;
  let throttledFrameCompletedCount = 0;
  let beforeCompileHookCount = 0;
  let afterSubmitHookCount = 0;
  const listener = () => {};
  // Tracks lifecycle-ready emissions from the strengthened runtime event flow.
  const lifecycleReadyListener = () => {
    lifecycleReadyCount += 1;
  };
  // Tracks lifecycle-disposed emissions from terminal dispose transition.
  const lifecycleDisposedListener = () => {
    lifecycleDisposedCount += 1;
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
  // Tracks document-graphSet emissions from graph replacement operations.
  const documentGraphSetListener = () => {
    documentGraphSetCount += 1;
  };
  // Tracks document-revisionChanged emissions from graph set/patch operations.
  const documentRevisionChangedListener = () => {
    documentRevisionChangedCount += 1;
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
  // Tracks render-backend-switched emissions from backend preference updates.
  const renderBackendSwitchedListener = () => {
    renderBackendSwitchedCount += 1;
  };
  // Tracks frame-started emissions to ensure render start stage is explicitly observable.
  const renderFrameStartedListener = () => {
    renderFrameStartedCount += 1;
    if (shouldInjectRenderFailure) {
      failNextNow = true;
    }
  };
  // Tracks frame-failed emissions to ensure render failure path is observable.
  const renderFrameFailedListener = () => {
    renderFrameFailedCount += 1;
  };
  // Tracks frame-completed emissions for explicit render completion behavior checks.
  const renderFrameCompletedListener = () => {
    renderFrameCompletedCount += 1;
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
  engine.events.on("engine.lifecycle.disposed", lifecycleDisposedListener, { scope: "session" });
  engine.events.on("engine.lifecycle.beforeMount", lifecycleBeforeMountListener, { scope: "session" });
  engine.events.on("engine.lifecycle.mounted", lifecycleMountedListener, { scope: "session" });
  engine.events.on("engine.lifecycle.beforeUnmount", lifecycleBeforeUnmountListener, { scope: "session" });
  engine.events.on("engine.lifecycle.unmounted", lifecycleUnmountedListener, { scope: "session" });
  engine.events.on("engine.document.graphSet", documentGraphSetListener, { scope: "session" });
  engine.events.on("engine.document.revisionChanged", documentRevisionChangedListener, { scope: "session" });
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
  engine.events.on("engine.render.backendSwitched", renderBackendSwitchedListener, { scope: "session" });
  engine.events.on("engine.render.frameStarted", renderFrameStartedListener, { scope: "session" });
  engine.events.on("engine.render.frameFailed", renderFrameFailedListener, { scope: "session" });
  engine.events.on("engine.render.frameCompleted", renderFrameCompletedListener, { scope: "session" });
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
  // Verifies lifecycle.ready obeys event pause/resume gating.
  const lifecycleReadyBaseline = lifecycleReadyCount;
  engine.events.pause("engine.lifecycle.ready");
  await engine.ready();
  assert.equal(lifecycleReadyCount, lifecycleReadyBaseline);
  engine.events.resume("engine.lifecycle.ready");
  await engine.ready();
  assert.equal(lifecycleReadyCount > lifecycleReadyBaseline, true);
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
  engine.setGraph({ nodes: [{ id: "node-doc-1", kind: "shape" }] });
  assert.equal(documentGraphSetCount >= 1, true);
  assert.equal(documentRevisionChangedCount >= 1, true);
  // Verifies document.revisionChanged obeys event pause/resume gating around graph revisions.
  const revisionChangedBaseline = documentRevisionChangedCount;
  engine.events.pause("engine.document.revisionChanged");
  engine.setGraph({ nodes: [{ id: "node-doc-2", kind: "shape" }] });
  assert.equal(documentRevisionChangedCount, revisionChangedBaseline);
  engine.events.resume("engine.document.revisionChanged");
  engine.setGraph({ nodes: [{ id: "node-doc-3", kind: "shape" }] });
  assert.equal(documentRevisionChangedCount > revisionChangedBaseline, true);

  engine.events.pause("engine.document.graphPatched");
  engine.updateGraph({ patches: [{ upsertNodes: [{ id: "node-d", kind: "shape" }] }] });
  assert.equal(graphPatchedCount, 0);
  engine.events.resume("engine.document.graphPatched");
  engine.updateGraph({ patches: [{ upsertNodes: [{ id: "node-e", kind: "shape" }] }] });
  assert.equal(graphPatchedCount, 1);

  await engine.render();
  await engine.render();
  assert.equal(renderFrameStartedCount >= 2, true);
  assert.equal(renderFrameCompletedCount >= 2, true);
  // Verifies frameStarted obeys event pause/resume gating around render boundaries.
  const frameStartedBaseline = renderFrameStartedCount;
  engine.events.pause("engine.render.frameStarted");
  await engine.render();
  assert.equal(renderFrameStartedCount, frameStartedBaseline);
  engine.events.resume("engine.render.frameStarted");
  await engine.render();
  assert.equal(renderFrameStartedCount > frameStartedBaseline, true);
  // Verifies frameCompleted obeys event pause/resume gating around render boundaries.
  const frameCompletedBaseline = renderFrameCompletedCount;
  engine.events.pause("engine.render.frameCompleted");
  await engine.render();
  assert.equal(renderFrameCompletedCount, frameCompletedBaseline);
  engine.events.resume("engine.render.frameCompleted");
  await engine.render();
  assert.equal(renderFrameCompletedCount > frameCompletedBaseline, true);
  // Verifies frameFailed obeys event pause/resume gating around forced render failures.
  const frameFailedBaseline = renderFrameFailedCount;
  engine.events.pause("engine.render.frameFailed");
  shouldInjectRenderFailure = true;
  await assert.rejects(async () => engine.render(), /hard-cut-render-failure/);
  shouldInjectRenderFailure = false;
  assert.equal(renderFrameFailedCount, frameFailedBaseline);
  engine.events.resume("engine.render.frameFailed");
  shouldInjectRenderFailure = true;
  await assert.rejects(async () => engine.render(), /hard-cut-render-failure/);
  shouldInjectRenderFailure = false;
  assert.equal(renderFrameFailedCount >= 1, true);
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
  // Verifies backendSwitched obeys event pause/resume gating around preference changes.
  const backendSwitchedBaseline = renderBackendSwitchedCount;
  engine.events.pause("engine.render.backendSwitched");
  engine.setBackendPreference("canvas2d");
  assert.equal(renderBackendSwitchedCount, backendSwitchedBaseline);
  engine.events.resume("engine.render.backendSwitched");
  engine.setBackendPreference("webgl");
  assert.equal(renderBackendSwitchedCount > backendSwitchedBaseline, true);

  assert.equal(typeof engine.events.getListenerStats().totalListeners, "number");
  engine.events.off("engine.lifecycle.ready", lifecycleReadyListener);
  engine.events.off("engine.lifecycle.beforeMount", lifecycleBeforeMountListener);
  engine.events.off("engine.lifecycle.mounted", lifecycleMountedListener);
  engine.events.off("engine.lifecycle.beforeUnmount", lifecycleBeforeUnmountListener);
  engine.events.off("engine.lifecycle.unmounted", lifecycleUnmountedListener);
  engine.events.off("engine.document.graphSet", documentGraphSetListener);
  engine.events.off("engine.document.revisionChanged", documentRevisionChangedListener);
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
  engine.events.off("engine.render.backendSwitched", renderBackendSwitchedListener);
  engine.events.off("engine.render.frameStarted", renderFrameStartedListener);
  engine.events.off("engine.render.frameFailed", renderFrameFailedListener);
  engine.events.off("engine.render.frameCompleted", renderFrameCompletedListener);
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
  assert.equal(lifecycleDisposedCount >= 1, true);
});
