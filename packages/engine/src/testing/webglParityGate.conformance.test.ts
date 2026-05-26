import assert from "node:assert/strict";
import test from "node:test";

import { createWebGLBackendAdapter } from "../backend/adapters/webglBackendAdapter";

/**
 * Verifies the WebGL backend emits all parity-relevant diagnostics fields required
 * by the backend tier policy (Tier 1 — Primary).
 */
test("webgl backend emits complete parity diagnostics for tier-1 compliance", () => {
  let lastDiagnostics: Record<string, unknown> | null = null;

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
          LINES: 0x0001,
          bindFramebuffer() {},
          deleteProgram() {},
          deleteBuffer() {},
        } as unknown as WebGL2RenderingContext;
      },
    },
  };

  const backend = createWebGLBackendAdapter(surface, {
    onBackendDiagnostics: (diagnostics) => {
      lastDiagnostics = diagnostics as Record<string, unknown>;
    },
    resolveNativeFramePayload: () => ({
      translateX: 0,
      translateY: 0,
      scale: 1,
      lineTopologySubmissionEnabled: true,
      rects: [],
      meshes: [
        {
          id: "mesh-parity-check",
          positions: [0, 0, 0, 40, 0, 0, 0, 30, 0, 40, 30, 0],
          indices: [0, 1, 2, 2, 1, 3],
          color: "#22c55e",
        },
      ],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.ok(lastDiagnostics !== null, "WebGL backend must emit diagnostics");

  // Tier 1 parity fields that must be present (per backend-tier-policy.md).
  const requiredFields = [
    "webglRenderPath",
    "activeLightCount",
    "meshDrawCallCount",
    "webglNativeMeshAttemptedCount",
    "webglNativeMeshSubmittedCount",
    "webglNativeMeshRejectedCount",
    "webglNativeMeshSupportedTopologies",
    "webglNativeMeshLineTopologySubmissionGateState",
    "webglNativeMeshLineTopologySubmissionOutcome",
    "webglNativeMeshLineTopologySubmissionEfficiencySummary",
    "webglNativeMeshLineTopologySubmissionFailureSummary",
    "webglNativeMeshCapabilityGateCount",
  ];

  for (const field of requiredFields) {
    assert.ok(
      field in lastDiagnostics!,
      `WebGL diagnostics must include parity field: ${field}`,
    );
  }
});

/**
 * Verifies the WebGL backend reports render path when native mesh payload is submitted.
 */
test("webgl backend reports model-complete render path for tier-1 mesh parity", () => {
  let lastDiagnostics: { webglRenderPath: string } | null = null;

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
          id: "mesh-tier1",
          positions: [0, 0, 0, 40, 0, 0, 0, 30, 0, 40, 30, 0],
          indices: [0, 1, 2, 2, 1, 3],
          color: "#22c55e",
        },
      ],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.equal(
    lastDiagnostics?.webglRenderPath,
    "model-complete",
    "WebGL tier-1 backend must report model-complete for native mesh payloads",
  );
});
