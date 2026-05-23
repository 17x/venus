import assert from "node:assert/strict";
import test from "node:test";

import { createEngine, createTestSurface } from "../../index";

/**
 * Creates a deterministic single-node graph fixture for render/pick chain checks.
 */
function createSingleNodeGraph(nodeId: string, x: number, y: number) {
  return {
    revision: 1,
    nodes: [
      {
        id: nodeId,
        kind: "shape",
        x,
        y,
        z: 0,
        width: 80,
        height: 60,
        depth: 10,
      },
    ],
  };
}

/**
 * Creates a test surface whose canvas context becomes available only after the first probe.
 * @param width Surface width in CSS pixels.
 * @param height Surface height in CSS pixels.
 */
function createLateBoundCanvasSurface(width: number, height: number) {
  let contextBound = false;
  const fakeContext: Pick<CanvasRenderingContext2D, "save" | "restore" | "setTransform" | "clearRect"> = {
    save() {},
    restore() {},
    setTransform() {},
    clearRect() {},
  };
  return {
    surface: {
      width,
      height,
      canvas: {
        width,
        height,
        getContext(contextId: "2d" | "webgl" | "webgl2") {
          if (contextId !== "2d") {
            return null;
          }
          if (!contextBound) {
            return null;
          }
          return fakeContext as CanvasRenderingContext2D;
        },
      },
    },
    /** Enables context availability for subsequent render attempts. */
    bindContext() {
      contextBound = true;
    },
  };
}

/**
 * Creates a stable canvas-backed surface exposing both 2d and webgl contexts.
 * @param width Surface width in CSS pixels.
 * @param height Surface height in CSS pixels.
 */
function createCanvasBackedWebGLSurface(width: number, height: number) {
  const fake2DContext: Pick<CanvasRenderingContext2D, "save" | "restore" | "setTransform" | "clearRect"> = {
    save() {},
    restore() {},
    setTransform() {},
    clearRect() {},
  };
  return {
    width,
    height,
    canvas: {
      width,
      height,
      getContext(contextId: "2d" | "webgl" | "webgl2") {
        if (contextId === "2d") {
          return fake2DContext as CanvasRenderingContext2D;
        }
        if (contextId === "webgl") {
          return {} as WebGLRenderingContext;
        }
        if (contextId === "webgl2") {
          return {} as WebGL2RenderingContext;
        }
        return null;
      },
    },
  };
}

/**
 * Verifies backend render chain remains coherent with pick/submit/frame events.
 */
