import { resolveRichPathDrawPlan, type RichPathBezierPoint, type RichPathPoint } from "./richPathDrawPlan";

const MATRIX_COMPONENT_MIN = 6;
const MATRIX_INDEX_A = 0;
const MATRIX_INDEX_B = 1;
const MATRIX_INDEX_C = 2;
const MATRIX_INDEX_D = 3;
const MATRIX_INDEX_E = 4;
const MATRIX_INDEX_F = 5;

export type RichNodeCanvasShadow = {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
};

export type RichNodeCanvasTransform = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type RichNodeClipRule = "nonzero" | "evenodd";

export type RichNodeClipNode = {
  id: string;
  shape?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  clipPathId?: string;
  clipId?: string;
  clipRule?: RichNodeClipRule;
  points?: ReadonlyArray<{ x: number; y: number }>;
};

export type RichNodeCornerRadii = {
  topLeft?: number;
  topRight?: number;
  bottomRight?: number;
  bottomLeft?: number;
};

export type RichNodeRoundedRectNode = {
  cornerRadius?: number;
  cornerRadii?: RichNodeCornerRadii;
};

export type RichNodeEllipseNode = {
  ellipseStartAngle?: number;
  ellipseEndAngle?: number;
};

export type RichNodePathNode = {
  closed?: boolean;
  points?: ReadonlyArray<RichPathPoint>;
  bezierPoints?: ReadonlyArray<RichPathBezierPoint>;
};

export type RichNodeTextRunStyle = {
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  fontStyle?: string;
  lineHeight?: number;
};

export type RichNodeTextRun = {
  text?: string;
  style?: RichNodeTextRunStyle;
};

export type RichNodeTextFragment = {
  text: string;
  x: number;
  y: number;
  fill: string;
  font: string;
  maxWidth?: number;
};

export type RichNodeTextLayoutInput = {
  text: string;
  textRuns?: unknown;
  fill: string;
  x: number;
  y: number;
  width: number;
  measureTextWidth: (text: string, font: string) => number;
};

const FULL_CIRCLE_RADIANS = Math.PI * 2;
const HALF_DIVISOR = 2;
const DEGREES_TO_RADIANS = Math.PI / 180;
const FULL_CIRCLE_EPSILON = 0.001;
const DEFAULT_TEXT_FILL = "#0f172a";
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_FONT_FAMILY = "sans-serif";
const DEFAULT_FONT_WEIGHT = 400;
const DEFAULT_FONT_STYLE = "normal";
const DEFAULT_LINE_HEIGHT_MULTIPLIER = 1.2;

type RichNodeCanvasClipContext = Pick<
  OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  "beginPath" | "clip" | "closePath" | "ellipse" | "lineTo" | "moveTo" | "rect"
>;

type RichNodeCanvasPathContext = Pick<
  OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  "arcTo" | "beginPath" | "bezierCurveTo" | "closePath" | "ellipse" | "lineTo" | "moveTo"
>;

/**
 * Resolves one payload matrix to Canvas/SVG affine tuple order.
 * @param matrix Node matrix payload emitted by scene adapters.
 */
export function resolveRichNodeCanvasTransform(matrix: readonly number[]): RichNodeCanvasTransform | null {
  if (matrix.length < MATRIX_COMPONENT_MIN) {
    return null;
  }
  return {
    a: matrix[MATRIX_INDEX_A] ?? 1,
    b: matrix[MATRIX_INDEX_B] ?? 0,
    c: matrix[MATRIX_INDEX_C] ?? 0,
    d: matrix[MATRIX_INDEX_D] ?? 1,
    e: matrix[MATRIX_INDEX_E] ?? 0,
    f: matrix[MATRIX_INDEX_F] ?? 0,
  };
}

/**
 * Resolves generic rich-node shadow payload into canvas shadow fields.
 * @param shadow Generic node shadow payload.
 */
