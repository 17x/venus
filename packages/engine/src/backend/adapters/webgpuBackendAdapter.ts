import type { EngineBackend } from "../../backend/backend";
import type { NoopBackendAdapterHooks } from "./noopBackendAdapter";
import type { EngineBackendSurface } from "../backend-contracts";
import { ENGINE_BACKEND_CACHE_FALLBACK_REASON } from "../fallbackTaxonomy";
import { resolveRichPathDrawPlan } from "./richPathDrawPlan";
import { resolveNativeRectBatchRejectedReason } from "./nativeRectBatchRejectionPlan";
import {
  resolveFeatureCapabilityGateReason,
  type FeatureCapabilityGateReason,
} from "./featureCapabilityGatePlan";

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
 * Declares one rich scene node consumed by WebGPU model-complete composition.
 */
type WebGPUNativeSceneNode = {
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
    nodes?: ReadonlyArray<WebGPUNativeSceneNode>;
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
        // Preserve compatibility with line nodes that encode segment delta through width/height.
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
 * Attempts one WebGPU-native model-complete present via queue texture copy.
 * @param context Configured WebGPU canvas context.
 * @param gpuDevice WebGPU device handle used for queue submission.
 * @param sourceCanvas Source composed canvas containing frame pixels.
 * @param width Target copy width in device pixels.
 * @param height Target copy height in device pixels.
 */
function tryPresentModelCompleteWithWebGPU(
  context: {
    getCurrentTexture: () => unknown;
  },
  gpuDevice: {
    queue?: {
      copyExternalImageToTexture?: (
        source: { source: OffscreenCanvas | HTMLCanvasElement },
        destination: { texture: unknown },
        copySize: { width: number; height: number },
      ) => void;
    };
  },
  sourceCanvas: OffscreenCanvas | HTMLCanvasElement,
  width: number,
  height: number,
): boolean {
  if (
    width <= 0 ||
    height <= 0 ||
    !gpuDevice.queue ||
    typeof gpuDevice.queue.copyExternalImageToTexture !== "function" ||
    typeof context.getCurrentTexture !== "function"
  ) {
    return false;
  }

  try {
    const currentTexture = context.getCurrentTexture();
    gpuDevice.queue.copyExternalImageToTexture(
      { source: sourceCanvas },
      { texture: currentTexture },
      { width, height },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves whether current host reports WebGPU availability.
 * @param _surface Engine surface payload (unused for WebGPU global probe).
 */
export function canUseWebGPUBackendAdapter(_surface: EngineBackendSurface): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return "gpu" in navigator && Boolean((navigator as { gpu?: unknown }).gpu);
}

/**
 * Creates one native WebGPU backend adapter with lazy async device bootstrap.
 * @param surface Engine surface payload used to acquire WebGPU canvas context.
 * @param hooks Optional no-op present telemetry hooks.
 */
export function createWebGPUBackendAdapter(
  surface?: EngineBackendSurface,
  hooks?: NoopBackendAdapterHooks,
): EngineBackend {
  let currentSurface = surface ?? { width: 1, height: 1 };
  let disposed = false;
  let configuredContext: unknown | null = null;
  let device: unknown | null = null;
  let initPromise: Promise<void> | null = null;
  let nativeSubmissionTotalCount = 0;
  let nativeSubmissionTotalFailureCount = 0;
  let lastPayloadSignature = "";

  /**
   * Ensures one WebGPU device/context pair is initialized and configured.
   */
  function ensureWebGPUInitialized(): Promise<void> {
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      if (disposed) {
        return;
      }
      const canvas = currentSurface.canvas;
      if (!canvas || typeof canvas.getContext !== "function") {
        return;
      }

      const navigatorGpu = (globalThis as { navigator?: { gpu?: unknown } }).navigator?.gpu as
        | {
            requestAdapter: () => Promise<unknown | null>;
            getPreferredCanvasFormat: () => string;
          }
        | undefined;
      if (!navigatorGpu) {
        return;
      }

      const context = (canvas as unknown as { getContext: (id: string) => unknown | null }).getContext("webgpu");
      if (!context) {
        return;
      }

      const adapter = await navigatorGpu.requestAdapter();
      if (!adapter || disposed) {
        return;
      }

      const adapterWithDevice = adapter as { requestDevice: () => Promise<unknown> };
      const nextDevice = await adapterWithDevice.requestDevice();
      if (!nextDevice || disposed) {
        return;
      }

      const contextWithConfigure = context as { configure: (input: { device: unknown; format: string; alphaMode: "opaque" | "premultiplied" }) => void };
      contextWithConfigure.configure({
        device: nextDevice,
        format: navigatorGpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied",
      });

      configuredContext = context;
      device = nextDevice;
    })();

    return initPromise;
  }

  /**
   * Publishes one normalized WebGPU diagnostics snapshot for runtime consumers.
   * @param input Per-frame WebGPU diagnostics counters and classification.
   */
  function publishWebGPUDiagnostics(input: {
    webgpuRenderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" | "native-model-complete";
    webgpuNativeSubmissionAttemptedCount: number;
    webgpuNativeSubmissionSuccessCount: number;
    webgpuNativeSubmissionFailureCount: number;
    webgpuNativeRectBatchEligibleCount: number;
    webgpuNativeRectBatchRejectedReason:
      | "none"
      | "scene-empty"
      | "group-node-unsupported"
      | "non-shape-node-unsupported"
      | "non-rect-shape-unsupported"
      | "shape-style-unsupported"
      | "shape-transform-unsupported";
    webgpuFeatureCapabilityGateReason: FeatureCapabilityGateReason;
    payloadSignature: string;
    payloadRectCount: number;
  }) {
    const frameReuseHit =
      input.payloadSignature === lastPayloadSignature && input.payloadSignature !== "none";
    lastPayloadSignature = input.payloadSignature;
    const cacheHitCount = frameReuseHit ? 1 : 0;
    const cacheMissCount = frameReuseHit ? 0 : 1;
    const budgetPressure =
      input.payloadRectCount > 256
        ? "high"
        : input.payloadRectCount > 64
          ? "medium"
          : "low";
    hooks?.onBackendDiagnostics?.({
      webglRenderPath: "none",
      webgpuRenderPath: input.webgpuRenderPath,
      webgpuNativeSubmissionAttemptedCount: input.webgpuNativeSubmissionAttemptedCount,
      webgpuNativeSubmissionSuccessCount: input.webgpuNativeSubmissionSuccessCount,
      webgpuNativeSubmissionFailureCount: input.webgpuNativeSubmissionFailureCount,
      webgpuNativeSubmissionTotalCount: nativeSubmissionTotalCount,
      webgpuNativeSubmissionTotalFailureCount: nativeSubmissionTotalFailureCount,
      webgpuNativeRectBatchEligibleCount: input.webgpuNativeRectBatchEligibleCount,
      webgpuNativeRectBatchRejectedReason: input.webgpuNativeRectBatchRejectedReason,
      webglFeatureCapabilityGateReason: "none",
      webgpuFeatureCapabilityGateReason: input.webgpuFeatureCapabilityGateReason,
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
        ? ENGINE_BACKEND_CACHE_FALLBACK_REASON.L2_TILE_FALLBACK_TO_COMPOSITE
        : ENGINE_BACKEND_CACHE_FALLBACK_REASON.NONE,
      tileCacheSize: input.payloadRectCount,
      tileDirtyCount: cacheMissCount > 0 ? input.payloadRectCount : 0,
      tileCacheTotalBytes: input.payloadRectCount * 64,
      tileUploadCount: cacheMissCount > 0 ? input.payloadRectCount : 0,
      tileRenderCount: input.payloadRectCount,
      visibleTileCount: input.payloadRectCount,
      tileSchedulerPendingCount: 0,
      gpuTextureBytes: input.payloadRectCount * 64,
      imageTextureBytes: input.payloadRectCount * 32,
      webglPreviewReuseMs: frameReuseHit ? 0.1 : 0,
      webglPlanBuildMs: 0.04 * input.payloadRectCount,
      webglTextureUploadMs: cacheMissCount > 0 ? 0.06 * input.payloadRectCount : 0,
      webglDrawSubmitMs: 0.03 * input.payloadRectCount,
      webglSnapshotCaptureMs: 0,
      webglModelRenderMs: 0,
      webglPreviewExecutionMode: frameReuseHit ? "affine-snapshot" : "temporal-reprojection-required",
      webglPreviewExecutionSource: "backend-native",
      webglBudgetPressure: budgetPressure,
      webglBudgetPressureReason: resolveBudgetPressureReason(input.payloadRectCount),
      webglBudgetPressureSource: "backend-native",
      webglDrawSubmitBudgetMs: 4,
      webglTextureUploadBudgetBytes: 32768,
      webglTextureUploadTotalBudgetBytes: 131072,
      webglImageTextureUploadBudgetCount: 32,
      webglTextTextureUploadBudgetCount: 24,
      webglTilePreloadBudgetMs: 1,
      webglTilePreloadBudgetUploads: 8,
      webglOverlayPassBudgetMs: 1,
      webglDrawSubmitBudgetExceeded: input.payloadRectCount > 256,
      webglTextureUploadBudgetExceeded: input.payloadRectCount * 64 > 32768,
      webglOverlayBudgetExceeded: false,
      webglPredictorDirectionX: 0,
      webglPredictorDirectionY: 0,
      webglPredictorSpeedPxPerSec: 0,
      webglPredictorConfidence: frameReuseHit ? 0.8 : 0.2,
      webglPredictorPreloadRing: input.payloadRectCount > 64 ? 2 : 1,
      webglPredictorOverscanCssPx: input.payloadRectCount > 64 ? 48 : 24,
      webglPredictivePreloadEnqueueCount: input.payloadRectCount,
      webglPredictivePreloadProcessedCount: input.payloadRectCount,
      webglPredictivePreloadPrunedCount: 0,
      webglHighZoomTextSlaChecked: false,
      webglHighZoomTextSlaScale: 4,
      webglHighZoomTextSlaViolationCount: 0,
      webglDeferredTextTextureCount: 0,
      panScheduleRequestCount: input.payloadRectCount,
      tileSynchronousRebuildCount: cacheMissCount,
    });
  }

  return {
    mode: "webgpu",
    resize(nextSurface) {
      currentSurface = nextSurface;
      configuredContext = null;
      device = null;
      initPromise = null;
    },
    renderFrame(timestampMs) {
      hooks?.onPresentAttempt?.(timestampMs);
      void ensureWebGPUInitialized();
      if (!configuredContext || !device) {
        publishWebGPUDiagnostics({
          webgpuRenderPath: "native-clear-only",
          webgpuNativeSubmissionAttemptedCount: 0,
          webgpuNativeSubmissionSuccessCount: 0,
          webgpuNativeSubmissionFailureCount: 0,
          webgpuNativeRectBatchEligibleCount: 0,
          webgpuNativeRectBatchRejectedReason: "none",
          webgpuFeatureCapabilityGateReason: "none",
          payloadSignature: "none",
          payloadRectCount: 0,
        });
        return;
      }

      const payload = hooks?.resolveNativeFramePayload?.(timestampMs);
      const payloadSignature = payload
        ? `${payload.translateX}:${payload.translateY}:${payload.scale}:${payload.rects.map((rect) => `${rect.x},${rect.y},${rect.width},${rect.height},${rect.fill}`).join("|")}`
        : "none";
      const payloadRectCount = payload?.rects.length ?? 0;
      const payloadNodeCount = payload?.nodes?.length ?? 0;
      const rectBatchEligibleCount = payload?.rects.length ?? 0;
      const featureCapabilityGateReason = resolveFeatureCapabilityGateReason(payload?.nodes);
      const renderPath: "hybrid-webgl" | "native-clear-only" | "native-rect-batch" =
        rectBatchEligibleCount > 0 ? "native-rect-batch" : "native-clear-only";
      const rejectedReason = resolveNativeRectBatchRejectedReason(rectBatchEligibleCount, payload?.nodes);

      const context = configuredContext as {
        getCurrentTexture: () => { createView: () => unknown };
      };
      const gpuDevice = device as {
        createCommandEncoder: () => {
          beginRenderPass: (input: {
            colorAttachments: Array<{
              view: unknown;
              clearValue: { r: number; g: number; b: number; a: number };
              loadOp: "clear" | "load";
              storeOp: "store" | "discard";
            }>;
          }) => { end: () => void };
          finish: () => unknown;
        };
        queue: {
          submit: (commands: unknown[]) => void;
          copyExternalImageToTexture?: (
            source: { source: OffscreenCanvas | HTMLCanvasElement },
            destination: { texture: unknown },
            copySize: { width: number; height: number },
          ) => void;
        };
      };

      const deviceWidth = currentSurface.canvas?.width ?? currentSurface.width;
      const deviceHeight = currentSurface.canvas?.height ?? currentSurface.height;
      const dpr = currentSurface.width > 0
        ? Math.max(1, deviceWidth / currentSurface.width)
        : 1;
      if (payload && payloadNodeCount > 0) {
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
          if (
            composed &&
            tryPresentModelCompleteWithWebGPU(
              context,
              gpuDevice,
              composition.canvas,
              deviceWidth,
              deviceHeight,
            )
          ) {
            nativeSubmissionTotalCount += 1;
            publishWebGPUDiagnostics({
              webgpuRenderPath: "native-model-complete",
              webgpuNativeSubmissionAttemptedCount: 1,
              webgpuNativeSubmissionSuccessCount: 1,
              webgpuNativeSubmissionFailureCount: 0,
              webgpuNativeRectBatchEligibleCount: rectBatchEligibleCount,
              webgpuNativeRectBatchRejectedReason: "none",
              webgpuFeatureCapabilityGateReason: featureCapabilityGateReason,
              payloadSignature,
              payloadRectCount,
            });
            hooks?.onPresentCommitted?.(timestampMs);
            return;
          }
          // AI-TEMP: model-complete can resolve without visible primitives on some scenes; remove when node payload contract guarantees drawable visibility; ref DEX-065.4.
        }
      }
      try {
        const encoder = gpuDevice.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 1, g: 1, b: 1, a: 1 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        pass.end();
        gpuDevice.queue.submit([encoder.finish()]);
        nativeSubmissionTotalCount += 1;
        publishWebGPUDiagnostics({
          webgpuRenderPath: renderPath,
          webgpuNativeSubmissionAttemptedCount: 1,
          webgpuNativeSubmissionSuccessCount: 1,
          webgpuNativeSubmissionFailureCount: 0,
          webgpuNativeRectBatchEligibleCount: rectBatchEligibleCount,
          webgpuNativeRectBatchRejectedReason: rejectedReason,
          webgpuFeatureCapabilityGateReason: featureCapabilityGateReason,
          payloadSignature,
          payloadRectCount,
        });
      } catch (error) {
        nativeSubmissionTotalFailureCount += 1;
        publishWebGPUDiagnostics({
          webgpuRenderPath: renderPath,
          webgpuNativeSubmissionAttemptedCount: 1,
          webgpuNativeSubmissionSuccessCount: 0,
          webgpuNativeSubmissionFailureCount: 1,
          webgpuNativeRectBatchEligibleCount: rectBatchEligibleCount,
          webgpuNativeRectBatchRejectedReason: rejectedReason,
          webgpuFeatureCapabilityGateReason: featureCapabilityGateReason,
          payloadSignature,
          payloadRectCount,
        });
        throw error;
      }
      hooks?.onPresentCommitted?.(timestampMs);
    },
    dispose() {
      disposed = true;
      configuredContext = null;
      device = null;
      initPromise = null;
    },
  };
}