test("backend render chain stays coherent for canonical backend preferences", async () => {
  const backendPreferences = ["headless", "canvas2d", "webgl", "webgpu"] as const;

  for (const backend of backendPreferences) {
    const engine = createEngine({
      surface: createTestSurface(640, 480),
      backend,
    });

    let beforeSubmitCount = 0;
    let afterSubmitCount = 0;
    let frameCompletedCount = 0;
    let frameFailedCount = 0;
    const diagnosticsWarnings: Array<{
      code?: string;
      stage?: string;
      reason?: string;
      backendMode?: string;
      telemetrySource?: string;
      remediationHint?: string;
    }> = [];

    engine.hooks.beforeSubmit(() => {
      beforeSubmitCount += 1;
    }, { scope: "backend-render-chain" });

    engine.hooks.afterSubmit(() => {
      afterSubmitCount += 1;
    }, { scope: "backend-render-chain" });

    engine.events.on("engine.render.frameCompleted", () => {
      frameCompletedCount += 1;
    }, { scope: "backend-render-chain" });

    engine.events.on("engine.render.frameFailed", () => {
      frameFailedCount += 1;
    }, { scope: "backend-render-chain" });

    engine.events.on("engine.diagnostics.warning", (payload) => {
      const envelope = payload as {
        payload?: {
          code?: string;
          stage?: string;
          reason?: string;
          backendMode?: string;
          telemetrySource?: string;
          remediationHint?: string;
        };
      };
      diagnosticsWarnings.push((envelope.payload ?? {}) as {
        code?: string;
        stage?: string;
        reason?: string;
        backendMode?: string;
        telemetrySource?: string;
        remediationHint?: string;
      });
    }, { scope: "backend-render-chain" });

    engine.mount({ id: `host-${backend}` });
    engine.setGraph(createSingleNodeGraph(`node-${backend}`, 40, 30));

    const pickResult = engine.pick({ x: 48, y: 36 }, { tolerance: 0 });
    const renderResult = await engine.render();
    const diagnostics = engine.getDiagnostics();
    const backendInfo = engine.getBackendInfo();

    assert.equal(pickResult.hits.length > 0, true, `pick should hit at backend preference: ${backend}`);
    assert.equal(renderResult.drawCount > 0, true, `drawCount should be positive at backend preference: ${backend}`);
    assert.equal(renderResult.visibleCount > 0, true, `visibleCount should be positive at backend preference: ${backend}`);
    assert.equal(beforeSubmitCount > 0, true, `beforeSubmit hook should fire at backend preference: ${backend}`);
    assert.equal(afterSubmitCount > 0, true, `afterSubmit hook should fire at backend preference: ${backend}`);
    assert.equal(frameCompletedCount > 0, true, `frameCompleted event should fire at backend preference: ${backend}`);
    assert.equal(frameFailedCount, 0, `frameFailed should not fire at backend preference: ${backend}`);
    assert.equal(renderResult.renderChain?.planReached, true, `render plan stage should be reached at backend preference: ${backend}`);
    assert.equal(renderResult.renderChain?.composeReached, true, `render compose stage should be reached at backend preference: ${backend}`);
    assert.equal(renderResult.renderChain?.submitReached, true, `render submit stage should be reached at backend preference: ${backend}`);
    assert.equal(renderResult.renderChain?.backendPresentReached, true, `backend-present stage should be reached at backend preference: ${backend}`);
    assert.equal(
      renderResult.renderChain?.backendPresentCompleted,
      backend === "canvas2d" ? false : true,
      `backend-present completion should reflect adapter path for backend preference: ${backend}`,
    );
    assert.equal(
      renderResult.renderChain?.backendPresentSkippedReason,
      backend === "canvas2d" ? "missing-context" : null,
      `backend-present skip reason should reflect adapter path for backend preference: ${backend}`,
    );
    assert.equal(renderResult.renderChain?.browserBridgeReachable, true, `browser bridge should be reachable at backend preference: ${backend}`);
    assert.equal(
      renderResult.renderChain?.failedStage,
      backend === "canvas2d" ? "backend-present" : null,
      `failed stage should match present diagnostics for backend preference: ${backend}`,
    );

    assert.equal(diagnostics.renderChain?.planReached, true, `diagnostics plan stage should be true at backend preference: ${backend}`);
    assert.equal(diagnostics.renderChain?.submitReached, true, `diagnostics submit stage should be true at backend preference: ${backend}`);
    assert.equal(diagnostics.renderChain?.backendMode, backendInfo.resolved, `diagnostics backend mode should align with resolved backend for preference ${backend}`);

    const backendPresentWarning = diagnosticsWarnings.find(
      (warning) => warning.code === "ENGINE_RENDER_BACKEND_PRESENT_SKIPPED",
    );
    if (backend === "canvas2d") {
      assert.equal(Boolean(backendPresentWarning), true, "canvas2d path should emit backend-present warning");
      assert.equal(backendPresentWarning?.stage, "backend-present");
      assert.equal(backendPresentWarning?.reason, "missing-context");
      assert.equal(backendPresentWarning?.backendMode, "canvas2d");
      assert.equal(backendPresentWarning?.telemetrySource, "adapter-present");
      assert.equal(typeof backendPresentWarning?.remediationHint, "string");
      assert.equal(diagnostics.lastRenderWarning?.code, "ENGINE_RENDER_BACKEND_PRESENT_SKIPPED");
      assert.equal(diagnostics.lastRenderWarning?.telemetrySource, "adapter-present");
    } else {
      assert.equal(Boolean(backendPresentWarning), false, `backend-present warning should not emit for backend preference: ${backend}`);
      assert.equal(diagnostics.lastRenderWarning, null);
    }

    assert.equal(
      ["headless", "canvas2d", "webgl", "webgpu"].includes(backendInfo.resolved),
      true,
      `resolved backend should stay in canonical backend domain for preference ${backend}`,
    );

    engine.dispose();
  }
});

/**
 * Verifies viewport pressure does not break the baseline pick/render execution chain.
 */
