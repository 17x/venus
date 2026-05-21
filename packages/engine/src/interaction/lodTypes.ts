/**
 * Declares interaction kinds that influence LOD behavior.
 */
export type EngineLodInteractionType = "pan" | "zoom" | "other";

const LOD_LEVEL_ONE = 1;
const LOD_LEVEL_TWO = 2;
const LOD_LEVEL_THREE = 3;

type EngineLodLevel =
  | 0
  | typeof LOD_LEVEL_ONE
  | typeof LOD_LEVEL_TWO
  | typeof LOD_LEVEL_THREE;

/**
 * Declares LOD resolver input shared by runtime and interaction layers.
 */
export interface EngineLodProfileInput {
  /** Stores total shape count used by pressure thresholds. */
  shapeCount: number;
  /** Stores total image count used by pressure thresholds. */
  imageCount: number;
  /** Stores current viewport scale. */
  scale: number;
  /** Stores explicit interaction-active status when available. */
  isInteracting?: boolean;
  /** Stores interaction velocity estimate in px/sec. */
  interactionVelocity?: number;
  /** Stores interaction type used by quality strategy. */
  interactionType?: EngineLodInteractionType;
  /** Stores previous LOD level for hysteresis control. */
  previousLodLevel?: EngineLodLevel;
}

/**
 * Declares resolved LOD profile consumed by render policy.
 */
export interface EngineLodProfile {
  /** Stores resolved LOD level. */
  lodLevel: EngineLodLevel;
  /** Stores render quality mode for current frame. */
  renderQuality: "full" | "interactive";
  /** Stores target DPR override for current frame. */
  targetDpr: number | "auto";
  /** Stores image smoothing strategy for current frame. */
  imageSmoothingQuality: ImageSmoothingQuality;
  /** Stores interaction frame interval hint in milliseconds. */
  interactiveIntervalMs: number;
}

/**
 * Canvas-oriented alias retained for renderer-facing naming clarity.
 */
export type EngineCanvasLodProfileInput = EngineLodProfileInput;

/**
 * Canvas-oriented alias retained for renderer-facing naming clarity.
 */
export type EngineCanvasLodProfile = EngineLodProfile;
