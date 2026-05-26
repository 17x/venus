import type { EngineBackend } from "../../backend/backend";
import type { NoopBackendAdapterHooks } from "./noopBackendAdapter";
import type { EngineBackendSurface } from "../backend-contracts";
import { ENGINE_BACKEND_CACHE_FALLBACK_REASON } from "../fallbackTaxonomy";
import { resolveRichPathDrawPlan } from "./richPathDrawPlan";
import {
  resolveFeatureCapabilityGateReason,
  type FeatureCapabilityGateReason,
} from "./featureCapabilityGatePlan";
import {
  createWebGLNativeMeshPipelineCache,
  disposeWebGLNativeMeshPipelineCache,
  presentNativeMeshPrimitives,
  type WebGLNativeMeshSubmissionDiagnostics,
} from "./webglNativeMeshPresenter";

/**
 * Parses a CSS-like hex/rgb color token into normalized RGBA channels.
 * @param color Raw color token from frame payload.
 */
function resolveNormalizedColor(color: string): [number, number, number, number] {
  const normalized = color.trim().toLowerCase();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      return [r / 255, g / 255, b / 255, 1];
    }
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      return [r / 255, g / 255, b / 255, 1];
    }
  }
  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const channels = rgbMatch[1].split(",").map((entry) => Number.parseFloat(entry.trim()));
    if (channels.length >= 3 && channels.every((entry, index) => index > 2 || Number.isFinite(entry))) {
      const alpha = Number.isFinite(channels[3]) ? Math.max(0, Math.min(1, channels[3])) : 1;
      return [
        Math.max(0, Math.min(255, channels[0])) / 255,
        Math.max(0, Math.min(255, channels[1])) / 255,
        Math.max(0, Math.min(255, channels[2])) / 255,
        alpha,
      ];
    }
  }
  return [0.1, 0.16, 0.25, 1];
}

/**
 * Resolves one deterministic budget-pressure reason from payload cardinality.
 * @param payloadRectCount Rect count sampled from current native payload.
 */
function resolveBudgetPressureReason(payloadRectCount: number): string {
  if (payloadRectCount > 256) {
    return "payload-rect-count-high";
  }
  if (payloadRectCount > 64) {
    return "payload-rect-count-medium";
  }
  return "within-low-thresholds";
}

/**
 * Declares one rich scene node consumed by WebGL model-complete fallback composition.
 */
type WebGLNativeSceneNode = {
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
  /** Optional structured text-run payload used for rich text rendering semantics. */
  textRuns?: unknown;
  clipPathId?: string;
  clipId?: string;
  shadow?: unknown;
  transform?: {
    matrix?: readonly [number, number, number, number, number, number] | readonly number[];
  };
  points?: ReadonlyArray<{ x: number; y: number }>;
  bezierPoints?: ReadonlyArray<{
    anchor: { x: number; y: number };
    cp1?: { x: number; y: number };
    cp2?: { x: number; y: number };
  }>;
};

/**
 * Resolves one optional 2D offscreen context used for model-complete composition.
 * @param width Device-pixel width for composition target.
 * @param height Device-pixel height for composition target.
 */
function resolveOffscreenCompositionContext(width: number, height: number): {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
} | null {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (context) {
      return { canvas, context };
    }
  }

  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) {
      return { canvas, context };
    }
  }

  return null;
}

/**
 * Draws one node list into composition context using canvas2d semantics.
 * @param context Composition context used to rasterize rich nodes.
 * @param payload Native payload carrying viewport transform and rich nodes.
 * @param deviceWidth Target device width in pixels.
 * @param deviceHeight Target device height in pixels.
 * @param dpr Device pixel ratio.
 */