test("pick-hit and render draw remain coherent under aggressive viewport pressure", async () => {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    backend: "headless",
  });

  engine.mount({ id: "host-viewport-mismatch" });
  engine.setGraph(createSingleNodeGraph("node-offscreen", 120, 120));

  // Shrink viewport aggressively so render candidate query excludes node while direct pick still targets node coordinates.
  engine.setView({
    viewportWidth: 1,
    viewportHeight: 1,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });

  const pickResult = engine.pick({ x: 120, y: 120 }, { tolerance: 0 });
  const renderResult = await engine.render();
  const diagnostics = engine.getDiagnostics();

  assert.equal(pickResult.hits.length > 0, true);
  assert.equal(renderResult.drawCount > 0, true);
  assert.equal(renderResult.visibleCount > 0, true);
  assert.equal(renderResult.renderChain?.planReached, true);
  assert.equal(renderResult.renderChain?.submitReached, true);
  assert.equal(renderResult.renderChain?.backendPresentReached, true);
  assert.equal(renderResult.renderChain?.backendPresentCompleted, true);
  assert.equal(renderResult.renderChain?.backendPresentSkippedReason, null);
  assert.equal(renderResult.renderChain?.browserBridgeReachable, true);
  assert.equal(diagnostics.renderChain?.planReached, true);
  assert.equal(diagnostics.renderChain?.browserBridgeReachable, true);

  engine.dispose();
});

/**
 * Reproduces present-path disconnect signature where pick/hit stays positive but backend present cannot commit.
 */
test("unmounted non-headless render flags backend-present stage failure while pick remains positive", async () => {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    backend: "canvas2d",
  });

  let diagnosticsWarningCount = 0;
  const diagnosticsWarnings: Array<{
    code?: string;
    stage?: string;
    reason?: string;
    backendMode?: string;
    telemetrySource?: string;
    remediationHint?: string;
  }> = [];

  engine.events.on("engine.diagnostics.warning", (payload) => {
    diagnosticsWarningCount += 1;
    const envelope = payload as {
      payload?: {
        code?: string;
        stage?: string;
        reason?: string;
        backendMode?: string;
        telemetrySource?: string;
        remediationHint?: string;
      };
    };
    diagnosticsWarnings.push((envelope.payload ?? {}) as {
      code?: string;
      stage?: string;
      reason?: string;
      backendMode?: string;
      telemetrySource?: string;
      remediationHint?: string;
    });
  }, { scope: "backend-render-chain" });

  engine.mount({ id: "host-browser-bridge-repro" });
  engine.unmount();
  engine.setGraph(createSingleNodeGraph("node-unmounted", 36, 24));

  const pickResult = engine.pick({ x: 40, y: 30 }, { tolerance: 0 });
  const renderResult = await engine.render();
  const diagnostics = engine.getDiagnostics();

  assert.equal(pickResult.hits.length > 0, true);
  assert.equal(renderResult.drawCount > 0, true);
  assert.equal(renderResult.visibleCount > 0, true);
  assert.equal(renderResult.renderChain?.mountConnected, false);
  assert.equal(renderResult.renderChain?.backendMode === "headless", false);
  assert.equal(renderResult.renderChain?.browserBridgeReachable, false);
  assert.equal(renderResult.renderChain?.backendPresentCompleted, false);
  assert.equal(renderResult.renderChain?.backendPresentSkippedReason, "missing-context");
  assert.equal(renderResult.renderChain?.failedStage, "backend-present");
  assert.equal(diagnostics.renderChain?.browserBridgeReachable, false);
  assert.equal(diagnostics.renderChain?.backendPresentCompleted, false);
  assert.equal(diagnostics.renderChain?.backendPresentSkippedReason, "missing-context");
  assert.equal(diagnostics.renderChain?.failedStage, "backend-present");
  assert.equal(diagnosticsWarningCount > 0, true);
  const backendPresentWarning = diagnosticsWarnings.find(
    (warning) => warning.code === "ENGINE_RENDER_BACKEND_PRESENT_SKIPPED",
  );
  assert.equal(Boolean(backendPresentWarning), true);
  assert.equal(backendPresentWarning?.stage, "backend-present");
  assert.equal(backendPresentWarning?.reason, "missing-context");
  assert.equal(backendPresentWarning?.backendMode, "canvas2d");
  assert.equal(backendPresentWarning?.telemetrySource, "adapter-present");
  assert.equal(typeof backendPresentWarning?.remediationHint, "string");
  assert.equal(diagnostics.lastRenderWarning?.code, "ENGINE_RENDER_BACKEND_PRESENT_SKIPPED");
  assert.equal(diagnostics.lastRenderWarning?.telemetrySource, "adapter-present");

  engine.dispose();
});

/**
 * Reproduces browser-bridge warning semantics when backend present succeeds but host mount remains disconnected.
 */
