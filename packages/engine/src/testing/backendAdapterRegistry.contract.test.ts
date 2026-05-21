import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultEngineBackendAdapters,
  resolveEngineBackendFromAdapters,
  type EngineBackendAdapter,
} from "../backend/backendAdapterRegistry";
import type { EngineBackend } from "../backend/backend";

/**
 * Verifies default adapter registry includes canonical backend ownership modes.
 */
test("backend adapter registry default modes remain canonical", () => {
  const adapters = createDefaultEngineBackendAdapters();
  assert.deepEqual(
    adapters.map((adapter) => adapter.mode),
    ["canvas2d", "webgpu", "webgl", "headless"],
  );
});

/**
 * Verifies injected fake adapter can deterministically override backend creation for one mode.
 */
test("backend adapter registry resolves injected fake adapter deterministically", () => {
  let renderCount = 0;
  let resizeCount = 0;
  let disposeCount = 0;
  const fakeBackend: EngineBackend = {
    mode: "webgl",
    resize: () => {
      resizeCount += 1;
    },
    renderFrame: () => {
      renderCount += 1;
    },
    dispose: () => {
      disposeCount += 1;
    },
  };
  const fakeAdapters: readonly EngineBackendAdapter[] = [
    {
      mode: "webgl",
      create: () => fakeBackend,
    },
    {
      mode: "headless",
      create: () => ({
        mode: "headless",
        resize: () => {},
        renderFrame: () => {},
        dispose: () => {},
      }),
    },
  ];

  const resolvedBackend = resolveEngineBackendFromAdapters(
    "webgl",
    {
      surface: { width: 64, height: 64 },
    },
    fakeAdapters,
  );

  assert.equal(resolvedBackend, fakeBackend);
  resolvedBackend.resize({ width: 32, height: 32 });
  resolvedBackend.renderFrame(100);
  resolvedBackend.dispose();
  assert.equal(resizeCount, 1);
  assert.equal(renderCount, 1);
  assert.equal(disposeCount, 1);
});

/**
 * Verifies missing adapter mode falls back to deterministic no-op backend.
 */
test("backend adapter registry falls back to no-op backend when mode is missing", () => {
  const resolvedBackend = resolveEngineBackendFromAdapters(
    "webgpu",
    {
      surface: { width: 100, height: 100 },
    },
    [
      {
        mode: "headless",
        create: () => ({
          mode: "headless",
          resize: () => {},
          renderFrame: () => {},
          dispose: () => {},
        }),
      },
    ],
  );

  assert.equal(resolvedBackend.mode, "webgpu");
  assert.doesNotThrow(() => {
    resolvedBackend.resize({ width: 10, height: 10 });
    resolvedBackend.renderFrame(0);
    resolvedBackend.dispose();
  });
});
