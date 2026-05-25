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
 * Declares one minimal node payload used by WebGPU rejection-reason conformance probes.
 */
type WebGPURejectionProbeNode = {
  id: string;
  type: string;
  shape?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  /** Optional structured text-run payload emitted by rich text scene nodes. */
  textRuns?: unknown;
  clipPathId?: string;
  clipId?: string;
  shadow?: unknown;
  transform?: {
    matrix?: readonly [number, number, number, number, number, number] | readonly number[];
  };
};

/**
 * Runs one WebGPU adapter frame pair and returns the last backend diagnostics snapshot.
 * @param nodes Rich-node payload emitted with zero rect batch eligibility.
 */
async function runWebGPURejectionProbe(nodes: readonly WebGPURejectionProbeNode[]) {
  const originalNavigator = globalThis.navigator;
  const originalSetTimeout = globalThis.setTimeout;
  let lastDiagnostics: {
    webgpuRenderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" | "native-model-complete";
    webgpuNativeRectBatchRejectedReason:
      | "none"
      | "scene-empty"
      | "group-node-unsupported"
      | "non-shape-node-unsupported"
      | "non-rect-shape-unsupported"
      | "shape-style-unsupported"
      | "shape-transform-unsupported";
    webgpuFeatureCapabilityGateReason?:
      | "none"
      | "image-node-unsupported"
      | "clip-node-unsupported"
      | "text-style-unsupported"
      | "shadow-style-unsupported"
      | "gradient-style-unsupported";
  } | null = null;

  try {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        gpu: {
          async requestAdapter() {
            return {
              async requestDevice() {
                return {
                  createCommandEncoder() {
                    return {
                      beginRenderPass() {
                        return {
                          end() {},
                        };
                      },
                      finish() {
                        return { token: "cmd" };
                      },
                    };
                  },
                  queue: {
                    submit() {},
                  },
                };
              },
            };
          },
          getPreferredCanvasFormat() {
            return "bgra8unorm";
          },
        },
      },
    });

    const surface = {
      width: 320,
      height: 180,
      canvas: {
        width: 320,
        height: 180,
        getContext: (contextId: string) => {
          if (contextId !== "webgpu") {
            return null;
          }
          return {
            configure() {},
            getCurrentTexture() {
              return {
                createView() {
                  return {};
                },
              };
            },
          };
        },
      },
    };

    const backend = createWebGPUBackendAdapter(surface, {
      onBackendDiagnostics: (diagnostics) => {
        lastDiagnostics = diagnostics;
      },
      resolveNativeFramePayload: () => ({
        translateX: 0,
        translateY: 0,
        scale: 1,
        rects: [],
        nodes,
      }),
    });

    backend.resize(surface);
    backend.renderFrame(1);
    await new Promise<void>((resolve) => {
      originalSetTimeout(() => {
        resolve();
      }, 0);
    });
    backend.renderFrame(2);
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }

  return lastDiagnostics;
}

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

/**
 * Verifies WebGL adapter emits packet-path diagnostics when native frame payload includes rectangles.
 */
