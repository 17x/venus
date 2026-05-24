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
