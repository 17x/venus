/**
 * Declares one 2D point payload used by rich-path fallback planning.
 */
export interface RichPathPoint {
  /** Stores x coordinate in local node space. */
  x: number;
  /** Stores y coordinate in local node space. */
  y: number;
}

/**
 * Declares one bezier-anchor payload used by rich-path fallback planning.
 */
export interface RichPathBezierPoint {
  /** Stores bezier anchor coordinate. */
  anchor: RichPathPoint;
  /** Stores optional incoming control point. */
  cp1?: RichPathPoint;
  /** Stores optional outgoing control point. */
  cp2?: RichPathPoint;
}

/**
 * Declares one input payload for rich-path draw-branch planning.
 */
export interface RichPathDrawPlanInput {
  /** Stores shape token emitted by runtime scene adapter. */
  shape: string;
  /** Stores optional polyline point payload. */
  points?: ReadonlyArray<RichPathPoint>;
  /** Stores optional bezier curve payload. */
  bezierPoints?: ReadonlyArray<RichPathBezierPoint>;
}

/**
 * Declares deterministic branch decisions for rich-path drawing.
 */
export interface RichPathDrawPlan {
  /** Indicates whether draw loop should enter path branch for this node. */
  shouldEnterPathBranch: boolean;
  /** Indicates whether point payload can drive moveTo/lineTo drawing. */
  hasPointPath: boolean;
  /** Indicates whether bezier payload can drive curve drawing. */
  hasBezierPath: boolean;
  /** Indicates whether line nodes should fallback to width/height segment drawing. */
  shouldFallbackLine: boolean;
  /** Indicates whether path should close for fill/stroke semantics. */
  shouldClosePath: boolean;
}

/**
 * Resolves deterministic draw-branch decisions for line/path/polygon/bezier payloads.
 * @param input Shape and geometry payload used for path-branch planning.
 */
export function resolveRichPathDrawPlan(input: RichPathDrawPlanInput): RichPathDrawPlan {
  const hasPointPath = Array.isArray(input.points) && input.points.length >= 2;
  const hasBezierPath = Array.isArray(input.bezierPoints) && input.bezierPoints.length >= 2;
  const isLineLikeShape = input.shape === "line";
  const isClosedPathShape = input.shape === "polygon" || input.shape === "path";

  return {
    shouldEnterPathBranch: hasPointPath || hasBezierPath || isLineLikeShape || isClosedPathShape,
    hasPointPath,
    hasBezierPath,
    shouldFallbackLine: isLineLikeShape && !hasPointPath && !hasBezierPath,
    shouldClosePath: isClosedPathShape,
  };
}