test("webgl adapter emits packet diagnostics from native payload", () => {
  let lastDiagnostics: {
    webglRenderPath: "model-complete" | "packet" | "none";
    webglBudgetPressureReason: string;
  } | null = null;
  const surface = {
    width: 240,
    height: 120,
    canvas: {
      width: 240,
      height: 120,
      getContext: (contextId: "2d" | "webgl" | "webgl2") => {
        if (contextId === "webgl2") {
          return {
            viewport() {},
            clearColor() {},
            clear() {},
            enable() {},
            disable() {},
            scissor() {},
            COLOR_BUFFER_BIT: 0x4000,
            SCISSOR_TEST: 0x0c11,
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
      rects: [
        {
          x: 10,
          y: 12,
          width: 30,
          height: 24,
          fill: "#ff0000",
        },
      ],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.equal(lastDiagnostics?.webglRenderPath, "packet");
  assert.equal(
    ["within-low-thresholds", "payload-rect-count-medium", "payload-rect-count-high"].includes(
      lastDiagnostics?.webglBudgetPressureReason ?? "",
    ),
    true,
  );
});

/**
 * Verifies WebGL adapter reports model-complete when rich-node composition presents successfully.
 */
test("webgl adapter emits model-complete diagnostics from rich-node payload", () => {
  let drawArraysCount = 0;
  let lastDiagnostics: {
    webglRenderPath: "model-complete" | "packet" | "none";
  } | null = null;
  const originalOffscreenCanvas = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;

  class FakeOffscreenCanvas {
    width: number;
    height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }

    /**
     * Exposes deterministic 2D context methods required by rich-node composition.
     * @param contextId Requested context identifier from rendering path.
     */
    getContext(contextId: "2d") {
      if (contextId !== "2d") {
        return null;
      }
      return {
        save() {},
        restore() {},
        setTransform() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        bezierCurveTo() {},
        closePath() {},
        fill() {},
        stroke() {},
        clearRect() {},
        fillRect() {},
        translate() {},
        scale() {},
        strokeRect() {},
      } as unknown as OffscreenCanvasRenderingContext2D;
    }
  }

  Object.defineProperty(globalThis, "OffscreenCanvas", {
    configurable: true,
    value: FakeOffscreenCanvas,
  });

  const fakeShader = {} as WebGLShader;
  const fakeProgram = {} as WebGLProgram;
  const fakeBuffer = {} as WebGLBuffer;
  const fakeTexture = {} as WebGLTexture;

  const surface = {
    width: 240,
    height: 120,
    canvas: {
      width: 240,
      height: 120,
      getContext: (contextId: "2d" | "webgl" | "webgl2") => {
        if (contextId === "webgl2") {
          return {
            viewport() {},
            clearColor() {},
            clear() {},
            bindFramebuffer() {},
            disable() {},
            createShader() {
              return fakeShader;
            },
            shaderSource() {},
            compileShader() {},
            getShaderParameter() {
              return true;
            },
            createProgram() {
              return fakeProgram;
            },
            attachShader() {},
            linkProgram() {},
            getProgramParameter() {
              return true;
            },
            useProgram() {},
            createBuffer() {
              return fakeBuffer;
            },
            bindBuffer() {},
            bufferData() {},
            getAttribLocation() {
              return 0;
            },
            enableVertexAttribArray() {},
            vertexAttribPointer() {},
            createTexture() {
              return fakeTexture;
            },
            activeTexture() {},
            bindTexture() {},
            texParameteri() {},
            pixelStorei() {},
            texImage2D() {},
            getUniformLocation() {
              return {} as WebGLUniformLocation;
            },
            uniform1i() {},
            drawArrays() {
              drawArraysCount += 1;
            },
            COLOR_BUFFER_BIT: 0x4000,
            FRAMEBUFFER: 0x8d40,
            SCISSOR_TEST: 0x0c11,
            VERTEX_SHADER: 0x8b31,
            FRAGMENT_SHADER: 0x8b30,
            COMPILE_STATUS: 0x8b81,
            LINK_STATUS: 0x8b82,
            ARRAY_BUFFER: 0x8892,
            STATIC_DRAW: 0x88e4,
            FLOAT: 0x1406,
            TEXTURE0: 0x84c0,
            TEXTURE_2D: 0x0de1,
            TEXTURE_MIN_FILTER: 0x2801,
            TEXTURE_MAG_FILTER: 0x2800,
            TEXTURE_WRAP_S: 0x2802,
            TEXTURE_WRAP_T: 0x2803,
            LINEAR: 0x2601,
            CLAMP_TO_EDGE: 0x812f,
            RGBA: 0x1908,
            UNSIGNED_BYTE: 0x1401,
            UNPACK_FLIP_Y_WEBGL: 0x9240,
            TRIANGLE_STRIP: 0x0005,
            drawingBufferWidth: 240,
            drawingBufferHeight: 120,
          } as unknown as WebGL2RenderingContext;
        }
        return null;
      },
    },
  };

  try {
    const backend = createWebGLBackendAdapter(surface, {
      onBackendDiagnostics: (diagnostics) => {
        lastDiagnostics = diagnostics;
      },
      resolveNativeFramePayload: () => ({
        translateX: 0,
        translateY: 0,
        scale: 1,
        rects: [],
        nodes: [
          {
            id: "shape-1",
            type: "shape",
            shape: "line",
            x: 10,
            y: 12,
            width: 30,
            height: 24,
            stroke: "#ff0000",
            strokeWidth: 2,
          },
        ],
      }),
    });

    backend.resize(surface);
    backend.renderFrame(1);

    assert.equal(drawArraysCount > 0, true);
    assert.equal(lastDiagnostics?.webglRenderPath, "model-complete");
  } finally {
    Object.defineProperty(globalThis, "OffscreenCanvas", {
      configurable: true,
      value: originalOffscreenCanvas,
    });
  }
});

/**
 * Verifies WebGL adapter reports none when rich-node composition is unavailable and packet path has no rectangles.
 */
test("webgl adapter emits none diagnostics when composition and packet paths are unavailable", () => {
  let lastDiagnostics: {
    webglRenderPath: "model-complete" | "packet" | "none";
  } | null = null;
  const surface = {
    width: 240,
    height: 120,
    canvas: {
      width: 240,
      height: 120,
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
      nodes: [
        {
          id: "shape-1",
          type: "shape",
          shape: "rect",
          x: 10,
          y: 12,
          width: 30,
          height: 24,
          fill: "#ff0000",
        },
      ],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.equal(lastDiagnostics?.webglRenderPath, "none");
});

/**
 * Verifies WebGPU adapter emits native submission diagnostics on initialized device path.
 */
test("webgpu adapter emits native submission diagnostics", async () => {
  const originalNavigator = globalThis.navigator;
  const originalSetTimeout = globalThis.setTimeout;
  const queuedSubmits: unknown[][] = [];
  let lastDiagnostics: {
    webgpuRenderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" | "native-model-complete";
    webgpuNativeSubmissionAttemptedCount: number;
    webgpuNativeSubmissionSuccessCount: number;
    webgpuNativeSubmissionFailureCount: number;
    webgpuNativeSubmissionTotalCount: number;
    webgpuNativeRectBatchEligibleCount: number;
    webglBudgetPressureReason: string;
  } | null = null;

  try {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        gpu: {
          async requestAdapter() {
            return {
              async requestDevice() {
                return {
                  createCommandEncoder() {
                    return {
                      beginRenderPass() {
                        return {
                          end() {},
                        };
                      },
                      finish() {
                        return { token: "cmd" };
                      },
                    };
                  },
                  queue: {
                    submit(commands: unknown[]) {
                      queuedSubmits.push(commands);
                    },
                  },
                };
              },
            };
          },
          getPreferredCanvasFormat() {
            return "bgra8unorm";
          },
        },
      },
    });

    const surface = {
      width: 320,
      height: 180,
      canvas: {
        width: 320,
        height: 180,
        getContext: (contextId: string) => {
          if (contextId !== "webgpu") {
            return null;
          }
          return {
            configure() {},
            getCurrentTexture() {
              return {
                createView() {
                  return {};
                },
              };
            },
          };
        },
      },
    };

    const backend = createWebGPUBackendAdapter(surface, {
      onBackendDiagnostics: (diagnostics) => {
        lastDiagnostics = diagnostics;
      },
      resolveNativeFramePayload: () => ({
        translateX: 0,
        translateY: 0,
        scale: 1,
        rects: [
          {
            x: 0,
            y: 0,
            width: 20,
            height: 20,
            fill: "#00ff00",
          },
        ],
      }),
    });

    backend.resize(surface);
    backend.renderFrame(1);
    await new Promise<void>((resolve) => {
      originalSetTimeout(() => {
        resolve();
      }, 0);
    });
    backend.renderFrame(2);

    assert.equal(queuedSubmits.length > 0, true);
    assert.equal(lastDiagnostics?.webgpuRenderPath, "native-rect-batch");
    assert.equal(lastDiagnostics?.webgpuNativeSubmissionAttemptedCount, 1);
    assert.equal(lastDiagnostics?.webgpuNativeSubmissionSuccessCount, 1);
    assert.equal(lastDiagnostics?.webgpuNativeSubmissionFailureCount, 0);
    assert.equal(lastDiagnostics?.webgpuNativeSubmissionTotalCount, 1);
    assert.equal(lastDiagnostics?.webgpuNativeRectBatchEligibleCount, 1);
    assert.equal(
      ["within-low-thresholds", "payload-rect-count-medium", "payload-rect-count-high"].includes(
        lastDiagnostics?.webglBudgetPressureReason ?? "",
      ),
      true,
    );
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }
});

/**
 * Verifies WebGPU adapter classifies non-rect rich-node payload as rect-batch rejection instead of scene-empty.
 */
test("webgpu adapter classifies non-rect payload rejection reason", async () => {
  const originalNavigator = globalThis.navigator;
  const originalSetTimeout = globalThis.setTimeout;
  let lastDiagnostics: {
    webgpuRenderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" | "native-model-complete";
    webgpuNativeRectBatchRejectedReason:
      | "none"
      | "scene-empty"
      | "group-node-unsupported"
      | "non-shape-node-unsupported"
      | "non-rect-shape-unsupported"
      | "shape-style-unsupported"
      | "shape-transform-unsupported";
  } | null = null;

  try {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        gpu: {
          async requestAdapter() {
            return {
              async requestDevice() {
                return {
                  createCommandEncoder() {
                    return {
                      beginRenderPass() {
                        return {
                          end() {},
                        };
                      },
                      finish() {
                        return { token: "cmd" };
                      },
                    };
                  },
                  queue: {
                    submit() {},
                  },
                };
              },
            };
          },
          getPreferredCanvasFormat() {
            return "bgra8unorm";
          },
        },
      },
    });

    const surface = {
      width: 320,
      height: 180,
      canvas: {
        width: 320,
        height: 180,
        getContext: (contextId: string) => {
          if (contextId !== "webgpu") {
            return null;
          }
          return {
            configure() {},
            getCurrentTexture() {
              return {
                createView() {
                  return {};
                },
              };
            },
          };
        },
      },
    };

    const backend = createWebGPUBackendAdapter(surface, {
      onBackendDiagnostics: (diagnostics) => {
        lastDiagnostics = diagnostics;
      },
      resolveNativeFramePayload: () => ({
        translateX: 0,
        translateY: 0,
        scale: 1,
        rects: [],
        nodes: [
          {
            id: "shape-line",
            type: "shape",
            shape: "line",
            x: 16,
            y: 18,
            width: 42,
            height: 21,
            stroke: "#111111",
            strokeWidth: 2,
          },
        ],
      }),
    });

    backend.resize(surface);
    backend.renderFrame(1);
    await new Promise<void>((resolve) => {
      originalSetTimeout(() => {
        resolve();
      }, 0);
    });
    backend.renderFrame(2);

    assert.equal(lastDiagnostics?.webgpuRenderPath, "native-clear-only");
    assert.equal(lastDiagnostics?.webgpuNativeRectBatchRejectedReason, "non-rect-shape-unsupported");
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }
});

