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

/**
 * Verifies material texture refs and mesh UVs are visible to WebGL native mesh diagnostics.
 */
test("parity telemetry reports native material texture readiness", () => {
  let lastDiagnostics: {
    webglNativeMaterialTextureCandidateCount: number;
    webglNativeMaterialTextureUvReadyCount: number;
    webglNativeMaterialTextureBindingCount: number;
    webglNativeMaterialTextureUploadBytes: number;
    webglNativeMaterialTextureCacheHitCount: number;
    webglNativeMaterialTextureCacheMissCount: number;
    webglNativeMaterialTextureFallbackReason: string;
  } | null = null;
  const textureParameters: number[] = [];

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
          uniform1f() {},
          uniform1i() {},
          createTexture() {
            return {} as WebGLTexture;
          },
          deleteTexture() {},
          activeTexture() {},
          bindTexture() {},
          texImage2D() {},
          texParameteri(_target: number, _pname: number, param: number) {
            textureParameters.push(param);
          },
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
          TEXTURE0: 0x84c0,
          TEXTURE_2D: 0x0de1,
          RGBA: 0x1908,
          UNSIGNED_BYTE: 0x1401,
          TEXTURE_MIN_FILTER: 0x2801,
          TEXTURE_MAG_FILTER: 0x2800,
          TEXTURE_WRAP_S: 0x2802,
          TEXTURE_WRAP_T: 0x2803,
          LINEAR: 0x2601,
          NEAREST: 0x2600,
          CLAMP_TO_EDGE: 0x812f,
          REPEAT: 0x2901,
          MIRRORED_REPEAT: 0x8370,
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
      materials: [
        {
          id: "mat-textured",
          type: "unlit",
          name: "Textured Material",
          baseColor: [1, 1, 1, 1],
          baseColorTexture: "/textures/grass_cc0_oga.png",
          baseColorTextureSampler: {
            wrapS: "repeat",
            wrapT: "repeat",
            minFilter: "linear",
            magFilter: "linear",
          },
          opacity: 1,
        },
      ],
      meshes: [
        {
          id: "mesh-textured",
          materialId: "mat-textured",
          positions: [0, 0, 0, 40, 0, 0, 0, 30, 0, 40, 30, 0],
          indices: [0, 1, 2, 2, 1, 3],
          uvs: [0, 0, 1, 0, 0, 1, 1, 1],
          color: "#ffffff",
        },
      ],
    }),
  });

  backend.resize(surface);
  backend.renderFrame(1);

  assert.equal(lastDiagnostics?.webglNativeMaterialTextureCandidateCount, 1);
  assert.equal(lastDiagnostics?.webglNativeMaterialTextureUvReadyCount, 1);
  assert.equal(lastDiagnostics?.webglNativeMaterialTextureBindingCount, 1);
  assert.equal(lastDiagnostics?.webglNativeMaterialTextureUploadBytes, 4);
  assert.equal(lastDiagnostics?.webglNativeMaterialTextureCacheHitCount, 0);
  assert.equal(lastDiagnostics?.webglNativeMaterialTextureCacheMissCount, 1);
  assert.equal(lastDiagnostics?.webglNativeMaterialTextureFallbackReason, "none");
  assert.equal(textureParameters.includes(0x2901), true);
});

/**
 * Verifies decoded image textures replace placeholder uploads on a later frame.
 */