function drawRichNodesToCompositionContext(
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  payload: {
    translateX: number;
    translateY: number;
    scale: number;
    nodes?: ReadonlyArray<WebGLNativeSceneNode>;
  },
  deviceWidth: number,
  deviceHeight: number,
  dpr: number,
): boolean {
  /**
   * Resolves one payload matrix to canvas transform tuple order.
   * @param matrix Node matrix payload emitted by scene adapter.
   */
  const resolveCanvasTransform = (matrix: readonly number[]) => {
    if (matrix.length < 6) {
      return null;
    }
    const a = matrix[0] ?? 1;
    const b = matrix[1] ?? 0;
    const cLegacy = matrix[3] ?? 0;
    const dLegacy = matrix[4] ?? 1;
    const eLegacy = matrix[2] ?? 0;
    const fLegacy = matrix[5] ?? 0;
    const cCanvas = matrix[2] ?? 0;
    const dCanvas = matrix[3] ?? 1;
    const eCanvas = matrix[4] ?? 0;
    const fCanvas = matrix[5] ?? 0;
    const legacyLikely = Math.abs(dCanvas) < 0.0001 && Math.abs(dLegacy) >= 0.5;
    return legacyLikely
      ? { a, b, c: cLegacy, d: dLegacy, e: eLegacy, f: fLegacy }
      : { a, b, c: cCanvas, d: dCanvas, e: eCanvas, f: fCanvas };
  };
  if (!payload.nodes || payload.nodes.length === 0) {
    return false;
  }

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, deviceWidth, deviceHeight);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, deviceWidth, deviceHeight);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.translate(payload.translateX, payload.translateY);
  context.scale(payload.scale, payload.scale);
  let drawnPrimitiveCount = 0;

  for (const node of payload.nodes) {
    if (node.type === "group") {
      continue;
    }
    context.save();
    const matrix = node.transform?.matrix;
    if (Array.isArray(matrix) && matrix.length >= 6) {
      const resolvedMatrix = resolveCanvasTransform(matrix);
      if (resolvedMatrix) {
        context.transform(
          resolvedMatrix.a,
          resolvedMatrix.b,
          resolvedMatrix.c,
          resolvedMatrix.d,
          resolvedMatrix.e,
          resolvedMatrix.f,
        );
      }
    }
    const fill = typeof node.fill === "string" ? node.fill : "transparent";
    const stroke = typeof node.stroke === "string" ? node.stroke : "transparent";
    const strokeWidth = typeof node.strokeWidth === "number" && Number.isFinite(node.strokeWidth) ? Math.max(0, node.strokeWidth) : 1;
    const x = typeof node.x === "number" && Number.isFinite(node.x) ? node.x : 0;
    const y = typeof node.y === "number" && Number.isFinite(node.y) ? node.y : 0;
    const width = typeof node.width === "number" && Number.isFinite(node.width) ? Math.abs(node.width) : 0;
    const height = typeof node.height === "number" && Number.isFinite(node.height) ? Math.abs(node.height) : 0;
    const shape = typeof node.shape === "string" ? node.shape : "rect";

    if (node.type === "text") {
      context.fillStyle = fill !== "transparent" ? fill : "#0f172a";
      context.textBaseline = "top";
      context.font = "16px sans-serif";
      context.fillText(typeof node.text === "string" ? node.text : "Text", x, y, width > 0 ? width : undefined);
      drawnPrimitiveCount += 1;
      context.restore();
      continue;
    }

    if (shape === "ellipse") {
      context.beginPath();
      context.ellipse(x + width / 2, y + height / 2, Math.max(0, width / 2), Math.max(0, height / 2), 0, 0, Math.PI * 2);
      if (fill !== "transparent") {
        context.fillStyle = fill;
        context.fill();
        drawnPrimitiveCount += 1;
      }
      if (stroke !== "transparent" && strokeWidth > 0) {
        context.strokeStyle = stroke;
        context.lineWidth = strokeWidth;
        context.stroke();
        drawnPrimitiveCount += 1;
      }
      context.restore();
      continue;
    }

    const points = Array.isArray(node.points) ? node.points : [];
    const bezierPoints = Array.isArray(node.bezierPoints) ? node.bezierPoints : [];
    const pathDrawPlan = resolveRichPathDrawPlan({
      shape,
      points,
      bezierPoints,
    });
    if (pathDrawPlan.shouldEnterPathBranch) {
      context.beginPath();
      if (pathDrawPlan.hasBezierPath) {
        context.moveTo(bezierPoints[0].anchor.x, bezierPoints[0].anchor.y);
        for (let index = 1; index < bezierPoints.length; index += 1) {
          const previous = bezierPoints[index - 1];
          const current = bezierPoints[index];
          const cp1 = previous.cp2 ?? previous.anchor;
          const cp2 = current.cp1 ?? current.anchor;
          context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, current.anchor.x, current.anchor.y);
        }
      } else if (pathDrawPlan.hasPointPath) {
        context.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index += 1) {
          context.lineTo(points[index].x, points[index].y);
        }
      } else if (pathDrawPlan.shouldFallbackLine) {
        // Preserve compatibility for line nodes that encode segment delta through width/height.
        context.moveTo(x, y);
        context.lineTo(x + width, y + height);
      } else {
        context.restore();
        continue;
      }
      if (pathDrawPlan.shouldClosePath) {
        context.closePath();
      }
      if (fill !== "transparent" && shape !== "line") {
        context.fillStyle = fill;
        context.fill();
        drawnPrimitiveCount += 1;
      }
      if (stroke !== "transparent" && strokeWidth > 0) {
        context.strokeStyle = stroke;
        context.lineWidth = strokeWidth;
        context.stroke();
        drawnPrimitiveCount += 1;
      }
      context.restore();
      continue;
    }

    if (fill !== "transparent" && width > 0 && height > 0) {
      context.fillStyle = fill;
      context.fillRect(x, y, width, height);
      drawnPrimitiveCount += 1;
    }
    if (stroke !== "transparent" && strokeWidth > 0 && width > 0 && height > 0) {
      context.strokeStyle = stroke;
      context.lineWidth = strokeWidth;
      context.strokeRect(x, y, width, height);
      drawnPrimitiveCount += 1;
    }
    context.restore();
  }

  context.restore();
  return drawnPrimitiveCount > 0;
}