/**
 * Verifies WebGPU adapter classifies group-node payload as hierarchy rejection for rect-batch path.
 */
test("webgpu adapter classifies group payload rejection reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "group-1",
      type: "group",
      x: 0,
      y: 0,
      width: 120,
      height: 80,
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuRenderPath, "native-clear-only");
  assert.equal(lastDiagnostics?.webgpuNativeRectBatchRejectedReason, "group-node-unsupported");
});

/**
 * Verifies WebGPU adapter classifies non-shape payload as non-shape rejection for rect-batch path.
 */
test("webgpu adapter classifies non-shape payload rejection reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "text-1",
      type: "text",
      x: 8,
      y: 12,
      width: 80,
      height: 20,
      text: "hello",
      fill: "#111111",
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuRenderPath, "native-clear-only");
  assert.equal(lastDiagnostics?.webgpuNativeRectBatchRejectedReason, "non-shape-node-unsupported");
});

/**
 * Verifies WebGPU adapter surfaces image capability gate reason for image-node payload.
 */
test("webgpu adapter classifies image capability gate reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "image-1",
      type: "image",
      x: 8,
      y: 12,
      width: 80,
      height: 20,
      fill: "#111111",
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuFeatureCapabilityGateReason, "image-node-unsupported");
});

/**
 * Verifies WebGPU adapter surfaces clip capability gate reason for clip-bound payload.
 */