export function resolveRichNodeCanvasShadow(shadow: unknown): RichNodeCanvasShadow | null {
  if (!shadow || typeof shadow !== "object") {
    return null;
  }
  const record = shadow as Record<string, unknown>;
  if (record.enabled === false) {
    return null;
  }
  const offsetX = typeof record.offsetX === "number" && Number.isFinite(record.offsetX) ? record.offsetX : 0;
  const offsetY = typeof record.offsetY === "number" && Number.isFinite(record.offsetY) ? record.offsetY : 0;
  const blur = typeof record.blur === "number" && Number.isFinite(record.blur) ? Math.max(0, record.blur) : 0;
  const color = typeof record.color === "string" && record.color.length > 0 ? record.color : "rgba(15,23,42,0.25)";
  if (offsetX === 0 && offsetY === 0 && blur === 0) {
    return null;
  }
  return { color, offsetX, offsetY, blur };
}

/**
 * Applies resolved rich-node shadow fields to a Canvas 2D composition context.
 * @param context Canvas context used for model-complete composition.
 * @param shadow Resolved shadow payload.
 */
export function applyRichNodeCanvasShadow(
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  shadow: RichNodeCanvasShadow | null,
): void {
  if (!shadow) {
    return;
  }
  context.shadowColor = shadow.color;
  context.shadowOffsetX = shadow.offsetX;
  context.shadowOffsetY = shadow.offsetY;
  context.shadowBlur = shadow.blur;
}

/**
 * Applies a generic rich-node clip path to a Canvas 2D composition context.
 * @param context Canvas context used for model-complete composition.
 * @param node Node that references an optional clip source.
 * @param nodeById Registry containing possible clip source nodes.
 */
export function applyRichNodeCanvasClip(
  context: RichNodeCanvasClipContext,
  node: RichNodeClipNode,
  nodeById: ReadonlyMap<string, RichNodeClipNode>,
): boolean {
  const clipSourceId = node.clipPathId ?? node.clipId;
  const clipSource = clipSourceId ? nodeById.get(clipSourceId) : undefined;
  if (!clipSource) {
    return false;
  }

  const clipX = typeof clipSource.x === "number" ? clipSource.x : 0;
  const clipY = typeof clipSource.y === "number" ? clipSource.y : 0;
  const clipWidth = typeof clipSource.width === "number" ? Math.abs(clipSource.width) : 0;
  const clipHeight = typeof clipSource.height === "number" ? Math.abs(clipSource.height) : 0;
  const clipPoints = Array.isArray(clipSource.points) ? clipSource.points : [];

  context.beginPath();
  if (clipPoints.length >= 2) {
    context.moveTo(clipPoints[0].x, clipPoints[0].y);
    for (let index = 1; index < clipPoints.length; index += 1) {
      context.lineTo(clipPoints[index].x, clipPoints[index].y);
    }
    context.closePath();
  } else if (clipSource.shape === "ellipse") {
    context.ellipse(
      clipX + clipWidth / HALF_DIVISOR,
      clipY + clipHeight / HALF_DIVISOR,
      clipWidth / HALF_DIVISOR,
      clipHeight / HALF_DIVISOR,
      0,
      0,
      FULL_CIRCLE_RADIANS,
    );
  } else {
    context.rect(clipX, clipY, clipWidth, clipHeight);
  }
  context.clip(node.clipRule === "evenodd" ? "evenodd" : "nonzero");
  return true;
}

function resolveCornerRadius(value: unknown, fallback: number, maxRadius: number): number {
  const radius = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(maxRadius, radius));
}

/**
 * Builds a rounded-rectangle path for generic rich-node composition.
 * @param context Canvas context used for model-complete composition.
 * @param node Node carrying optional uniform or per-corner radii.
 * @param x Rectangle x coordinate.
 * @param y Rectangle y coordinate.
 * @param width Rectangle width in composition space.
 * @param height Rectangle height in composition space.
 */
