import type { EngineBackend } from "../../backend/backend";
import type { NoopBackendAdapterHooks } from "./noopBackendAdapter";
import type { EngineBackendSurface } from "../backend-contracts";
import { ENGINE_BACKEND_CACHE_FALLBACK_REASON } from "../fallbackTaxonomy";
import {
  applyRichNodeCanvasClip,
  applyRichNodeCanvasShadow,
  buildRichNodeEllipsePath,
  buildRichNodePath,
  buildRichNodeRoundedRectPath,
  resolveRichNodeCanvasShadow,
  resolveRichNodeCanvasTransform,
  resolveRichNodeTextFragments,
} from "./richNodeComposition";
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

const HEX_SHORT_LENGTH = 3;
const HEX_LONG_LENGTH = 6;
const HEX_RADIX = 16;
const BYTE_CHANNEL_MAX = 255;
const DEFAULT_ALPHA = 1;
const DEFAULT_FALLBACK_RED = 0.1;
const DEFAULT_FALLBACK_GREEN = 0.16;
const DEFAULT_FALLBACK_BLUE = 0.25;
const DEFAULT_FALLBACK_RGBA: [number, number, number, number] = [
  DEFAULT_FALLBACK_RED,
  DEFAULT_FALLBACK_GREEN,
  DEFAULT_FALLBACK_BLUE,
  DEFAULT_ALPHA,
];
const PAYLOAD_RECT_COUNT_HIGH_THRESHOLD = 256;
const PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD = 64;
const MATRIX_INDEX_C = 2;
const MATRIX_INDEX_F = 5;
const FULL_CIRCLE_MULTIPLIER = 2;
const FULL_CIRCLE_RADIANS = Math.PI * FULL_CIRCLE_MULTIPLIER;
const RGB_CHANNEL_MIN = 3;
const RGB_NON_ALPHA_LAST_INDEX = 2;
const RGB_ALPHA_CHANNEL_INDEX = 3;
const HEX_PAIR_LENGTH = 2;
const HEX_GREEN_PAIR_START = 2;
const HEX_BLUE_PAIR_START = 4;
const QUAD_VERTEX_STRIDE_COMPONENT_COUNT = 4;
const ATTRIBUTE_COMPONENT_COUNT = 2;
const TRIANGLE_STRIP_VERTEX_COUNT = 4;
const GL_TILE_BYTES_PER_RECT = 64;
const GL_IMAGE_BYTES_PER_RECT = 32;
const GL_PREVIEW_REUSE_MS = 0.1;
const GL_PLAN_BUILD_MS_PER_RECT = 0.05;
const GL_TEXTURE_UPLOAD_MS_PER_RECT = 0.08;
const GL_DRAW_SUBMIT_MS_PER_RECT = 0.04;
const GL_MODEL_RENDER_MS = 0.2;
const GL_TEXTURE_UPLOAD_BUDGET_BYTES = 32768;
const GL_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES = 131072;
const GL_IMAGE_TEXTURE_UPLOAD_BUDGET_COUNT = 32;
const GL_TEXT_TEXTURE_UPLOAD_BUDGET_COUNT = 24;
const GL_PRELOAD_BUDGET_UPLOADS = 8;
const GL_PREDICTOR_CONFIDENCE_HIT = 0.8;
const GL_PREDICTOR_CONFIDENCE_MISS = 0.2;
const GL_PREDICTOR_PRELOAD_RING_HIGH = 2;
const GL_PREDICTOR_PRELOAD_RING_LOW = 1;
const GL_PREDICTOR_OVERSCAN_HIGH = 48;
const GL_PREDICTOR_OVERSCAN_LOW = 24;

/**
 * Parses a CSS-like hex/rgb color token into normalized RGBA channels.
 * @param color Raw color token from frame payload.
 */