test("webgpu adapter classifies clip capability gate reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "shape-clip-1",
      type: "shape",
      shape: "rect",
      x: 8,
      y: 12,
      width: 80,
      height: 20,
      fill: "#111111",
      clipPathId: "clip-1",
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuFeatureCapabilityGateReason, "clip-node-unsupported");
});

/**
 * Verifies WebGPU adapter surfaces text capability gate reason for rich text-run payloads.
 */
test("webgpu adapter classifies text capability gate reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "text-rich-1",
      type: "text",
      x: 8,
      y: 12,
      width: 160,
      height: 24,
      text: "hello",
      fill: "#111111",
      textRuns: [
        {
          from: 0,
          to: 5,
          fontWeight: 600,
        },
      ],
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuFeatureCapabilityGateReason, "text-style-unsupported");
});

/**
 * Verifies WebGPU adapter surfaces shadow capability gate reason for shadow-rich payload.
 */
test("webgpu adapter classifies shadow capability gate reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "shape-shadow-1",
      type: "shape",
      shape: "rect",
      x: 8,
      y: 12,
      width: 80,
      height: 20,
      fill: "#111111",
      shadow: { blur: 4, color: "rgba(0,0,0,0.2)" },
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuFeatureCapabilityGateReason, "shadow-style-unsupported");
});

