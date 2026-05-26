import assert from "node:assert/strict";
import test from "node:test";

import { createWebGLBackendAdapter } from "../backend/adapters/webglBackendAdapter";

/**
 * Verifies the parity telemetry dashboard exposes the render path classification field.
 */
test("parity telemetry dashboard exposes render path field", () => {
  let lastDiagnostics: { webglRenderPath: string; activeLightCount: number; meshDrawCallCount: number } | null = null;

  const surface = {
    width: 200,
    height: 100,
    canvas: {
      width: 200,
      height: 100,
      getContext: (contextId: "2d" | "webgl" | "webgl2") => {
        if (contextId === "webgl2") {
          return {
            viewport() {},
            clearColor() {},
            clear() {},
            COLOR_BUFFER_BIT: 0x4000,
          } as unknown as WebGL2RenderingContext;
        }
        return null;
      },
    },
  };

  const backend = createWebGLBackendAdapter(surface, {
    onBackendDiagnostics: (diagnostics) => {
      lastDiagnostics = diagnostics;
    },
    resolveNativeFramePayload: () => ({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rects: [],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.ok(lastDiagnostics !== null, "diagnostics must be emitted");
  assert.ok(
    ["model-complete", "packet", "none"].includes(lastDiagnostics!.webglRenderPath),
    "webglRenderPath must be a recognized render path token",
  );
  assert.equal(typeof lastDiagnostics!.activeLightCount, "number");
  assert.equal(typeof lastDiagnostics!.meshDrawCallCount, "number");
});

/**
 * Verifies active light count defaults to zero when no lights are registered.
 */
test("parity telemetry reports zero active lights by default", () => {
  let lastDiagnostics: { activeLightCount: number } | null = null;

  const surface = {
    width: 200,
    height: 100,
    canvas: {
      width: 200,
      height: 100,
      getContext: (contextId: "2d" | "webgl" | "webgl2") => {
        if (contextId === "webgl2") {
          return {
            viewport() {},
            clearColor() {},
            clear() {},
            COLOR_BUFFER_BIT: 0x4000,
          } as unknown as WebGL2RenderingContext;
        }
        return null;
      },
    },
  };

  const backend = createWebGLBackendAdapter(surface, {
    onBackendDiagnostics: (diagnostics) => {
      lastDiagnostics = diagnostics;
    },
    resolveNativeFramePayload: () => ({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rects: [],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.equal(lastDiagnostics?.activeLightCount, 0);
});

/**
 * Verifies mesh draw call count reflects submitted native mesh primitives.
 */
test("parity telemetry reports mesh draw call count from native mesh submissions", () => {
  let lastDiagnostics: { meshDrawCallCount: number; webglNativeMeshSubmittedCount: number } | null = null;

  const surface = {
    width: 320,
    height: 200,
    canvas: {
      width: 320,
      height: 200,
      getContext: (contextId: "2d" | "webgl" | "webgl2") => {
        if (contextId !== "webgl2") {
          return null;
        }
        return {
          viewport() {},
          clearColor() {},
          clear() {},
          enable() {},
          disable() {},
          scissor() {},
          createShader() {
            return {} as WebGLShader;
          },
          shaderSource() {},
          compileShader() {},
          createProgram() {
            return {} as WebGLProgram;
          },
          attachShader() {},
          linkProgram() {},
          useProgram() {},
          createBuffer() {
            return {} as WebGLBuffer;
          },
          bindBuffer() {},
          bufferData() {},
          getAttribLocation() {
            return 0;
          },
          enableVertexAttribArray() {},
          vertexAttribPointer() {},
          drawArrays() {},
          getUniformLocation() {
            return {} as WebGLUniformLocation;
          },
          uniform4f() {},
          getShaderParameter() {
            return true;
          },
          getProgramParameter() {
            return true;
          },
          drawingBufferWidth: 320,
          drawingBufferHeight: 200,
          COLOR_BUFFER_BIT: 0x4000,
          SCISSOR_TEST: 0x0c11,
          FRAMEBUFFER: 0x8d40,
          ARRAY_BUFFER: 0x8892,
          STREAM_DRAW: 0x88e0,
          VERTEX_SHADER: 0x8b31,
          FRAGMENT_SHADER: 0x8b30,
          COMPILE_STATUS: 0x8b81,
          LINK_STATUS: 0x8b82,
          FLOAT: 0x1406,
          TRIANGLES: 0x0004,
          bindFramebuffer() {},
          deleteProgram() {},
          deleteBuffer() {},
        } as unknown as WebGL2RenderingContext;
      },
    },
  };

  const backend = createWebGLBackendAdapter(surface, {
    onBackendDiagnostics: (diagnostics) => {
      lastDiagnostics = diagnostics;
    },
    resolveNativeFramePayload: () => ({
      translateX: 0,
      translateY: 0,
      scale: 1,
      rects: [],
      meshes: [
        {
          id: "mesh-a",
          positions: [0, 0, 0, 40, 0, 0, 0, 30, 0, 40, 30, 0],
          indices: [0, 1, 2, 2, 1, 3],
          color: "#22c55e",
        },
      ],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.equal(lastDiagnostics?.webglNativeMeshSubmittedCount, 1);
  assert.equal(lastDiagnostics?.meshDrawCallCount, 1);
});