export function buildRichNodeRoundedRectPath(
  context: RichNodeCanvasPathContext,
  node: RichNodeRoundedRectNode,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }
  const uniformRadius = typeof node.cornerRadius === "number" && Number.isFinite(node.cornerRadius)
    ? node.cornerRadius
    : 0;
  const radii = node.cornerRadii;
  const hasRoundedCorners = uniformRadius > 0 || Boolean(
    radii
      && ((radii.topLeft ?? 0) > 0
        || (radii.topRight ?? 0) > 0
        || (radii.bottomRight ?? 0) > 0
        || (radii.bottomLeft ?? 0) > 0),
  );
  if (!hasRoundedCorners) {
    return false;
  }

  const maxRadius = Math.min(width, height) / HALF_DIVISOR;
  const tl = resolveCornerRadius(radii?.topLeft, uniformRadius, maxRadius);
  const tr = resolveCornerRadius(radii?.topRight, uniformRadius, maxRadius);
  const br = resolveCornerRadius(radii?.bottomRight, uniformRadius, maxRadius);
  const bl = resolveCornerRadius(radii?.bottomLeft, uniformRadius, maxRadius);

  context.beginPath();
  context.moveTo(x + tl, y);
  context.lineTo(x + width - tr, y);
  context.arcTo(x + width, y, x + width, y + tr, tr);
  context.lineTo(x + width, y + height - br);
  context.arcTo(x + width, y + height, x + width - br, y + height, br);
  context.lineTo(x + bl, y + height);
  context.arcTo(x, y + height, x, y + height - bl, bl);
  context.lineTo(x, y + tl);
  context.arcTo(x, y, x + tl, y, tl);
  context.closePath();
  return true;
}

function resolveAngleDegrees(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Builds a full ellipse or closed ellipse-sector path for generic rich-node composition.
 * @param context Canvas context used for model-complete composition.
 * @param node Node carrying optional start/end angle degrees.
 * @param x Ellipse bounds x coordinate.
 * @param y Ellipse bounds y coordinate.
 * @param width Ellipse bounds width in composition space.
 * @param height Ellipse bounds height in composition space.
 */
export function buildRichNodeEllipsePath(
  context: RichNodeCanvasPathContext,
  node: RichNodeEllipseNode,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }

  const cx = x + width / HALF_DIVISOR;
  const cy = y + height / HALF_DIVISOR;
  const rx = Math.max(0, width / HALF_DIVISOR);
  const ry = Math.max(0, height / HALF_DIVISOR);
  const startAngleRad = resolveAngleDegrees(node.ellipseStartAngle, 0) * DEGREES_TO_RADIANS;
  let endAngleRad = resolveAngleDegrees(node.ellipseEndAngle, 360) * DEGREES_TO_RADIANS;
  while (endAngleRad < startAngleRad) {
    endAngleRad += FULL_CIRCLE_RADIANS;
  }
  const sweepRad = endAngleRad - startAngleRad;
  const isFullCircle = Math.abs(sweepRad - FULL_CIRCLE_RADIANS) < FULL_CIRCLE_EPSILON || sweepRad >= FULL_CIRCLE_RADIANS;

  context.beginPath();
  if (isFullCircle) {
    context.ellipse(cx, cy, rx, ry, 0, 0, FULL_CIRCLE_RADIANS);
  } else {
    context.moveTo(cx, cy);
    context.ellipse(cx, cy, rx, ry, 0, startAngleRad, endAngleRad, false);
    context.closePath();
  }
  return true;
}

/**
 * Builds a generic point, bezier, or fallback line path for rich-node composition.
 * @param context Canvas context used for model-complete composition.
 * @param node Node carrying optional point or bezier payloads.
 * @param shape Generic shape token used for path-branch planning.
 * @param x Node x coordinate used by fallback line geometry.
 * @param y Node y coordinate used by fallback line geometry.
 * @param width Node width used by fallback line geometry.
 * @param height Node height used by fallback line geometry.
 */