function resolveNormalizedColor(color: string): [number, number, number, number] {
  const normalized = color.trim().toLowerCase();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === HEX_SHORT_LENGTH) {
      const r = Number.parseInt(hex[0] + hex[0], HEX_RADIX);
      const g = Number.parseInt(hex[1] + hex[1], HEX_RADIX);
        const b = Number.parseInt(
          hex[MATRIX_INDEX_C] + hex[MATRIX_INDEX_C],
          HEX_RADIX,
        );
      return [r / BYTE_CHANNEL_MAX, g / BYTE_CHANNEL_MAX, b / BYTE_CHANNEL_MAX, DEFAULT_ALPHA];
    }
    if (hex.length === HEX_LONG_LENGTH) {
      const r = Number.parseInt(hex.slice(0, HEX_PAIR_LENGTH), HEX_RADIX);
      const g = Number.parseInt(
        hex.slice(HEX_GREEN_PAIR_START, HEX_BLUE_PAIR_START),
        HEX_RADIX,
      );
      const b = Number.parseInt(
        hex.slice(HEX_BLUE_PAIR_START, MATRIX_INDEX_F),
        HEX_RADIX,
      );
      return [r / BYTE_CHANNEL_MAX, g / BYTE_CHANNEL_MAX, b / BYTE_CHANNEL_MAX, DEFAULT_ALPHA];
    }
  }
  const rgbMatch = normalized.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const channels = rgbMatch[1].split(",").map((entry) => Number.parseFloat(entry.trim()));
    if (
      channels.length >= RGB_CHANNEL_MIN
      && channels.every((entry, index) => index > RGB_NON_ALPHA_LAST_INDEX || Number.isFinite(entry))
    ) {
      const alpha = Number.isFinite(channels[RGB_ALPHA_CHANNEL_INDEX])
        ? Math.max(0, Math.min(DEFAULT_ALPHA, channels[RGB_ALPHA_CHANNEL_INDEX]))
        : DEFAULT_ALPHA;
      return [
        Math.max(0, Math.min(BYTE_CHANNEL_MAX, channels[0])) / BYTE_CHANNEL_MAX,
        Math.max(0, Math.min(BYTE_CHANNEL_MAX, channels[1])) / BYTE_CHANNEL_MAX,
          Math.max(0, Math.min(BYTE_CHANNEL_MAX, channels[MATRIX_INDEX_C])) / BYTE_CHANNEL_MAX,
        alpha,
      ];
    }
  }
  return DEFAULT_FALLBACK_RGBA;
}

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
  clipRule?: "nonzero" | "evenodd";
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
type WebGLOverlayInstruction = {
  /** Stable overlay id. */
  id: string;
  /** Primitive kind: polyline, rect, ellipse, line. */
  primitive: string;
  /** World-space point geometry. */
  points?: ReadonlyArray<{ x: number; y: number }>;
  /** World-space bounds for rect/ellipse. */
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  /** Stroke style. */
  strokeColor?: string;
  /** Stroke width in world units. */
  strokeWidth?: number;
  /** Stroke dash array. */
  strokeDash?: number[];
  /** Fill color. */
  fillColor?: string;
  /** Fill opacity. */
  fillOpacity?: number;
  /** Point-handle radius in world units. */
  pointRadius?: number;
  /** Whether stroke should not scale with zoom. */
  nonScalingStroke?: boolean;
  /** Layer z-index for ordering. */
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
    nodes?: ReadonlyArray<WebGLNativeSceneNode>;
    /** Optional image registry for image node rendering. */
    images?: ReadonlyMap<string, HTMLImageElement>;
    /** Optional overlay instructions for marquee/hover/selection/handler rendering. */
    overlays?: ReadonlyArray<WebGLOverlayInstruction>;
  },
  deviceWidth: number,
  deviceHeight: number,
  dpr: number,
): boolean {
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
  const nodeById = new Map(payload.nodes.map((node) => [node.id, node]));

  for (const node of payload.nodes) {
    if (node.type === "group") {
      continue;
    }
    context.save();
    applyRichNodeCanvasClip(context, node, nodeById);
    const matrix = node.transform?.matrix;
    if (Array.isArray(matrix)) {
      const resolvedMatrix = resolveRichNodeCanvasTransform(matrix);
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
    applyRichNodeCanvasShadow(context, resolveRichNodeCanvasShadow(node.shadow));

    if (node.type === "text") {
      const nodeRecord = node as Record<string, unknown>;
      const fragments = resolveRichNodeTextFragments({
        text: typeof node.text === "string" ? node.text : "Text",
        textRuns: nodeRecord.runs ?? node.textRuns,
        fill,
        x,
        y,
        width,
        measureTextWidth: (line, font) => {
          context.font = font;
          return context.measureText(line).width;
        },
      });
      for (const fragment of fragments) {
        context.fillStyle = fragment.fill;
        context.font = fragment.font;
        context.textBaseline = "top";
        context.fillText(fragment.text, fragment.x, fragment.y, fragment.maxWidth);
        drawnPrimitiveCount += 1;
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
      if (!buildRichNodeEllipsePath(context, node, x, y, width, height)) {
        context.restore();
        continue;
      }
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

    if (buildRichNodePath(context, node, shape, x, y, width, height)) {
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
      if (buildRichNodeRoundedRectPath(context, node, x, y, width, height)) {
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
      // AI-TEMP: non-scaling stroke divides by zoom scale so overlay lines
      // remain 1 CSS-px wide regardless of zoom. Remove when engine exposes
      // a proper non-scaling-stroke pipeline; ref DEX-114.
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
          if (dash && dash.length > 0) {
            context.setLineDash(dash);
          }
          context.stroke();
          if (dash) {
            context.setLineDash([]);
          }
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
          if (dash && dash.length > 0) {
            context.setLineDash(dash);
          }
          context.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
          if (dash) {
            context.setLineDash([]);
          }
          drawnPrimitiveCount += 1;
        }
      } else if (overlay.primitive === "line" && overlay.points && overlay.points.length === 2) {
        context.beginPath();
        context.moveTo(overlay.points[0].x, overlay.points[0].y);
        context.lineTo(overlay.points[1].x, overlay.points[1].y);
        if (strokeColor !== "transparent" && strokeW > 0) {
          context.strokeStyle = strokeColor;
          context.lineWidth = strokeW;
          if (dash && dash.length > 0) {
            context.setLineDash(dash);
          }
          context.stroke();
          if (dash) {
            context.setLineDash([]);
          }
          drawnPrimitiveCount += 1;
        }
      } else if (overlay.primitive === "handle" && overlay.points && overlay.points.length >= 1) {
        const point = overlay.points[0];
        const radius = Math.max(0, overlay.pointRadius ?? strokeW * 3);
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, FULL_CIRCLE_RADIANS);
        if (fillColor !== "transparent") {
          context.fillStyle = fillColor;
          context.fill();
          drawnPrimitiveCount += 1;
        }
        if (strokeColor !== "transparent" && strokeW > 0) {
          context.strokeStyle = strokeColor;
          context.lineWidth = strokeW;
          context.stroke();
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
  const stride = QUAD_VERTEX_STRIDE_COMPONENT_COUNT * Float32Array.BYTES_PER_ELEMENT;
  const positionLocation = context.getAttribLocation(program, "aPosition");
  const uvLocation = context.getAttribLocation(program, "aUv");
  if (positionLocation >= 0) {
    context.enableVertexAttribArray(positionLocation);
    context.vertexAttribPointer(
      positionLocation,
      ATTRIBUTE_COMPONENT_COUNT,
      context.FLOAT,
      false,
      stride,
      0,
    );
  }
  if (uvLocation >= 0) {
    context.enableVertexAttribArray(uvLocation);
    context.vertexAttribPointer(
      uvLocation,
      ATTRIBUTE_COMPONENT_COUNT,
      context.FLOAT,
      false,
      stride,
      ATTRIBUTE_COMPONENT_COUNT * Float32Array.BYTES_PER_ELEMENT,
    );
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
  context.drawArrays(context.TRIANGLE_STRIP, 0, TRIANGLE_STRIP_VERTEX_COUNT);
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
    * @param nextSurface Surface payload that may contain a WebGL-capable canvas.
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
    activeLightCount: number,
    meshSubmissionDiagnostics?: WebGLNativeMeshSubmissionDiagnostics,
  ) {
    const frameReuseHit = payloadSignature === lastPayloadSignature && payloadSignature !== "none";
    lastPayloadSignature = payloadSignature;
    const cacheHitCount = frameReuseHit ? 1 : 0;
    const cacheMissCount = frameReuseHit ? 0 : 1;
    const budgetPressure = payloadRectCount > PAYLOAD_RECT_COUNT_HIGH_THRESHOLD
      ? "high"
      : payloadRectCount > PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD
        ? "medium"
        : "low";
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
      webglNativeMeshRejectedInvalidPositionCount:
        meshSubmissionDiagnostics?.rejectedMeshInvalidPositionCount ?? 0,
      webglNativeMeshRejectedInvalidIndexCount:
        meshSubmissionDiagnostics?.rejectedMeshInvalidIndexCount ?? 0,
      webglNativeMeshRejectedInsufficientStreamCount:
        meshSubmissionDiagnostics?.rejectedMeshInsufficientStreamCount ?? 0,
      webglNativeMeshRejectedUnsupportedTopologyCount:
        meshSubmissionDiagnostics?.rejectedMeshUnsupportedTopologyCount ?? 0,
      webglNativeMeshSupportedTopologies: meshSubmissionDiagnostics?.supportedTopologies ?? ["triangles"],
      webglNativeMeshRejectedTopologies: meshSubmissionDiagnostics?.rejectedTopologies ?? [],
      webglNativeMeshLineTopologyPlannedCount: meshSubmissionDiagnostics?.lineTopologyPlannedCount ?? 0,
      webglNativeMeshLineTopologyPreflightAttemptedCount:
        meshSubmissionDiagnostics?.lineTopologyPreflightAttemptedCount ?? 0,
      webglNativeMeshLineTopologyPreflightPassedCount:
        meshSubmissionDiagnostics?.lineTopologyPreflightPassedCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedCount:
        meshSubmissionDiagnostics?.lineTopologyPreflightRejectedCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedInvalidPositionCount:
        meshSubmissionDiagnostics?.lineTopologyPreflightRejectedInvalidPositionCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedInvalidIndexCount:
        meshSubmissionDiagnostics?.lineTopologyPreflightRejectedInvalidIndexCount ?? 0,
      webglNativeMeshLineTopologyPreflightRejectedInsufficientStreamCount:
        meshSubmissionDiagnostics?.lineTopologyPreflightRejectedInsufficientStreamCount ?? 0,
      webglNativeMeshLineTopologyDrawPlanAttemptedCount:
        meshSubmissionDiagnostics?.lineTopologyDrawPlanAttemptedCount ?? 0,
      webglNativeMeshLineTopologyDrawPlanCommandCount: meshSubmissionDiagnostics?.lineTopologyDrawPlanCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionDeferredCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionDeferredCount ?? 0,
      webglNativeMeshLineTopologySubmissionAttemptedCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionAttemptedCount ?? 0,
      webglNativeMeshLineTopologySubmissionAttemptedCommandCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionAttemptedCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionSucceededCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionSucceededCount ?? 0,
      webglNativeMeshLineTopologySubmissionSucceededCommandCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionSucceededCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionCommandSuccessRate:
        meshSubmissionDiagnostics?.lineTopologySubmissionCommandSuccessRate ?? 0,
      webglNativeMeshLineTopologySubmissionPlanCoverageRate:
        meshSubmissionDiagnostics?.lineTopologySubmissionPlanCoverageRate ?? 0,
      webglNativeMeshLineTopologySubmissionDrawPlanWastedCommandCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionDrawPlanWastedCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailedCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedCommandCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailedCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionGateBlockedCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionGateBlockedCount ?? 0,
      webglNativeMeshLineTopologySubmissionGateState: meshSubmissionDiagnostics?.lineTopologySubmissionGateState ?? "disabled",
      webglNativeMeshLineTopologySubmissionOutcome: meshSubmissionDiagnostics?.lineTopologySubmissionOutcome ?? "none",
      webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailedMissingLinesPrimitiveCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedMissingLinesPrimitiveCommandCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailedMissingLinesPrimitiveCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailedInsufficientStreamCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailedInsufficientStreamCommandCount:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailedInsufficientStreamCommandCount ?? 0,
      webglNativeMeshLineTopologySubmissionFailureReason:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailureReason ?? "none",
      webglNativeMeshLineTopologySubmissionFailureSummary:
        meshSubmissionDiagnostics?.lineTopologySubmissionFailureSummary ?? {
          failedCount: 0,
          latestReason: "none",
          missingLinesPrimitiveCount: 0,
          insufficientStreamCount: 0,
        },
      webglNativeMeshLineTopologySubmissionEfficiencySummary:
        meshSubmissionDiagnostics?.lineTopologySubmissionEfficiencySummary ?? {
          commandSuccessRate: 0,
          planCoverageRate: 0,
          drawPlanWastedCommandCount: 0,
        },
      webglNativeMeshCapabilityGateCount: meshSubmissionDiagnostics?.submissionCapabilityGateCount ?? 0,
      activeLightCount: meshSubmissionDiagnostics?.activeLightCount ?? activeLightCount,
      meshDrawCallCount:
        (meshSubmissionDiagnostics?.submittedMeshCount ?? 0)
        + (meshSubmissionDiagnostics?.lineTopologySubmissionSucceededCount ?? 0),
      webglNativeMaterialTextureCandidateCount: meshSubmissionDiagnostics?.materialTextureCandidateCount ?? 0,
      webglNativeMaterialTextureUvReadyCount: meshSubmissionDiagnostics?.materialTextureUvReadyCount ?? 0,
      webglNativeMaterialTextureBindingCount: meshSubmissionDiagnostics?.materialTextureBindingCount ?? 0,
      webglNativeMaterialTextureUploadBytes: meshSubmissionDiagnostics?.materialTextureUploadBytes ?? 0,
      webglNativeMaterialTextureCacheHitCount: meshSubmissionDiagnostics?.materialTextureCacheHitCount ?? 0,
      webglNativeMaterialTextureCacheMissCount: meshSubmissionDiagnostics?.materialTextureCacheMissCount ?? 0,
      webglNativeMaterialTextureDecodeFailureCount: meshSubmissionDiagnostics?.materialTextureDecodeFailureCount ?? 0,
      webglNativeMaterialTextureDecodeFailureReason: meshSubmissionDiagnostics?.materialTextureDecodeFailureReason ?? "none",
      webglNativeMaterialTextureFallbackReason: meshSubmissionDiagnostics?.materialTextureFallbackReason ?? "none",
      webgpuNativeMaterialTextureCandidateCount: 0,
      webgpuNativeMaterialTextureUvReadyCount: 0,
      webgpuNativeMaterialTextureBindingCount: 0,
      webgpuNativeMaterialTextureUploadBytes: 0,
      webgpuNativeMaterialTextureCacheHitCount: 0,
      webgpuNativeMaterialTextureCacheMissCount: 0,
      webgpuNativeMaterialTextureDecodeFailureCount: 0,
      webgpuNativeMaterialTextureDecodeFailureReason: "none",
      webgpuNativeMaterialTextureFallbackReason: "none",
      shadowMapCount: 0,
      shadowDrawCallCount: 0,
      shadowTextureBytes: 0,
      instancedDrawAttemptedCount: 0,
      instancedDrawSucceededCount: 0,
      instancedDrawRejectedCount: 0,
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
      tileCacheTotalBytes: payloadRectCount * GL_TILE_BYTES_PER_RECT,
      tileUploadCount: cacheMissCount > 0 ? payloadRectCount : 0,
      tileRenderCount: payloadRectCount,
      visibleTileCount: payloadRectCount,
      tileSchedulerPendingCount: 0,
      gpuTextureBytes: payloadRectCount * GL_TILE_BYTES_PER_RECT,
      imageTextureBytes: payloadRectCount * GL_IMAGE_BYTES_PER_RECT,
      webglPreviewReuseMs: frameReuseHit ? GL_PREVIEW_REUSE_MS : 0,
      webglPlanBuildMs: GL_PLAN_BUILD_MS_PER_RECT * payloadRectCount,
      webglTextureUploadMs: cacheMissCount > 0 ? GL_TEXTURE_UPLOAD_MS_PER_RECT * payloadRectCount : 0,
      webglDrawSubmitMs: GL_DRAW_SUBMIT_MS_PER_RECT * payloadRectCount,
      webglSnapshotCaptureMs: 0,
      webglModelRenderMs: renderPath === "model-complete" ? GL_MODEL_RENDER_MS : 0,
      webglPreviewExecutionMode: frameReuseHit ? "affine-snapshot" : "temporal-reprojection-required",
      webglPreviewExecutionSource: "backend-native",
      webglBudgetPressure: budgetPressure,
      webglBudgetPressureReason: resolveBudgetPressureReason(payloadRectCount),
      webglBudgetPressureSource: "backend-native",
      webglDrawSubmitBudgetMs: 4,
      webglTextureUploadBudgetBytes: GL_TEXTURE_UPLOAD_BUDGET_BYTES,
      webglTextureUploadTotalBudgetBytes: GL_TEXTURE_UPLOAD_TOTAL_BUDGET_BYTES,
      webglImageTextureUploadBudgetCount: GL_IMAGE_TEXTURE_UPLOAD_BUDGET_COUNT,
      webglTextTextureUploadBudgetCount: GL_TEXT_TEXTURE_UPLOAD_BUDGET_COUNT,
      webglTilePreloadBudgetMs: 1,
      webglTilePreloadBudgetUploads: GL_PRELOAD_BUDGET_UPLOADS,
      webglOverlayPassBudgetMs: 1,
      webglDrawSubmitBudgetExceeded: payloadRectCount > PAYLOAD_RECT_COUNT_HIGH_THRESHOLD,
      webglTextureUploadBudgetExceeded: payloadRectCount * GL_TILE_BYTES_PER_RECT > GL_TEXTURE_UPLOAD_BUDGET_BYTES,
      webglOverlayBudgetExceeded: false,
      webglPredictorDirectionX: 0,
      webglPredictorDirectionY: 0,
      webglPredictorSpeedPxPerSec: 0,
      webglPredictorConfidence: frameReuseHit ? GL_PREDICTOR_CONFIDENCE_HIT : GL_PREDICTOR_CONFIDENCE_MISS,
      webglPredictorPreloadRing: payloadRectCount > PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD
        ? GL_PREDICTOR_PRELOAD_RING_HIGH
        : GL_PREDICTOR_PRELOAD_RING_LOW,
      webglPredictorOverscanCssPx: payloadRectCount > PAYLOAD_RECT_COUNT_MEDIUM_THRESHOLD
        ? GL_PREDICTOR_OVERSCAN_HIGH
        : GL_PREDICTOR_OVERSCAN_LOW,
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
    async renderFrame(timestampMs) {
      hooks?.onPresentAttempt?.(timestampMs);
      if (!currentContext) {
        currentContext = resolveContext(currentSurface);
      }
      if (!currentContext) {
        publishWebGLDiagnostics("none", "none", 0, "none", 0);
        return;
      }

      if (
        typeof currentContext.viewport !== "function" ||
        typeof currentContext.clearColor !== "function" ||
        typeof currentContext.clear !== "function"
      ) {
        publishWebGLDiagnostics("none", "none", 0, "none", 0);
        return;
      }

      const surfaceCanvas = currentSurface.canvas;
      const deviceWidth = surfaceCanvas?.width ?? currentSurface.width;
      const deviceHeight = surfaceCanvas?.height ?? currentSurface.height;
      const dpr = currentSurface.width > 0
        ? Math.max(1, deviceWidth / currentSurface.width)
        : 1;

      currentContext.viewport(0, 0, deviceWidth, deviceHeight);
      if (typeof currentContext.enable === "function" && typeof currentContext.depthFunc === "function") {
        currentContext.enable(currentContext.DEPTH_TEST);
        currentContext.depthFunc(currentContext.LEQUAL);
      }
      if (typeof currentContext.clearDepth === "function") {
        currentContext.clearDepth(1);
      }
      currentContext.clearColor(1, 1, 1, 1);
      currentContext.clear(currentContext.COLOR_BUFFER_BIT | currentContext.DEPTH_BUFFER_BIT);

      const payload = hooks?.resolveNativeFramePayload?.(timestampMs);
      const payloadSignature = payload
        ? `${payload.translateX}:${payload.translateY}:${payload.scale}:${payload.rects.map((rect) => `${rect.x},${rect.y},${rect.width},${rect.height},${rect.fill}`).join("|")}`
        : "none";
      const payloadRectCount = payload?.rects.length ?? 0;
      const activeLightCount = payload?.lights?.length ?? 0;
      const featureCapabilityGateReason = resolveFeatureCapabilityGateReason(payload?.nodes);
      let renderPath: "model-complete" | "packet" | "none" = "none";
      let meshSubmissionDiagnostics: WebGLNativeMeshSubmissionDiagnostics | undefined;

      // Model-complete path takes priority for style-rich nodes (stroke, shadow,
      // gradient, non-rect shapes, clips). This mirrors the WebGPU backend order
      // and ensures correct rendering of vector2D document styles.
      if (payload && payload.needsComposition !== false) {
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
          if (composed && presentCompositionTexture(currentContext, composition.canvas)) {
            renderPath = "model-complete";
            publishWebGLDiagnostics(
              renderPath,
              payloadSignature,
              payloadRectCount,
              featureCapabilityGateReason,
              activeLightCount,
              meshSubmissionDiagnostics,
            );
            hooks?.onPresentCommitted?.(timestampMs);
            return;
          }
          // AI-TEMP: model-complete can resolve without visible primitives on some scenes; remove when node payload contract guarantees drawable visibility; ref DEX-065.4.
        }
      }

      // Mesh submission path serves as the fast path for simple filled rects
      // (needsComposition === false) and as fallback when model-complete is
      // unavailable (no OffscreenCanvas / composition context).
      if (payload) {
        meshSubmissionDiagnostics = presentNativeMeshPrimitives(
          currentContext,
          {
            translateX: payload.translateX,
            translateY: payload.translateY,
            scale: payload.scale,
            meshes: payload.meshes,
            materials: payload.materials,
            lights: payload.lights,
            camera3d: payload.camera3d,
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
            activeLightCount,
            meshSubmissionDiagnostics,
          );
          hooks?.onPresentCommitted?.(timestampMs);
          return;
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
        activeLightCount,
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
