/**
 * Declares one minimal rich-node contract consumed by capability gate planning.
 */
export interface CapabilityGateProbeNode {
  /** Stable node identifier emitted by scene adapter. */
  id: string;
  /** Node discriminator token. */
  type: string;
  /** Optional fill token emitted by scene payload. */
  fill?: string;
  /** Optional stroke token emitted by scene payload. */
  stroke?: string;
  /** Optional clip path identifier emitted by scene payload. */
  clipPathId?: string;
  /** Optional clip host identifier emitted by scene payload. */
  clipId?: string;
  /** Optional shadow style token emitted by scene payload. */
  shadow?: unknown;
  /** Optional structured text-run payload emitted by rich text nodes. */
  textRuns?: unknown;
}

/**
 * Declares deterministic capability-gate reason tokens for rich feature support checks.
 */
export type FeatureCapabilityGateReason =
  | "none"
  | "image-node-unsupported"
  | "clip-node-unsupported"
  | "text-style-unsupported"
  | "shadow-style-unsupported"
  | "gradient-style-unsupported";

/**
 * Detects whether one paint token encodes gradient syntax unsupported by adapter fallback path.
 * @param paintToken Fill or stroke token emitted by scene payload.
 */
function hasUnsupportedGradientPaint(paintToken: string | undefined): boolean {
  if (typeof paintToken !== "string") {
    return false;
  }
  const normalized = paintToken.trim().toLowerCase();
  return normalized.includes("gradient(");
}

/**
 * Detects whether one text node carries structured text-run payload beyond fallback text rendering semantics.
 * @param node Rich node payload emitted by scene adapter.
 */
function hasUnsupportedTextStylePayload(node: CapabilityGateProbeNode): boolean {
  if (node.type !== "text") {
    return false;
  }
  return Array.isArray(node.textRuns) && node.textRuns.length > 0;
}

/**
 * Resolves one deterministic feature capability-gate reason from rich node payload semantics.
 * @param nodes Optional rich node payload used for model-complete composition.
 */
export function resolveFeatureCapabilityGateReason(
  nodes: readonly CapabilityGateProbeNode[] | undefined,
): FeatureCapabilityGateReason {
  if (!nodes || nodes.length === 0) {
    return "none";
  }

  for (const node of nodes) {
    if (node.type === "image") {
      return "image-node-unsupported";
    }
  }

  for (const node of nodes) {
    if (typeof node.clipPathId === "string" || typeof node.clipId === "string") {
      return "clip-node-unsupported";
    }
  }

  // Keep text semantic loss ahead of paint-style checks so diagnostics stay stable for rich text payloads.
  for (const node of nodes) {
    if (hasUnsupportedTextStylePayload(node)) {
      return "text-style-unsupported";
    }
  }

  for (const node of nodes) {
    if (typeof node.shadow !== "undefined" && node.shadow !== null) {
      return "shadow-style-unsupported";
    }
  }

  for (const node of nodes) {
    if (hasUnsupportedGradientPaint(node.fill) || hasUnsupportedGradientPaint(node.stroke)) {
      return "gradient-style-unsupported";
    }
  }

  return "none";
}