export function buildRichNodePath(
  context: RichNodeCanvasPathContext,
  node: RichNodePathNode,
  shape: string,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  const points = Array.isArray(node.points) ? node.points : [];
  const bezierPoints = Array.isArray(node.bezierPoints) ? node.bezierPoints : [];
  const pathDrawPlan = resolveRichPathDrawPlan({
    shape,
    points,
    bezierPoints,
  });
  if (!pathDrawPlan.shouldEnterPathBranch) {
    return false;
  }

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
    context.moveTo(x, y);
    context.lineTo(x + width, y + height);
  } else {
    return false;
  }

  const nodeClosed = typeof node.closed === "boolean" ? node.closed : pathDrawPlan.shouldClosePath;
  if (nodeClosed) {
    context.closePath();
  }
  return true;
}

function resolveTextRuns(value: unknown): RichNodeTextRun[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const style = record.style && typeof record.style === "object"
      ? record.style as Record<string, unknown>
      : {};
    return [{
      text: typeof record.text === "string" ? record.text : "",
      style: {
        fill: typeof style.fill === "string" ? style.fill : undefined,
        fontSize: typeof style.fontSize === "number" ? style.fontSize : undefined,
        fontFamily: typeof style.fontFamily === "string" ? style.fontFamily : undefined,
        fontWeight: typeof style.fontWeight === "number" || typeof style.fontWeight === "string"
          ? style.fontWeight
          : undefined,
        fontStyle: typeof style.fontStyle === "string" ? style.fontStyle : undefined,
        lineHeight: typeof style.lineHeight === "number" ? style.lineHeight : undefined,
      },
    }];
  });
}

function buildTextFont(style: RichNodeTextRunStyle): {font: string; fontSize: number; lineHeight: number} {
  const fontSize = typeof style.fontSize === "number" && Number.isFinite(style.fontSize) && style.fontSize > 0
    ? style.fontSize
    : DEFAULT_FONT_SIZE;
  const fontFamily = typeof style.fontFamily === "string" && style.fontFamily.length > 0
    ? style.fontFamily
    : DEFAULT_FONT_FAMILY;
  const fontWeight = typeof style.fontWeight === "number" || typeof style.fontWeight === "string"
    ? style.fontWeight
    : DEFAULT_FONT_WEIGHT;
  const fontStyle = typeof style.fontStyle === "string" && style.fontStyle.length > 0
    ? style.fontStyle
    : DEFAULT_FONT_STYLE;
  const lineHeight = typeof style.lineHeight === "number" && Number.isFinite(style.lineHeight) && style.lineHeight > 0
    ? style.lineHeight
    : fontSize * DEFAULT_LINE_HEIGHT_MULTIPLIER;
  return {
    font: `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`,
    fontSize,
    lineHeight,
  };
}

/**
 * Resolves generic rich-node text payload into deterministic draw fragments.
 * @param input Text payload, layout origin, and text measurement callback.
 */
export function resolveRichNodeTextFragments(input: RichNodeTextLayoutInput): RichNodeTextFragment[] {
  const fragments: RichNodeTextFragment[] = [];
  const fallbackFill = input.fill !== "transparent" ? input.fill : DEFAULT_TEXT_FILL;
  const runs = resolveTextRuns(input.textRuns);

  if (runs.length > 0) {
    let cursorX = input.x;
    let cursorY = input.y;
    for (const run of runs) {
      const style = run.style ?? {};
      const {font, lineHeight} = buildTextFont(style);
      const runFill = style.fill && style.fill !== "transparent" ? style.fill : fallbackFill;
      const lines = (run.text ?? "").split("\n");
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        if (lineIndex > 0) {
          cursorX = input.x;
          cursorY += lineHeight;
        }
        if (line.length === 0) {
          continue;
        }
        fragments.push({text: line, x: cursorX, y: cursorY, fill: runFill, font});
        cursorX += input.measureTextWidth(line, font);
      }
    }
    return fragments;
  }

  const {font, lineHeight} = buildTextFont({});
  const lines = input.text.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line.length === 0) {
      continue;
    }
    fragments.push({
      text: line,
      x: input.x,
      y: input.y + lineIndex * lineHeight,
      fill: fallbackFill,
      font,
      maxWidth: input.width > 0 ? input.width : undefined,
    });
  }
  return fragments;
}
