/**
 * Declares one rectangular primitive consumed by canvas2d scene submission.
 */
export interface Canvas2DSceneDrawRect {
  /** Rectangle origin X in world coordinates. */
  x: number;
  /** Rectangle origin Y in world coordinates. */
  y: number;
  /** Rectangle width in world coordinates. */
  width: number;
  /** Rectangle height in world coordinates. */
  height: number;
  /** Optional fill paint. */
  fill?: string | null;
  /** Optional stroke paint. */
  stroke?: string | null;
  /** Optional stroke width. */
  strokeWidth?: number;
}

/**
 * Declares one canvas2d scene submission payload.
 */
export interface Canvas2DSceneDrawPayload {
  /** Device-pixel ratio applied to CSS-space transforms. */
  outputPixelRatio: number;
  /** Viewport translation X in CSS pixels. */
  translateX: number;
  /** Viewport translation Y in CSS pixels. */
  translateY: number;
  /** Viewport scale in CSS-space. */
  scale: number;
  /** Ordered draw rectangles. */
  rects: readonly Canvas2DSceneDrawRect[];
}

/**
 * Draws one scene payload into a canvas2d context and returns draw primitive count.
 * @param context Canvas2d drawing context.
 * @param payload Draw payload produced by scene submission layer.
 */
export function drawCanvas2DScenePayload(
  context: CanvasRenderingContext2D,
  payload: Canvas2DSceneDrawPayload,
): number {
  const targetCanvas = context.canvas;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  context.setTransform(payload.outputPixelRatio, 0, 0, payload.outputPixelRatio, 0, 0);
  context.translate(payload.translateX, payload.translateY);
  context.scale(payload.scale, payload.scale);

  let drawCount = 0;
  for (const rect of payload.rects) {
    if (rect.fill && rect.fill !== "transparent") {
      context.fillStyle = rect.fill;
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    const strokeWidth = rect.strokeWidth ?? 1;
    if (rect.stroke && rect.stroke !== "transparent" && strokeWidth > 0) {
      context.strokeStyle = rect.stroke;
      context.lineWidth = strokeWidth;
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    drawCount += 1;
  }

  context.restore();
  return drawCount;
}