/**
 * Verifies WebGPU adapter surfaces gradient capability gate reason for gradient-like paint tokens.
 */
test("webgpu adapter classifies gradient capability gate reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "shape-gradient-1",
      type: "shape",
      shape: "rect",
      x: 8,
      y: 12,
      width: 80,
      height: 20,
      fill: "linear-gradient(90deg,#fff,#000)",
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuFeatureCapabilityGateReason, "gradient-style-unsupported");
});

/**
 * Verifies WebGPU adapter classifies transformed rect payload as transform rejection for rect-batch path.
 */
test("webgpu adapter classifies transform payload rejection reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "shape-rect-transform",
      type: "shape",
      shape: "rect",
      x: 12,
      y: 14,
      width: 40,
      height: 28,
      fill: "#00aa88",
      transform: {
        matrix: [1, 0, 0.2, 1, 0, 0],
      },
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuRenderPath, "native-clear-only");
  assert.equal(lastDiagnostics?.webgpuNativeRectBatchRejectedReason, "shape-transform-unsupported");
});

/**
 * Verifies WebGPU adapter classifies styled rect payload as style rejection for rect-batch path.
 */
test("webgpu adapter classifies style payload rejection reason", async () => {
  const lastDiagnostics = await runWebGPURejectionProbe([
    {
      id: "shape-rect-styled",
      type: "shape",
      shape: "rect",
      x: 12,
      y: 14,
      width: 40,
      height: 28,
      fill: "#00aa88",
      stroke: "#000000",
      strokeWidth: 2,
    },
  ]);

  assert.equal(lastDiagnostics?.webgpuRenderPath, "native-clear-only");
  assert.equal(lastDiagnostics?.webgpuNativeRectBatchRejectedReason, "shape-style-unsupported");
});