test("unmounted webgl render emits structured browser-bridge warning after successful backend present", async () => {
  const engine = createEngine({
    surface: createTestSurface(640, 480),
    backend: "webgl",
  });

  const diagnosticsWarnings: Array<{
    code?: string;
    stage?: string;
    reason?: string;
    backendMode?: string;
    telemetrySource?: string;
    remediationHint?: string;
  }> = [];

  engine.events.on("engine.diagnostics.warning", (payload) => {
    const envelope = payload as {
      payload?: {
        code?: string;
        stage?: string;
        reason?: string;
        backendMode?: string;
        telemetrySource?: string;
        remediationHint?: string;
      };
    };
    diagnosticsWarnings.push((envelope.payload ?? {}) as {
      code?: string;
      stage?: string;
      reason?: string;
      backendMode?: string;
      telemetrySource?: string;
      remediationHint?: string;
    });
  }, { scope: "backend-render-chain" });

  engine.mount({ id: "host-browser-warning-webgl" });
  engine.unmount();
  engine.setGraph(createSingleNodeGraph("node-webgl-unmounted", 52, 42));

  const renderResult = await engine.render();
  const diagnostics = engine.getDiagnostics();

  assert.equal(renderResult.renderChain?.backendPresentCompleted, true);
  assert.equal(renderResult.renderChain?.backendPresentSkippedReason, null);
  assert.equal(renderResult.renderChain?.browserBridgeReachable, false);
  assert.equal(renderResult.renderChain?.failedStage, "browser-bridge");
  assert.equal(diagnostics.renderChain?.failedStage, "browser-bridge");

  const browserWarning = diagnosticsWarnings.find(
    (warning) => warning.code === "ENGINE_RENDER_BROWSER_BRIDGE_DISCONNECTED",
  );
  assert.equal(Boolean(browserWarning), true);
  assert.equal(browserWarning?.stage, "browser-bridge");
  assert.equal(browserWarning?.reason, "mount-disconnected");
  assert.equal(browserWarning?.backendMode, "webgl");
  assert.equal(browserWarning?.telemetrySource, "mount-bridge-check");
  assert.equal(typeof browserWarning?.remediationHint, "string");
  assert.equal(diagnostics.lastRenderWarning?.code, "ENGINE_RENDER_BROWSER_BRIDGE_DISCONNECTED");
  assert.equal(diagnostics.lastRenderWarning?.telemetrySource, "mount-bridge-check");

  engine.dispose();
});

/**
 * Verifies canvas2d render path recovers once a late-bound 2d context becomes available.
 */
test("canvas2d render recovers from missing context when host binds 2d context after bootstrap", async () => {
  const lateBoundSurface = createLateBoundCanvasSurface(640, 480);
  const engine = createEngine({
    surface: lateBoundSurface.surface,
    backend: "canvas2d",
  });

  engine.setGraph(createSingleNodeGraph("node-canvas2d-late-context", 52, 42));

  const firstRender = await engine.render();
  const firstDiagnostics = engine.getDiagnostics();
  lateBoundSurface.bindContext();
  const secondRender = await engine.render();
  const secondDiagnostics = engine.getDiagnostics();

  assert.equal(firstRender.drawCount > 0, true);
  assert.equal(firstRender.renderChain?.backendPresentCompleted, false);
  assert.equal(firstRender.renderChain?.backendPresentSkippedReason, "missing-context");
  assert.equal(firstDiagnostics.lastRenderWarning?.code, "ENGINE_RENDER_BACKEND_PRESENT_SKIPPED");

  assert.equal(secondRender.drawCount > 0, true);
  assert.equal(secondRender.renderChain?.backendPresentCompleted, true);
  assert.equal(secondRender.renderChain?.backendPresentSkippedReason, null);
  assert.equal(secondRender.renderChain?.failedStage, "browser-bridge");
  assert.equal(secondDiagnostics.lastRenderWarning?.code, "ENGINE_RENDER_BROWSER_BRIDGE_DISCONNECTED");

  engine.dispose();
});

/**
 * Verifies webgl backend path commits present on canvas-backed hosts during stub stage.
 */
test("webgl backend commits present on canvas-backed surface via compatibility path", async () => {
  const engine = createEngine({
    surface: createCanvasBackedWebGLSurface(640, 480),
    backend: "webgl",
  });

  engine.mount({ id: "host-webgl-canvas-backed" });
  engine.setGraph(createSingleNodeGraph("node-webgl-canvas-backed", 32, 28));

  const renderResult = await engine.render();
  const diagnostics = engine.getDiagnostics();

  assert.equal(renderResult.drawCount > 0, true);
  assert.equal(renderResult.renderChain?.backendPresentCompleted, true);
  assert.equal(renderResult.renderChain?.backendPresentSkippedReason, null);
  assert.equal(renderResult.renderChain?.browserBridgeReachable, true);
  assert.equal(renderResult.renderChain?.failedStage, null);
  assert.equal(diagnostics.lastRenderWarning, null);

  engine.dispose();
});