test("parity telemetry reports decoded image texture upload after async load", async () => {
  let lastDiagnostics: {
    webglNativeMaterialTextureBindingCount: number;
    webglNativeMaterialTextureUploadBytes: number;
    webglNativeMaterialTextureCacheHitCount: number;
    webglNativeMaterialTextureCacheMissCount: number;
    webglNativeMaterialTextureFallbackReason: string;
  } | null = null;
  const previousImage = (globalThis as { Image?: unknown }).Image;

  class MockImage {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 2;
    height = 2;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }

  Object.defineProperty(globalThis, "Image", {
    configurable: true,
    value: MockImage,
  });

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
          uniform1f() {},
          uniform1i() {},
          createTexture() {
            return {} as WebGLTexture;
          },
          deleteTexture() {},
          activeTexture() {},
          bindTexture() {},
          texImage2D() {},
          texParameteri() {},
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
          TEXTURE0: 0x84c0,
          TEXTURE_2D: 0x0de1,
          RGBA: 0x1908,
          UNSIGNED_BYTE: 0x1401,
          TEXTURE_MIN_FILTER: 0x2801,
          TEXTURE_MAG_FILTER: 0x2800,
          TEXTURE_WRAP_S: 0x2802,
          TEXTURE_WRAP_T: 0x2803,
          LINEAR: 0x2601,
          CLAMP_TO_EDGE: 0x812f,
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
      materials: [
        {
          id: "mat-async-textured",
          type: "unlit",
          name: "Async Textured Material",
          baseColor: [1, 1, 1, 1],
          baseColorTexture: "data:image/mock;base64,AAAA",
          opacity: 1,
        },
      ],
      meshes: [
        {
          id: "mesh-async-textured",
          materialId: "mat-async-textured",
          positions: [0, 0, 0, 40, 0, 0, 0, 30, 0, 40, 30, 0],
          indices: [0, 1, 2, 2, 1, 3],
          uvs: [0, 0, 1, 0, 0, 1, 1, 1],
          color: "#ffffff",
        },
      ],
    }),
  });

  try {
    backend.resize(surface);
    backend.renderFrame(1);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureBindingCount, 1);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureUploadBytes, 4);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureCacheMissCount, 1);

    await new Promise((resolve) => setTimeout(resolve, 0));
    backend.renderFrame(2);

    assert.equal(lastDiagnostics?.webglNativeMaterialTextureBindingCount, 1);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureUploadBytes, 16);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureCacheHitCount, 1);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureCacheMissCount, 0);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureFallbackReason, "none");
  } finally {
    if (typeof previousImage === "undefined") {
      Reflect.deleteProperty(globalThis, "Image");
    } else {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: previousImage,
      });
    }
    backend.dispose();
  }
});

/**
 * Verifies failed image texture decode keeps placeholder rendering and reports diagnostics.
 */
test("parity telemetry reports image texture decode failures", async () => {
  let lastDiagnostics: {
    webglNativeMaterialTextureBindingCount: number;
    webglNativeMaterialTextureDecodeFailureCount: number;
    webglNativeMaterialTextureDecodeFailureReason: string;
    webglNativeMaterialTextureFallbackReason: string;
  } | null = null;
  const previousImage = (globalThis as { Image?: unknown }).Image;

  class MockFailedImage {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 2;
    height = 2;

    set src(_value: string) {
      queueMicrotask(() => this.onerror?.());
    }
  }

  Object.defineProperty(globalThis, "Image", {
    configurable: true,
    value: MockFailedImage,
  });

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
          uniform1f() {},
          uniform1i() {},
          createTexture() {
            return {} as WebGLTexture;
          },
          deleteTexture() {},
          activeTexture() {},
          bindTexture() {},
          texImage2D() {},
          texParameteri() {},
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
          TEXTURE0: 0x84c0,
          TEXTURE_2D: 0x0de1,
          RGBA: 0x1908,
          UNSIGNED_BYTE: 0x1401,
          TEXTURE_MIN_FILTER: 0x2801,
          TEXTURE_MAG_FILTER: 0x2800,
          TEXTURE_WRAP_S: 0x2802,
          TEXTURE_WRAP_T: 0x2803,
          LINEAR: 0x2601,
          CLAMP_TO_EDGE: 0x812f,
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
      materials: [
        {
          id: "mat-failed-texture",
          type: "unlit",
          name: "Failed Texture Material",
          baseColor: [1, 1, 1, 1],
          baseColorTexture: "https://invalid.example/texture.png",
          opacity: 1,
        },
      ],
      meshes: [
        {
          id: "mesh-failed-texture",
          materialId: "mat-failed-texture",
          positions: [0, 0, 0, 40, 0, 0, 0, 30, 0, 40, 30, 0],
          indices: [0, 1, 2, 2, 1, 3],
          uvs: [0, 0, 1, 0, 0, 1, 1, 1],
          color: "#ffffff",
        },
      ],
    }),
  });

  try {
    backend.resize(surface);
    backend.renderFrame(1);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureBindingCount, 1);

    await new Promise((resolve) => setTimeout(resolve, 0));
    backend.renderFrame(2);

    assert.equal(lastDiagnostics?.webglNativeMaterialTextureBindingCount, 1);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureDecodeFailureCount, 1);
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureDecodeFailureReason, "image-load-failed");
    assert.equal(lastDiagnostics?.webglNativeMaterialTextureFallbackReason, "decode-failed");
  } finally {
    if (typeof previousImage === "undefined") {
      Reflect.deleteProperty(globalThis, "Image");
    } else {
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: previousImage,
      });
    }
    backend.dispose();
  }
});
