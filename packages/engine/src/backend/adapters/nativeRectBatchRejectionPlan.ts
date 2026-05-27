const MATRIX_COMPONENT_MIN = 6;

/**
 * Declares one minimal rich-node payload shape used by native rect-batch rejection classification.
 */
export interface NativeRectBatchCandidateNode {
  /** Stores node kind discriminator from runtime payload. */
  type: string;
  /** Stores optional shape token for shape nodes. */
  shape?: string;
  /** Stores optional stroke color token for style rejection checks. */
  stroke?: string;
  /** Stores optional stroke width for style rejection checks. */
  strokeWidth?: number;
  /** Stores optional transform matrix payload for transform rejection checks. */
  transform?: {
    /** Stores optional 2D affine matrix tuple. */
    matrix?: readonly [number, number, number, number, number, number] | readonly number[];
  };
}

/**
 * Declares normalized rect-batch rejection reason tokens used by backend diagnostics.
 */
export type NativeRectBatchRejectedReason =
  | "none"
  | "scene-empty"
  | "group-node-unsupported"
  | "non-shape-node-unsupported"
  | "non-rect-shape-unsupported"
  | "shape-style-unsupported"
  | "shape-transform-unsupported";

/**
 * Resolves whether one matrix payload is identity for deterministic transform rejection checks.
 * @param matrix Optional matrix payload emitted by scene adapter.
 */
function isIdentityTransformMatrix(
  matrix?: readonly [number, number, number, number, number, number] | readonly number[],
): boolean {
    if (!Array.isArray(matrix) || matrix.length < MATRIX_COMPONENT_MIN) {
    return true;
  }

  const MATRIX_IDX_A = 0;
  const MATRIX_IDX_B = 1;
  const MATRIX_IDX_C = 2;
  const MATRIX_IDX_D = 3;
  const MATRIX_IDX_E = 4;
  const MATRIX_IDX_F = 5;
  const epsilon = 0.0001;
  const a = matrix[MATRIX_IDX_A] ?? 1;
  const b = matrix[MATRIX_IDX_B] ?? 0;
  const c = matrix[MATRIX_IDX_C] ?? 0;
  const d = matrix[MATRIX_IDX_D] ?? 1;
  const e = matrix[MATRIX_IDX_E] ?? 0;
  const f = matrix[MATRIX_IDX_F] ?? 0;
  return (
    Math.abs(a - 1) <= epsilon &&
    Math.abs(b) <= epsilon &&
    Math.abs(c) <= epsilon &&
    Math.abs(d - 1) <= epsilon &&
    Math.abs(e) <= epsilon &&
    Math.abs(f) <= epsilon
  );
}

/**
 * Resolves one deterministic native rect-batch rejection reason from payload semantics.
 * @param rectBatchEligibleCount Eligible rect count emitted by native payload builder.
 * @param nodes Optional rich-node payload emitted by native payload builder.
 */
export function resolveNativeRectBatchRejectedReason(
  rectBatchEligibleCount: number,
  nodes?: ReadonlyArray<NativeRectBatchCandidateNode>,
): NativeRectBatchRejectedReason {
  if (rectBatchEligibleCount > 0) {
    return "none";
  }
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return "scene-empty";
  }

  // Keep priority deterministic so diagnostics remain diff-stable across mixed payloads.
  let sawRectShape = false;
  let sawUnsupportedTransform = false;
  let sawUnsupportedStyle = false;

  for (const node of nodes) {
    if (!node) {
      continue;
    }

    if (node.type === "group") {
      return "group-node-unsupported";
    }
    if (node.type !== "shape") {
      return "non-shape-node-unsupported";
    }

    const shape = typeof node.shape === "string" ? node.shape : "rect";
    if (shape !== "rect") {
      return "non-rect-shape-unsupported";
    }

    sawRectShape = true;

    if (!isIdentityTransformMatrix(node.transform?.matrix)) {
      sawUnsupportedTransform = true;
      continue;
    }

    const strokeWidth =
      typeof node.strokeWidth === "number" && Number.isFinite(node.strokeWidth)
        ? Math.max(0, node.strokeWidth)
        : 0;
    const hasVisibleStroke =
      typeof node.stroke === "string" && node.stroke !== "transparent" && strokeWidth > 0;
    if (hasVisibleStroke) {
      sawUnsupportedStyle = true;
    }
  }

  if (!sawRectShape) {
    return "scene-empty";
  }
  if (sawUnsupportedTransform) {
    return "shape-transform-unsupported";
  }
  if (sawUnsupportedStyle) {
    return "shape-style-unsupported";
  }

  return "shape-style-unsupported";
}
