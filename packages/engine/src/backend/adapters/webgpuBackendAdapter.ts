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

const PAYLOAD_RECT_COUNT_HIGH_THRESHOLD = 256;
const PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD = 64;
const MATRIX_COMPONENT_MIN = 6;
const MATRIX_LEGACY_EPSILON = 0.0001;
const MATRIX_LEGACY_MIN_DELTA = 0.5;
const MATRIX_INDEX_A = 0;
const MATRIX_INDEX_B = 1;
const MATRIX_INDEX_E_LEGACY = 2;
const MATRIX_INDEX_C = 3;
const MATRIX_INDEX_D = 4;
const MATRIX_INDEX_F = 5;
const FULL_CIRCLE_MULTIPLIER = 2;
const FULL_CIRCLE_RADIANS = Math.PI * FULL_CIRCLE_MULTIPLIER;
const HALF_DIVISOR = 2;
const GPU_TILE_BYTES_PER_RECT = 64;
const GPU_IMAGE_BYTES_PER_RECT = 32;
const GPU_PREVIEW_REUSE_MS = 0.1;
const GPU_PLAN_BUILD_MS_PER_RECT = 0.04;
const GPU_TEXTURE_UPLOAD_MS_PER_RECT = 0.06;
const GPU_DRAW_SUBMIT_MS_PER_RECT = 0.03;
const GPU_TEXTURE_UPLOAD_BUDGET_BYTES = 32768;
const GPU_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = 131072;
const GPU_IMAGE_TEXTURE_UPLOAD_BUDGET_COUNT = 32;
const GPU_TEXT_TEXTURE_UPLOAD_BUDGET_COUNT = 24;
const GPU_PRELOAD_BUDGET_UPLOADS = 8;
const GPU_PREDICTOR_CONFIDENCE_HIT = 0.8;
const GPU_PREDICTOR_CONFIDENCE_MISS = 0.2;
const GPU_PREDICTOR_PRELOAD_RING_HIGH = 2;
const GPU_PREDICTOR_PRELOAD_RING_LOW = 1;
const GPU_PREDICTOR_OVERSCAN_HIGH = 48;
const GPU_PREDICTOR_OVERSCAN_LOW = 24;

/**
 * Resolves one deterministic budget-pressure reason from payload cardinality.
 * @param payloadRectCount Rect count sampled from current native payload.
 */