/**
 * Verifies WebGPU adapter emits native-model-complete when rich-node composition copy succeeds.
 */
test("webgpu adapter emits native-model-complete diagnostics from rich-node payload", async () => {
  const originalNavigator = globalThis.navigator;
  const originalOffscreenCanvas = (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
  const originalSetTimeout = globalThis.setTimeout;
  let copiedImageCount = 0;
  let submittedCount = 0;
  let lastDiagnostics: {
    webgpuRenderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" | "native-model-complete";
    webgpuNativeSubmissionSuccessCount: number;
  } | null = null;

  class FakeOffscreenCanvas {
    width: number;
    height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }

    /**
     * Exposes deterministic 2D context methods required by rich-node composition.
     * @param contextId Requested context identifier from rendering path.
     */
    getContext(contextId: "2d") {
      if (contextId !== "2d") {
        return null;
      }
      return {
        save() {},
        restore() {},
        setTransform() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        bezierCurveTo() {},
        closePath() {},
        fill() {},
        stroke() {},
        clearRect() {},
        fillRect() {},
        translate() {},
        scale() {},
        strokeRect() {},
      } as unknown as OffscreenCanvasRenderingContext2D;
    }
  }

  Object.defineProperty(globalThis, "OffscreenCanvas", {
    configurable: true,
    value: FakeOffscreenCanvas,
  });

  try {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        gpu: {
          async requestAdapter() {
            return {
              async requestDevice() {
                return {
                  createCommandEncoder() {
                    return {
                      beginRenderPass() {
                        return {
                          end() {},
                        };
                      },
                      finish() {
                        return { token: "cmd" };
                      },
                    };
                  },
                  queue: {
                    submit() {
                      submittedCount += 1;
                    },
                    copyExternalImageToTexture() {
                      copiedImageCount += 1;
                    },
                  },
                };
              },
            };
          },
          getPreferredCanvasFormat() {
            return "bgra8unorm";
          },
        },
      },
    });

    const surface = {
      width: 320,
      height: 180,
      canvas: {
        width: 320,
        height: 180,
        getContext: (contextId: string) => {
          if (contextId !== "webgpu") {
            return null;
          }
          return {
            configure() {},
            getCurrentTexture() {
              return {
                createView() {
                  return {};
                },
              };
            },
          };
        },
      },
    };

    const backend = createWebGPUBackendAdapter(surface, {
      onBackendDiagnostics: (diagnostics) => {
        lastDiagnostics = diagnostics;
      },
      resolveNativeFramePayload: () => ({
        translateX: 0,
        translateY: 0,
        scale: 1,
        rects: [],
        nodes: [
          {
            id: "shape-path-1",
            type: "shape",
            shape: "path",
            fill: "#ff0000",
            stroke: "#222222",
            strokeWidth: 1,
            bezierPoints: [
              {
                anchor: { x: 10, y: 12 },
                cp2: { x: 24, y: 6 },
              },
              {
                anchor: { x: 52, y: 28 },
                cp1: { x: 40, y: 10 },
                cp2: { x: 64, y: 34 },
              },
              {
                anchor: { x: 22, y: 50 },
                cp1: { x: 44, y: 52 },
              },
            ],
          },
        ],
      }),
    });

    backend.resize(surface);
    backend.renderFrame(1);
    await new Promise<void>((resolve) => {
      originalSetTimeout(() => {
        resolve();
      }, 0);
    });
    backend.renderFrame(2);

    assert.equal(copiedImageCount > 0, true);
    assert.equal(submittedCount, 0);
    assert.equal(lastDiagnostics?.webgpuRenderPath, "native-model-complete");
    assert.equal(lastDiagnostics?.webgpuNativeSubmissionSuccessCount, 1);
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    Object.defineProperty(globalThis, "OffscreenCanvas", {
      configurable: true,
      value: originalOffscreenCanvas,
    });
  }
});
