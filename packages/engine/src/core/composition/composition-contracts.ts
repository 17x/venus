/**
 * Stable id for one composition layer in profile-backed runtimes.
 */
export type EngineCompositionLayerId =
  | "background"
  | "document"
  | "interaction"
  | "selection"
  | "hover"
  | "guide"
  | "overlay"
  | "debug"
  | "presentation";

/**
 * Composition plane grouping used by runtime policy and diagnostics.
 */
export type EngineCompositionPlane = "base" | "active" | "overlay";

/**
 * Declarative composition layer contract used by runtime profiles.
 */
export interface EngineCompositionLayerContract {
  /**
   * Stable layer id.
   */
  id: EngineCompositionLayerId;
  /**
   * Composition plane this layer belongs to.
   */
  plane: EngineCompositionPlane;
  /**
   * Relative draw order where larger value means later composition.
   */
  zOrder: number;
  /**
   * Whether this layer can be retained between frames.
   */
  retained: boolean;
  /**
   * Whether this layer can draw during active interaction phases.
   */
  interactive: boolean;
}

/**
 * Minimal composition stack snapshot used by compatibility diagnostics.
 */
export interface EngineCompositionStackSnapshot {
  /**
   * Ordered composition layers for the active runtime profile.
   */
  layers: readonly EngineCompositionLayerContract[];
  /**
   * Number of active interaction node ids tracked by the active plane.
   */
  activeNodeCount: number;
  /**
   * Number of overlay draw nodes queued for this frame.
   */
  overlayNodeCount: number;
}

/**
 * Default composition stack for vector-editor runtime profile.
 */
export const VECTOR_EDITOR_COMPOSITION_LAYERS: readonly EngineCompositionLayerContract[] = [
  { id: "background", plane: "base", zOrder: 0, retained: true, interactive: false },
  { id: "document", plane: "base", zOrder: 10, retained: true, interactive: true },
  { id: "interaction", plane: "active", zOrder: 20, retained: false, interactive: true },
  { id: "selection", plane: "active", zOrder: 30, retained: false, interactive: true },
  { id: "hover", plane: "active", zOrder: 40, retained: false, interactive: true },
  { id: "guide", plane: "active", zOrder: 50, retained: false, interactive: true },
  { id: "overlay", plane: "overlay", zOrder: 60, retained: false, interactive: true },
  { id: "debug", plane: "overlay", zOrder: 70, retained: false, interactive: false },
  { id: "presentation", plane: "base", zOrder: 80, retained: true, interactive: false },
];