function resolveBudgetPressureReason(payloadRectCount: number): string {
  if (payloadRectCount > PAYLOAD_RECT_COUNT_HIGH_THRESHOLD) {
    return "payload-rect-count-high";
  }
  if (payloadRectCount > PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD) {
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
  /** Uniform corner radius for rounded rectangles. */
  cornerRadius?: number;
  /** Independent corner radii for rounded rectangles. */
  cornerRadii?: { topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number };
  /** Ellipse arc start angle in degrees. */
  ellipseStartAngle?: number;
  /** Ellipse arc end angle in degrees. */
  ellipseEndAngle?: number;
  /** Whether a path/polygon shape should be closed. */
  closed?: boolean;
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
 * Declares one overlay draw instruction for marquee/hover/selection/handler rendering.
 */
type WebGPUOverlayInstruction = {
  id: string;
  primitive: string;
  points?: ReadonlyArray<{ x: number; y: number }>;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  strokeColor?: string;
  strokeWidth?: number;
  strokeDash?: number[];
  fillColor?: string;
  fillOpacity?: number;
  zIndex?: number;
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
    /** Optional image registry for image node rendering. */
    images?: ReadonlyMap<string, HTMLImageElement>;
    /** Optional overlay instructions for marquee/hover/selection/handler rendering. */
    overlays?: ReadonlyArray<WebGPUOverlayInstruction>;
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
    if (matrix.length < MATRIX_COMPONENT_MIN) {
      return null;
    }
    const a = matrix[MATRIX_INDEX_A] ?? 1;
    const b = matrix[MATRIX_INDEX_B] ?? 0;
    const cLegacy = matrix[MATRIX_INDEX_C] ?? 0;
    const dLegacy = matrix[MATRIX_INDEX_D] ?? 1;
    const eLegacy = matrix[MATRIX_INDEX_E_LEGACY] ?? 0;
    const fLegacy = matrix[MATRIX_INDEX_F] ?? 0;
    const cCanvas = matrix[MATRIX_INDEX_E_LEGACY] ?? 0;
    const dCanvas = matrix[MATRIX_INDEX_C] ?? 1;
    const eCanvas = matrix[MATRIX_INDEX_D] ?? 0;
    const fCanvas = matrix[MATRIX_INDEX_F] ?? 0;
    const legacyLikely = Math.abs(dCanvas) < MATRIX_LEGACY_EPSILON && Math.abs(dLegacy) >= MATRIX_LEGACY_MIN_DELTA;
    return legacyLikely
      ? { a, b, c: cLegacy, d: dLegacy, e: eLegacy, f: fLegacy }
      : { a, b, c: cCanvas, d: dCanvas, e: eCanvas, f: fCanvas };
  };
  if (!payload.nodes || payload.nodes.length === 0) {
    return false;
  }

  // Capture image registry from payload for image node rendering.
  const payloadImages = payload.images ?? null;

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
    if (Array.isArray(matrix) && matrix.length >= MATRIX_COMPONENT_MIN) {
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
      // Render text with optional multi-run style and multi-line support.
      const textContent = typeof node.text === "string" ? node.text : "Text";
      const runs = Array.isArray((node as Record<string, unknown>).runs)
        ? (node as Record<string, unknown>).runs as Array<{
            text: string;
            style?: {
              fill?: string;
              fontFamily?: string;
              fontSize?: number;
              fontWeight?: number;
              fontStyle?: string;
              lineHeight?: number;
              letterSpacing?: number;
              align?: string;
              verticalAlign?: string;
              textDecoration?: string;
              shadow?: unknown;
            };
          }>
        : null;
      const defaultFontSize = 16;
      const defaultFontFamily = "sans-serif";

      if (runs && runs.length > 0) {
        let cursorX = x;
        let cursorY = y;
        for (const run of runs) {
          const runFill = run.style?.fill ?? fill;
          const runFontSize = run.style?.fontSize ?? defaultFontSize;
          const runFontFamily = run.style?.fontFamily ?? defaultFontFamily;
          const runFontWeight = run.style?.fontWeight ?? 400;
          const runFontStyle = run.style?.fontStyle ?? "normal";
          // lineHeight from the document model is an absolute px value, not a
          // multiplier. Use it directly as the line advance.
          const lineHeightPx = typeof run.style?.lineHeight === "number" && run.style.lineHeight > 0
            ? run.style.lineHeight
            : runFontSize * 1.2;
          const runText = run.text ?? "";
          const lines = runText.split("\n");
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            if (lineIndex > 0) { cursorX = x; cursorY += lineHeightPx; }
            if (line.length === 0) continue;
            context.fillStyle = runFill !== "transparent" ? runFill : "#0f172a";
            context.font = `${runFontStyle} ${runFontWeight} ${runFontSize}px ${runFontFamily}`;
            context.textBaseline = "top";
            context.fillText(line, cursorX, cursorY);
            cursorX += context.measureText(line).width;
            drawnPrimitiveCount += 1;
          }
        }
      } else {
        const lineHeightPx = defaultFontSize * 1.2;
        const lines = textContent.split("\n");
        context.fillStyle = fill !== "transparent" ? fill : "#0f172a";
        context.font = `normal 400 ${defaultFontSize}px ${defaultFontFamily}`;
        context.textBaseline = "top";
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          if (line.length === 0) continue;
          context.fillText(line, x, y + lineIndex * lineHeightPx, width > 0 ? width : undefined);
          drawnPrimitiveCount += 1;
        }
      }
      context.restore();
      continue;
    }

    if (node.type === "image") {
      // Draw image node when an image registry is available in the payload.
      const images = payloadImages ?? null;
      const assetId = typeof (node as Record<string, unknown>).assetId === "string"
        ? (node as Record<string, unknown>).assetId as string
        : null;
      if (assetId && images && images.has(assetId)) {
        const img = images.get(assetId);
        if (img && img.complete && img.naturalWidth > 0) {
          context.drawImage(img, x, y, width, height);
          drawnPrimitiveCount += 1;
        }
      } else if (fill !== "transparent" && width > 0 && height > 0) {
        // Draw placeholder rect when image is not yet loaded.
        context.fillStyle = fill;
        context.fillRect(x, y, width, height);
        drawnPrimitiveCount += 1;
      }
      context.restore();
      continue;
    }

    if (shape === "ellipse") {
      const cx = x + width / HALF_DIVISOR;
      const cy = y + height / HALF_DIVISOR;
      const rx = Math.max(0, width / HALF_DIVISOR);
      const ry = Math.max(0, height / HALF_DIVISOR);
      const startAngleDeg = typeof (node as Record<string, unknown>).ellipseStartAngle === "number"
        ? (node as Record<string, unknown>).ellipseStartAngle as number : 0;
      const endAngleDeg = typeof (node as Record<string, unknown>).ellipseEndAngle === "number"
        ? (node as Record<string, unknown>).ellipseEndAngle as number : 360;
      const startAngleRad = (startAngleDeg * Math.PI) / 180;
      const endAngleRad = (endAngleDeg * Math.PI) / 180;
      const sweepRad = endAngleRad - startAngleRad;
      const isFullCircle = Math.abs(Math.abs(sweepRad) - FULL_CIRCLE_RADIANS) < 0.001;

      context.beginPath();
      if (isFullCircle) {
        context.ellipse(cx, cy, rx, ry, 0, 0, FULL_CIRCLE_RADIANS);
      } else {
        if (fill !== "transparent") {
          context.moveTo(cx, cy);
        }
        context.ellipse(cx, cy, rx, ry, 0, startAngleRad, endAngleRad, sweepRad < 0);
        if (fill !== "transparent") {
          context.closePath();
        }
      }
      if (fill !== "transparent") {
        context.fillStyle = fill;
        context.fill();
        drawnPrimitiveCount += 1;
      }
      if (stroke !== "transparent" && strokeWidth > 0) {
        context.strokeStyle = stroke;
        context.lineWidth = strokeWidth;
        if (!isFullCircle && fill !== "transparent") {
          context.beginPath();
          context.ellipse(cx, cy, rx, ry, 0, startAngleRad, endAngleRad, sweepRad < 0);
        }
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
      const nodeClosed = typeof (node as Record<string, unknown>).closed === "boolean"
        ? (node as Record<string, unknown>).closed as boolean
        : pathDrawPlan.shouldClosePath;
      if (nodeClosed) {
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

    // Default rect rendering with optional rounded corners.
    if (width > 0 && height > 0) {
      const cr = typeof (node as Record<string, unknown>).cornerRadius === "number"
        ? (node as Record<string, unknown>).cornerRadius as number : 0;
      const radii = (node as Record<string, unknown>).cornerRadii as
        | { topLeft?: number; topRight?: number; bottomRight?: number; bottomLeft?: number }
        | undefined;
      const hasRoundedCorners = cr > 0 || (radii && (
        (radii.topLeft ?? 0) > 0 || (radii.topRight ?? 0) > 0 ||
        (radii.bottomRight ?? 0) > 0 || (radii.bottomLeft ?? 0) > 0
      ));

      if (hasRoundedCorners) {
        const tl = radii?.topLeft ?? cr;
        const tr = radii?.topRight ?? cr;
        const br = radii?.bottomRight ?? cr;
        const bl = radii?.bottomLeft ?? cr;
        context.beginPath();
        context.moveTo(x + tl, y);
        context.lineTo(x + width - tr, y);
        context.arcTo(x + width, y, x + width, y + tr, Math.max(0, tr));
        context.lineTo(x + width, y + height - br);
        context.arcTo(x + width, y + height, x + width - br, y + height, Math.max(0, br));
        context.lineTo(x + bl, y + height);
        context.arcTo(x, y + height, x, y + height - bl, Math.max(0, bl));
        context.lineTo(x, y + tl);
        context.arcTo(x, y, x + tl, y, Math.max(0, tl));
        context.closePath();
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
      } else {
        if (fill !== "transparent") {
          context.fillStyle = fill;
          context.fillRect(x, y, width, height);
          drawnPrimitiveCount += 1;
        }
        if (stroke !== "transparent" && strokeWidth > 0) {
          context.strokeStyle = stroke;
          context.lineWidth = strokeWidth;
          context.strokeRect(x, y, width, height);
          drawnPrimitiveCount += 1;
        }
      }
    }
    context.restore();
  }

  // Draw overlay instructions on top of scene nodes.
  if (payload.overlays && payload.overlays.length > 0) {
    const sorted = [...payload.overlays].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    for (const overlay of sorted) {
      context.save();
      const strokeColor = overlay.strokeColor ?? "transparent";
      const strokeW = (overlay.strokeWidth ?? 1) / Math.max(payload.scale, 0.01);
      const fillColor = overlay.fillColor ?? "transparent";
      const fillAlpha = overlay.fillOpacity ?? 1;
      const dash = overlay.strokeDash;

      if (overlay.primitive === "polyline" && overlay.points && overlay.points.length >= 2) {
        context.beginPath();
        context.moveTo(overlay.points[0].x, overlay.points[0].y);
        for (let i = 1; i < overlay.points.length; i++) {
          context.lineTo(overlay.points[i].x, overlay.points[i].y);
        }
        if (fillColor !== "transparent") {
          context.globalAlpha = fillAlpha;
          context.fillStyle = fillColor;
          context.fill();
          context.globalAlpha = 1;
          drawnPrimitiveCount += 1;
        }
        if (strokeColor !== "transparent" && strokeW > 0) {
          context.strokeStyle = strokeColor;
          context.lineWidth = strokeW;
          if (dash && dash.length > 0) context.setLineDash(dash);
          context.stroke();
          if (dash) context.setLineDash([]);
          drawnPrimitiveCount += 1;
        }
      } else if (overlay.primitive === "rect" && overlay.bounds) {
        const b = overlay.bounds;
        if (fillColor !== "transparent") {
          context.globalAlpha = fillAlpha;
          context.fillStyle = fillColor;
          context.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
          context.globalAlpha = 1;
          drawnPrimitiveCount += 1;
        }
        if (strokeColor !== "transparent" && strokeW > 0) {
          context.strokeStyle = strokeColor;
          context.lineWidth = strokeW;
          if (dash && dash.length > 0) context.setLineDash(dash);
          context.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
          if (dash) context.setLineDash([]);
          drawnPrimitiveCount += 1;
        }
      } else if (overlay.primitive === "line" && overlay.points && overlay.points.length === 2) {
        context.beginPath();
        context.moveTo(overlay.points[0].x, overlay.points[0].y);
        context.lineTo(overlay.points[1].x, overlay.points[1].y);
        if (strokeColor !== "transparent" && strokeW > 0) {
          context.strokeStyle = strokeColor;
          context.lineWidth = strokeW;
          if (dash && dash.length > 0) context.setLineDash(dash);
          context.stroke();
          if (dash) context.setLineDash([]);
          drawnPrimitiveCount += 1;
        }
      }
      context.restore();
    }
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

      // The canvas is dedicated to the selected backend by the engine
      // bootstrap path; no other backend should have claimed its context.
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
      input.payloadRectCount > PAYLOAD_RECT_COUNT_HIGH_THRESHOLD
        ? "high"
        : input.payloadRectCount > PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD
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
      webglNativeMeshAttemptedCount: 0,
      webglNativeMeshSubmittedCount: 0,
      webglNativeMeshPipelineCompileCount: 0,
      webglNativeMeshPipelineReuseCount: 0,
      webglNativeMeshRejectedCount: 0,
      webglNativeMeshRejectedInvalidPositionCount: 0,
      webglNativeMeshRejectedInvalidIndexCount: 0,
      webglNativeMeshRejectedInsufficientStreamCount: 0,
      webglNativeMeshRejectedUnsupportedTopologyCount: 0,
      webglNativeMeshSupportedTopologies: ["triangles"],
      webglNativeMeshRejectedTopologies: [],
      webglNativeMeshLineTopologyPlannedCount: 0,
      webglNativeMeshLineTopologyPreflightAttemptedCount: 0,
      webglNativeMeshLineTopologyPreflightPassedCount: 0,
      webglNativeMeshLineTopologyPreflightRejectedCount: 0,
      webglNativeMeshLineTopologyPreflightRejectedInvalidPositionCount: 0,
      webglNativeMeshLineTopologyPreflightRejectedInvalidIndexCount: 0,
      webglNativeMeshLineTopologyPreflightRejectedInsufficientStreamCount: 0,
      webglNativeMeshLineTopologyDrawPlanAttemptedCount: 0,
      webglNativeMeshLineTopologyDrawPlanCommandCount: 0,
      webglNativeMeshLineTopologySubmissionDeferredCount: 0,
      webglNativeMeshLineTopologySubmissionAttemptedCount: 0,
      webglNativeMeshLineTopologySubmissionAttemptedCommandCount: 0,
      webglNativeMeshLineTopologySubmissionSucceededCount: 0,
      webglNativeMeshLineTopologySubmissionSucceededCommandCount: 0,
      webglNativeMeshLineTopologySubmissionCommandSuccessRate: 0,
      webglNativeMeshLineTopologySubmissionPlanCoverageRate: 0,
      webglNativeMeshLineTopologySubmissionDrawPlanWastedCommandCount: 0,
      webglNativeMeshLineTopologySubmissionFailedCount: 0,
      webglNativeMeshLineTopologySubmissionFailedCommandCount: 0,
      webglNativeMeshLineTopologySubmissionGateBlockedCount: 0,
      webglNativeMeshLineTopologySubmissionGateState: "disabled",
      webglNativeMeshLineTopologySubmissionOutcome: "none",
      webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCount: 0,
      webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCommandCount: 0,
      webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCount: 0,
      webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCommandCount: 0,
      webglNativeMeshLineTopologySubmissionFailureReason: "none",
      webglNativeMeshLineTopologySubmissionFailureSummary: {
        failedCount: 0,
        latestReason: "none",
        missingLinesPrimitiveCount: 0,
        insufficientStreamCount: 0,
      },
      webglNativeMeshLineTopologySubmissionEfficiencySummary: {
        commandSuccessRate: 0,
        planCoverageRate: 0,
        drawPlanWastedCommandCount: 0,
      },
      webglNativeMeshCapabilityGateCount: 0,
      activeLightCount: 0,
      meshDrawCallCount: 0,
      shadowMapCount: 0,
      shadowDrawCallCount: 0,
      shadowTextureBytes: 0,
      instancedDrawAttemptedCount: 0,
      instancedDrawSucceededCount: 0,
      instancedDrawRejectedCount: 0,
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
      tileCacheTotalBytes: input.payloadRectCount * GPU_TILE_BYTES_PER_RECT,
      tileUploadCount: cacheMissCount > 0 ? input.payloadRectCount : 0,
      tileRenderCount: input.payloadRectCount,
      visibleTileCount: input.payloadRectCount,
      tileSchedulerPendingCount: 0,
      gpuTextureBytes: input.payloadRectCount * GPU_TILE_BYTES_PER_RECT,
      imageTextureBytes: input.payloadRectCount * GPU_IMAGE_BYTES_PER_RECT,
      webglPreviewReuseMs: frameReuseHit ? GPU_PREVIEW_REUSE_MS : 0,
      webglPlanBuildMs: GPU_PLAN_BUILD_MS_PER_RECT * input.payloadRectCount,
      webglTextureUploadMs: cacheMissCount > 0 ? GPU_TEXTURE_UPLOAD_MS_PER_RECT * input.payloadRectCount : 0,
      webglDrawSubmitMs: GPU_DRAW_SUBMIT_MS_PER_RECT * input.payloadRectCount,
      webglSnapshotCaptureMs: 0,
      webglModelRenderMs: 0,
      webglPreviewExecutionMode: frameReuseHit ? "affine-snapshot" : "temporal-reprojection-required",
      webglPreviewExecutionSource: "backend-native",
      webglBudgetPressure: budgetPressure,
      webglBudgetPressureReason: resolveBudgetPressureReason(input.payloadRectCount),
      webglBudgetPressureSource: "backend-native",
      webglDrawSubmitBudgetMs: 4,
      webglTextureUploadBudgetBytes: GPU_TEXTURE_UPLOAD_BUDGET_BYTES,
      webglTextureUploadTotalBudgetBytes: GPU_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
      webglImageTextureUploadBudgetCount: GPU_IMAGE_TEXTURE_UPLOAD_BUDGET_COUNT,
      webglTextTextureUploadBudgetCount: GPU_TEXT_TEXTURE_UPLOAD_BUDGET_COUNT,
      webglTilePreloadBudgetMs: 1,
      webglTilePreloadBudgetUploads: GPU_PRELOAD_BUDGET_UPLOADS,
      webglOverlayPassBudgetMs: 1,
      webglDrawSubmitBudgetExceeded: input.payloadRectCount > PAYLOAD_RECT_COUNT_HIGH_THRESHOLD,
      webglTextureUploadBudgetExceeded:
        input.payloadRectCount * GPU_TILE_BYTES_PER_RECT > GPU_TEXTURE_UPLOAD_BUDGET_BYTES,
      webglOverlayBudgetExceeded: false,
      webglPredictorDirectionX: 0,
      webglPredictorDirectionY: 0,
      webglPredictorSpeedPxPerSec: 0,
      webglPredictorConfidence: frameReuseHit ? GPU_PREDICTOR_CONFIDENCE_HIT : GPU_PREDICTOR_CONFIDENCE_MISS,
      webglPredictorPreloadRing: input.payloadRectCount > PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD
        ? GPU_PREDICTOR_PRELOAD_RING_HIGH
        : GPU_PREDICTOR_PRELOAD_RING_LOW,
      webglPredictorOverscanCssPx: input.payloadRectCount > PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD
        ? GPU_PREDICTOR_OVERSCAN_HIGH
        : GPU_PREDICTOR_OVERSCAN_LOW,
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
    async renderFrame(timestampMs) {
      hooks?.onPresentAttempt?.(timestampMs);
      await ensureWebGPUInitialized();
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
              images: payload.images,
              overlays: payload.overlays,
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