/**
 * Uploads offscreen composition texture and presents it to the WebGL surface.
 * @param context WebGL context receiving the composite texture.
 * @param sourceCanvas Source offscreen canvas containing composed frame pixels.
 */
function presentCompositionTexture(
  context: WebGL2RenderingContext | WebGLRenderingContext,
  sourceCanvas: OffscreenCanvas | HTMLCanvasElement,
): boolean {
  if (
    typeof context.createShader !== "function" ||
    typeof context.shaderSource !== "function" ||
    typeof context.compileShader !== "function" ||
    typeof context.createProgram !== "function" ||
    typeof context.attachShader !== "function" ||
    typeof context.linkProgram !== "function" ||
    typeof context.useProgram !== "function" ||
    typeof context.createBuffer !== "function" ||
    typeof context.bindBuffer !== "function" ||
    typeof context.bufferData !== "function" ||
    typeof context.getAttribLocation !== "function" ||
    typeof context.enableVertexAttribArray !== "function" ||
    typeof context.vertexAttribPointer !== "function" ||
    typeof context.createTexture !== "function" ||
    typeof context.bindTexture !== "function" ||
    typeof context.texParameteri !== "function" ||
    typeof context.texImage2D !== "function" ||
    typeof context.pixelStorei !== "function" ||
    typeof context.activeTexture !== "function" ||
    typeof context.drawArrays !== "function" ||
    typeof context.getUniformLocation !== "function" ||
    typeof context.uniform1i !== "function" ||
    typeof context.getShaderParameter !== "function" ||
    typeof context.getProgramParameter !== "function"
  ) {
    return false;
  }

  const sourceWidth = "width" in sourceCanvas && typeof sourceCanvas.width === "number" ? sourceCanvas.width : 0;
  const sourceHeight = "height" in sourceCanvas && typeof sourceCanvas.height === "number" ? sourceCanvas.height : 0;
  const viewportWidth =
    typeof context.drawingBufferWidth === "number" && context.drawingBufferWidth > 0
      ? context.drawingBufferWidth
      : sourceWidth;
  const viewportHeight =
    typeof context.drawingBufferHeight === "number" && context.drawingBufferHeight > 0
      ? context.drawingBufferHeight
      : sourceHeight;
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return false;
  }

  // Reset critical state so texture present is never clipped by stale packet-path state.
  if (typeof context.bindFramebuffer === "function") {
    context.bindFramebuffer(context.FRAMEBUFFER, null);
  }
  if (typeof context.disable === "function") {
    context.disable(context.SCISSOR_TEST);
  }
  if (typeof context.viewport === "function") {
    context.viewport(0, 0, viewportWidth, viewportHeight);
  }
  if (typeof context.clearColor === "function") {
    context.clearColor(1, 1, 1, 1);
  }
  if (typeof context.clear === "function") {
    context.clear(context.COLOR_BUFFER_BIT);
  }

  const vertexShader = context.createShader(context.VERTEX_SHADER);
  const fragmentShader = context.createShader(context.FRAGMENT_SHADER);
  if (!vertexShader || !fragmentShader) {
    return false;
  }

  const isWebGL2 =
    typeof WebGL2RenderingContext !== "undefined" &&
    context instanceof WebGL2RenderingContext;
  const vertexShaderSource = isWebGL2
    ? "#version 300 es\nin vec2 aPosition; in vec2 aUv; out vec2 vUv; void main(){ vUv = aUv; gl_Position = vec4(aPosition, 0.0, 1.0); }"
    : "attribute vec2 aPosition; attribute vec2 aUv; varying vec2 vUv; void main(){ vUv = aUv; gl_Position = vec4(aPosition, 0.0, 1.0); }";
  const fragmentShaderSource = isWebGL2
    ? "#version 300 es\nprecision mediump float; in vec2 vUv; uniform sampler2D uTexture; out vec4 outColor; void main(){ outColor = texture(uTexture, vUv); }"
    : "precision mediump float; varying vec2 vUv; uniform sampler2D uTexture; void main(){ gl_FragColor = texture2D(uTexture, vUv); }";

  context.shaderSource(vertexShader, vertexShaderSource);
  context.compileShader(vertexShader);
  if (!context.getShaderParameter(vertexShader, context.COMPILE_STATUS)) {
    return false;
  }
  context.shaderSource(fragmentShader, fragmentShaderSource);
  context.compileShader(fragmentShader);
  if (!context.getShaderParameter(fragmentShader, context.COMPILE_STATUS)) {
    return false;
  }

  const program = context.createProgram();
  if (!program) {
    return false;
  }
  context.attachShader(program, vertexShader);
  context.attachShader(program, fragmentShader);
  context.linkProgram(program);
  if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    return false;
  }
  context.useProgram(program);

  const vertices = new Float32Array([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1,
  ]);
  const buffer = context.createBuffer();
  if (!buffer) {
    return false;
  }
  context.bindBuffer(context.ARRAY_BUFFER, buffer);
  context.bufferData(context.ARRAY_BUFFER, vertices, context.STATIC_DRAW);
  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = context.getAttribLocation(program, "aPosition");
  const uvLocation = context.getAttribLocation(program, "aUv");
  if (positionLocation >= 0) {
    context.enableVertexAttribArray(positionLocation);
    context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, stride, 0);
  }
  if (uvLocation >= 0) {
    context.enableVertexAttribArray(uvLocation);
    context.vertexAttribPointer(uvLocation, 2, context.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
  }

  const texture = context.createTexture();
  if (!texture) {
    return false;
  }
  context.activeTexture(context.TEXTURE0);
  context.bindTexture(context.TEXTURE_2D, texture);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
  context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
  context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, 1);
  context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, sourceCanvas);
  const textureUniform = context.getUniformLocation(program, "uTexture");
  if (textureUniform) {
    context.uniform1i(textureUniform, 0);
  }
  context.drawArrays(context.TRIANGLE_STRIP, 0, 4);
  return true;
}

