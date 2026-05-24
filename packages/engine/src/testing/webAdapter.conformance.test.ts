import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseWebGLBackendAdapter,
  createWebGLBackendAdapter,
} from "../backend/adapters/webglBackendAdapter";
import {
  canUseWebGPUBackendAdapter,
  createWebGPUBackendAdapter,
} from "../backend/adapters/webgpuBackendAdapter";

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

/**
 * Verifies WebGPU/WebGL adapters do not use Canvas2D compatibility draw hooks.
 */
test("webgpu and webgl adapters ignore canvas2d compatibility path", () => {
  let presentAttemptCount = 0;
  let presentCommittedCount = 0;
  const surface = {
    width: 200,
    height: 100,
    canvas: {
      width: 200,
      height: 100,
      getContext: (contextId: "2d" | "webgl" | "webgl2") => {
        if (contextId === "2d") {
          return {
            save() {},
            restore() {},
            setTransform() {},
            clearRect() {},
          } as CanvasRenderingContext2D;
        }
        if (contextId === "webgl2") {
          return {
            viewport() {},
            clearColor() {},
            clear() {},
            COLOR_BUFFER_BIT: 0x4000,
          } as unknown as WebGL2RenderingContext;
        }
        if (contextId === "webgl") {
          return {
            viewport() {},
            clearColor() {},
            clear() {},
            COLOR_BUFFER_BIT: 0x4000,
          } as unknown as WebGLRenderingContext;
        }
        return null;
      },
    },
  };

  const webgpuBackend = createWebGPUBackendAdapter(surface, {
    onPresentAttempt: () => {
      presentAttemptCount += 1;
    },
    onPresentCommitted: () => {
      presentCommittedCount += 1;
    },
  });
  const webglBackend = createWebGLBackendAdapter(surface, {
    onPresentAttempt: () => {
      presentAttemptCount += 1;
    },
    onPresentCommitted: () => {
      presentCommittedCount += 1;
    },
  });

  webgpuBackend.resize(surface);
  webglBackend.resize(surface);
  webgpuBackend.renderFrame(1);
  webglBackend.renderFrame(2);

  assert.equal(presentAttemptCount >= 2, true);
  assert.equal(presentCommittedCount >= 1, true);
});
