import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseWebGLBackendAdapter,
  createWebGLBackendAdapter,
} from "../adapters/backend/webglBackendAdapter";
import {
  canUseWebGPUBackendAdapter,
  createWebGPUBackendAdapter,
} from "../adapters/backend/webgpuBackendAdapter";

/**
 * Verifies WebGL adapter capability probe resolves from canvas context availability.
 */
test("webgl adapter probe resolves from canvas context availability", () => {
  const webglSurface = {
    width: 200,
    height: 100,
    canvas: {
      width: 200,
      height: 100,
      getContext: (contextId: "2d" | "webgl" | "webgl2") => {
        if (contextId === "webgl2") {
          return {} as WebGL2RenderingContext;
        }
        return null;
      },
    },
  };
  const headlessSurface = {
    width: 200,
    height: 100,
  };

  assert.equal(canUseWebGLBackendAdapter(webglSurface), true);
  assert.equal(canUseWebGLBackendAdapter(headlessSurface), false);
});

/**
 * Verifies WebGPU adapter capability probe resolves from navigator.gpu presence.
 */
test("webgpu adapter probe resolves from navigator gpu availability", () => {
  const originalNavigator = globalThis.navigator;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      gpu: {},
    },
  });
  assert.equal(canUseWebGPUBackendAdapter({ width: 10, height: 10 }), true);

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {},
  });
  assert.equal(canUseWebGPUBackendAdapter({ width: 10, height: 10 }), false);

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: originalNavigator,
  });
});

/**
 * Verifies WebGPU/WebGL adapter stubs expose deterministic backend mode and lifecycle behavior.
 */
test("webgpu and webgl adapter stubs expose deterministic backend behavior", () => {
  const webgpuBackend = createWebGPUBackendAdapter();
  const webglBackend = createWebGLBackendAdapter();

  assert.equal(webgpuBackend.mode, "webgpu");
  assert.equal(webglBackend.mode, "webgl");

  assert.doesNotThrow(() => {
    webgpuBackend.resize({ width: 64, height: 64 });
    webgpuBackend.renderFrame(1);
    webgpuBackend.dispose();

    webglBackend.resize({ width: 64, height: 64 });
    webglBackend.renderFrame(1);
    webglBackend.dispose();
  });
});