/**
 * Resolves whether one surface can provide a WebGL context.
 * @param surface Engine surface that may carry a canvas-like target.
 */
export function canUseWebGLBackendAdapter(surface: EngineBackendSurface): boolean {
  const canvas = surface.canvas;
  if (!canvas || typeof canvas.getContext !== "function") {
    return false;
  }

  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

/**
 * Creates one native WebGL backend adapter.
 * @param surface Engine surface payload used by WebGL context setup.
 * @param hooks Optional no-op present telemetry hooks.
 */
export function createWebGLBackendAdapter(
  surface?: EngineBackendSurface,
  hooks?: NoopBackendAdapterHooks,
): EngineBackend {
  let currentSurface = surface ?? { width: 1, height: 1 };
  let currentContext: WebGL2RenderingContext | WebGLRenderingContext | null = null;
  let lastPayloadSignature = "";
  const nativeMeshPipelineCache = createWebGLNativeMeshPipelineCache();

  /**
   * Resolves WebGL rendering context from the active surface.
   */
  function resolveContext(nextSurface: EngineBackendSurface) {
    const canvas = nextSurface.canvas;
    if (!canvas || typeof canvas.getContext !== "function") {
      return null;
    }
    return (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null;
  }

  /**
   * Publishes one normalized WebGL diagnostics snapshot for runtime consumers.
   * @param renderPath WebGL render-path classification for current frame.
   * @param payloadSignature Stable payload signature used for lightweight reuse heuristics.
   * @param payloadRectCount Rect count sampled from current payload for budget/caching diagnostics.
   * @param webglFeatureCapabilityGateReason Deterministic feature capability reason emitted for this frame.
    * @param meshSubmissionDiagnostics Optional mesh submission counters emitted by native mesh presenter.
   */
  function publishWebGLDiagnostics(
    renderPath: "model-complete" | "packet" | "none",
    payloadSignature: string,
    payloadRectCount: number,
    webglFeatureCapabilityGateReason: FeatureCapabilityGateReason,
    meshSubmissionDiagnostics?: WebGLNativeMeshSubmissionDiagnostics,
  ) {
    const frameReuseHit = payloadSignature === lastPayloadSignature && payloadSignature !== "none";
    lastPayloadSignature = payloadSignature;
    const cacheHitCount = frameReuseHit ? 1 : 0;
    const cacheMissCount = frameReuseHit ? 0 : 1;
    const budgetPressure = payloadRectCount > 256 ? "high" : payloadRectCount > 64 ? "medium" : "low";
    hooks?.onBackendDiagnostics?.({
      webglRenderPath: renderPath,
      webgpuRenderPath: "hybrid-webgl",
      webgpuNativeSubmissionAttemptedCount: 0,
      webgpuNativeSubmissionSuccessCount: 0,
      webgpuNativeSubmissionFailureCount: 0,
      webgpuNativeSubmissionTotalCount: 0,
      webgpuNativeSubmissionTotalFailureCount: 0,
      webgpuNativeRectBatchEligibleCount: 0,
      webgpuNativeRectBatchRejectedReason: "none",
      webglNativeMeshAttemptedCount: meshSubmissionDiagnostics?.attemptedMeshCount ?? 0,
      webglNativeMeshSubmittedCount: meshSubmissionDiagnostics?.submittedMeshCount ?? 0,
      webglNativeMeshPipelineCompileCount: meshSubmissionDiagnostics?.pipelineCompileCount ?? 0,
      webglNativeMeshPipelineReuseCount: meshSubmissionDiagnostics?.pipelineReuseCount ?? 0,
      webglNativeMeshRejectedCount: meshSubmissionDiagnostics?.rejectedMeshCount ?? 0,
      webglNativeMeshRejectedInvalidPositionCount: meshSubmissionDiagnostics?.rejectedMeshInvalidPositionCount ?? 0,
      webglNativeMeshRejectedInvalidIndexCount: meshSubmissionDiagnostics?.rejectedMeshInvalidIndexCount ?? 0,
      webglNativeMeshRejectedInsufficientStreamCount: meshSubmissionDiagnostics?.rejectedMeshInsufficientStreamCount ?? 0,
      webglNativeMeshRejectedUnsupportedTopologyCount: meshSubmissionDiagnostics?.rejectedMeshUnsupportedTopologyCount ?? 0,
      webglNativeMeshSupportedTopologies: meshSubmissionDiagnostics?.supportedTopologies ?? ["triangles"],
      webglNativeMeshRejectedTopologies: meshSubmissionDiagnostics?.rejectedTopologies ?? [],
      webglNativeMeshLineTopologyPlannedCount: meshSubmissionDiagnostics?.lineTopologyPlannedCount ?? 0,
      webglNativeMeshLineTopologyPreflightAttemptedCount: meshSubmissionDiagnostics?.lineTopologyPreflightAttemptedCount ?? 0,
      webglNativeMeshLineTopologyPreflightPassedCount: meshSubmissionDiagnostics?.lineTopologyPreflightPassedCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedCount: meshSubmissionDiagnostics?.lineTopologyPreflightRejectedCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedInvalidPositionCount: meshSubmissionDiagnostics?.lineTopologyPreflightRejectedInvalidPositionCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedInvalidIndexCount: meshSubmissionDiagnostics?.lineTopologyPreflightRejectedInvalidIndexCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedInsufficientStreamCount: meshSubmissionDiagnostics?.lineTopologyPreflightRejectedInsufficientStreamCount ?? 0,
      webglNativeMeshLineTopologyDrawPlanAttemptedCount: meshSubmissionDiagnostics?.lineTopologyDrawPlanAttemptedCount ?? 0,
      webglNativeMeshLineTopologyDrawPlanCommandCount: meshSubmissionDiagnostics?.lineTopologyDrawPlanCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionDeferredCount: meshSubmissionDiagnostics?.lineTopologySubmissionDeferredCount ?? 0,
      webglNativeMeshLineTopologySubmissionAttemptedCount: meshSubmissionDiagnostics?.lineTopologySubmissionAttemptedCount ?? 0,
      webglNativeMeshLineTopologySubmissionAttemptedCommandCount: meshSubmissionDiagnostics?.lineTopologySubmissionAttemptedCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionSucceededCount: meshSubmissionDiagnostics?.lineTopologySubmissionSucceededCount ?? 0,
      webglNativeMeshLineTopologySubmissionSucceededCommandCount: meshSubmissionDiagnostics?.lineTopologySubmissionSucceededCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionCommandSuccessRate: meshSubmissionDiagnostics?.lineTopologySubmissionCommandSuccessRate ?? 0,
      webglNativeMeshLineTopologySubmissionPlanCoverageRate: meshSubmissionDiagnostics?.lineTopologySubmissionPlanCoverageRate ?? 0,
      webglNativeMeshLineTopologySubmissionDrawPlanWastedCommandCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionDrawPlanWastedCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedCount: meshSubmissionDiagnostics?.lineTopologySubmissionFailedCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedCommandCount: meshSubmissionDiagnostics?.lineTopologySubmissionFailedCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionGateBlockedCount: meshSubmissionDiagnostics?.lineTopologySubmissionGateBlockedCount ?? 0,
      webglNativeMeshLineTopologySubmissionGateState: meshSubmissionDiagnostics?.lineTopologySubmissionGateState ?? "disabled",
      webglNativeMeshLineTopologySubmissionOutcome: meshSubmissionDiagnostics?.lineTopologySubmissionOutcome ?? "none",
      webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCount: meshSubmissionDiagnostics?.lineTopologySubmissionFailedMissingLinesPrimitiveCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCommandCount: meshSubmissionDiagnostics?.lineTopologySubmissionFailedMissingLinesPrimitiveCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCount: meshSubmissionDiagnostics?.lineTopologySubmissionFailedInsufficientStreamCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCommandCount: meshSubmissionDiagnostics?.lineTopologySubmissionFailedInsufficientStreamCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailureReason: meshSubmissionDiagnostics?.lineTopologySubmissionFailureReason ?? "none",
      webglNativeMeshLineTopologySubmissionFailureSummary: meshSubmissionDiagnostics?.lineTopologySubmissionFailureSummary ?? {
        failedCount: 0,
        latestReason: "none",
        missingLinesPrimitiveCount: 0,
        insufficientStreamCount: 0,
      },
      webglNativeMeshCapabilityGateCount: meshSubmissionDiagnostics?.submissionCapabilityGateCount ?? 0,
      webglFeatureCapabilityGateReason,
      webgpuFeatureCapabilityGateReason: "none",
      cacheHits: cacheHitCount,
      cacheMisses: cacheMissCount,
      frameReuseHits: cacheHitCount,
      frameReuseMisses: cacheMissCount,
      l0PreviewHitCount: cacheHitCount,
      l0PreviewMissCount: cacheMissCount,
      l1CompositeHitCount: cacheHitCount,
      l1CompositeMissCount: cacheMissCount,
      l2TileHitCount: cacheHitCount,
      l2TileMissCount: cacheMissCount,
      cacheFallbackReason: cacheMissCount > 0
        ? (renderPath === "packet"
          ? ENGINE_BACKEND_CACHE_FALLBACK_REASON.L0_PREVIEW_MISS
          : ENGINE_BACKEND_CACHE_FALLBACK_REASON.L1_BYPASS_INTERACTIVE)
        : ENGINE_BACKEND_CACHE_FALLBACK_REASON.NONE,
      tileCacheSize: payloadRectCount,
      tileDirtyCount: cacheMissCount > 0 ? payloadRectCount : 0,
      tileCacheTotalBytes: payloadRectCount * 64,
      tileUploadCount: cacheMissCount > 0 ? payloadRectCount : 0,
      tileRenderCount: payloadRectCount,
      visibleTileCount: payloadRectCount,
      tileSchedulerPendingCount: 0,
      gpuTextureBytes: payloadRectCount * 64,
      imageTextureBytes: payloadRectCount * 32,
      webglPreviewReuseMs: frameReuseHit ? 0.1 : 0,
      webglPlanBuildMs: 0.05 * payloadRectCount,
      webglTextureUploadMs: cacheMissCount > 0 ? 0.08 * payloadRectCount : 0,
      webglDrawSubmitMs: 0.04 * payloadRectCount,
      webglSnapshotCaptureMs: 0,
      webglModelRenderMs: renderPath === "model-complete" ? 0.2 : 0,
      webglPreviewExecutionMode: frameReuseHit ? "affine-snapshot" : "temporal-reprojection-required",
      webglPreviewExecutionSource: "backend-native",
      webglBudgetPressure: budgetPressure,
      webglBudgetPressureReason: resolveBudgetPressureReason(payloadRectCount),
      webglBudgetPressureSource: "backend-native",
      webglDrawSubmitBudgetMs: 4,
      webglTextureUploadBudgetBytes: 32768,
      webglTextureUploadTotalBudgetBytes: 131072,
      webglImageTextureUploadBudgetCount: 32,
      webglTextTextureUploadBudgetCount: 24,
      webglTilePreloadBudgetMs: 1,
      webglTilePreloadBudgetUploads: 8,
      webglOverlayPassBudgetMs: 1,
      webglDrawSubmitBudgetExceeded: payloadRectCount > 256,
      webglTextureUploadBudgetExceeded: payloadRectCount * 64 > 32768,
      webglOverlayBudgetExceeded: false,
      webglPredictorDirectionX: 0,
      webglPredictorDirectionY: 0,
      webglPredictorSpeedPxPerSec: 0,
      webglPredictorConfidence: frameReuseHit ? 0.8 : 0.2,
      webglPredictorPreloadRing: payloadRectCount > 64 ? 2 : 1,
      webglPredictorOverscanCssPx: payloadRectCount > 64 ? 48 : 24,
      webglPredictivePreloadEnqueueCount: payloadRectCount,
      webglPredictivePreloadProcessedCount: payloadRectCount,
      webglPredictivePreloadPrunedCount: 0,
      webglHighZoomTextSlaChecked: false,
      webglHighZoomTextSlaScale: 4,
      webglHighZoomTextSlaViolationCount: 0,
      webglDeferredTextTextureCount: 0,
      panScheduleRequestCount: payloadRectCount,
      tileSynchronousRebuildCount: cacheMissCount,
    });
  }

  return {
    mode: "webgl",
    resize(nextSurface) {
      currentSurface = nextSurface;
      currentContext = resolveContext(nextSurface);
    },
    renderFrame(timestampMs) {
      hooks?.onPresentAttempt?.(timestampMs);
      if (!currentContext) {
        currentContext = resolveContext(currentSurface);
      }
      if (!currentContext) {
        publishWebGLDiagnostics("none", "none", 0, "none");
        return;
      }

      if (
        typeof currentContext.viewport !== "function" ||
        typeof currentContext.clearColor !== "function" ||
        typeof currentContext.clear !== "function"
      ) {
        publishWebGLDiagnostics("none", "none", 0, "none");
        return;
      }

      const surfaceCanvas = currentSurface.canvas;
      const deviceWidth = surfaceCanvas?.width ?? currentSurface.width;
      const deviceHeight = surfaceCanvas?.height ?? currentSurface.height;
      const dpr = currentSurface.width > 0
        ? Math.max(1, deviceWidth / currentSurface.width)
        : 1;

      currentContext.viewport(0, 0, deviceWidth, deviceHeight);
      currentContext.clearColor(1, 1, 1, 1);
      currentContext.clear(currentContext.COLOR_BUFFER_BIT);

      const payload = hooks?.resolveNativeFramePayload?.(timestampMs);
      const payloadSignature = payload
        ? `${payload.translateX}:${payload.translateY}:${payload.scale}:${payload.rects.map((rect) => `${rect.x},${rect.y},${rect.width},${rect.height},${rect.fill}`).join("|")}`
        : "none";
      const payloadRectCount = payload?.rects.length ?? 0;
      const featureCapabilityGateReason = resolveFeatureCapabilityGateReason(payload?.nodes);
      let renderPath: "model-complete" | "packet" | "none" = "none";
      let meshSubmissionDiagnostics: WebGLNativeMeshSubmissionDiagnostics | undefined;
      if (payload) {
        meshSubmissionDiagnostics = presentNativeMeshPrimitives(
          currentContext,
          {
            translateX: payload.translateX,
            translateY: payload.translateY,
            scale: payload.scale,
            meshes: payload.meshes,
            lineTopologySubmissionEnabled: payload.lineTopologySubmissionEnabled,
          },
          deviceWidth,
          deviceHeight,
          dpr,
          nativeMeshPipelineCache,
          resolveNormalizedColor,
          payload.lineTopologySubmissionEnabled === true,
        );
        if (meshSubmissionDiagnostics.submittedMeshCount > 0) {
          renderPath = "model-complete";
          publishWebGLDiagnostics(
            renderPath,
            payloadSignature,
            payloadRectCount,
            featureCapabilityGateReason,
            meshSubmissionDiagnostics,
          );
          hooks?.onPresentCommitted?.(timestampMs);
          return;
        }
      }
      if (payload) {
        const composition = resolveOffscreenCompositionContext(deviceWidth, deviceHeight);
        if (composition) {
          const composed = drawRichNodesToCompositionContext(
            composition.context,
            {
              translateX: payload.translateX,
              translateY: payload.translateY,
              scale: payload.scale,
              nodes: payload.nodes,
            },
            deviceWidth,
            deviceHeight,
            dpr,
          );
          if (composed && presentCompositionTexture(currentContext, composition.canvas)) {
            renderPath = "model-complete";
            publishWebGLDiagnostics(
              renderPath,
              payloadSignature,
              payloadRectCount,
              featureCapabilityGateReason,
              meshSubmissionDiagnostics,
            );
            hooks?.onPresentCommitted?.(timestampMs);
            return;
          }
          // AI-TEMP: model-complete can resolve without visible primitives on some scenes; remove when node payload contract guarantees drawable visibility; ref DEX-065.4.
        }
      }
      if (
        payload &&
        payload.rects.length > 0 &&
        typeof currentContext.enable === "function" &&
        typeof currentContext.disable === "function" &&
        typeof currentContext.scissor === "function"
      ) {
        renderPath = "packet";
        currentContext.enable(currentContext.SCISSOR_TEST);
        for (const rect of payload.rects) {
          const screenX = (rect.x * payload.scale + payload.translateX) * dpr;
          const screenY = (rect.y * payload.scale + payload.translateY) * dpr;
          const screenW = Math.max(0, rect.width * payload.scale * dpr);
          const screenH = Math.max(0, rect.height * payload.scale * dpr);
          if (screenW <= 0 || screenH <= 0) {
            continue;
          }

          const x = Math.floor(screenX);
          const y = Math.floor(deviceHeight - (screenY + screenH));
          const width = Math.floor(screenW);
          const height = Math.floor(screenH);
          if (width <= 0 || height <= 0) {
            continue;
          }

          const [r, g, b, a] = resolveNormalizedColor(rect.fill);
          currentContext.scissor(x, y, width, height);
          currentContext.clearColor(r, g, b, a);
          currentContext.clear(currentContext.COLOR_BUFFER_BIT);
        }
        currentContext.disable(currentContext.SCISSOR_TEST);
      }

      publishWebGLDiagnostics(
        renderPath,
        payloadSignature,
        payloadRectCount,
        featureCapabilityGateReason,
        meshSubmissionDiagnostics,
      );
      hooks?.onPresentCommitted?.(timestampMs);
    },
    dispose() {
      if (currentContext) {
        disposeWebGLNativeMeshPipelineCache(currentContext, nativeMeshPipelineCache);
      }
      currentContext = null;
    },
  };
}
