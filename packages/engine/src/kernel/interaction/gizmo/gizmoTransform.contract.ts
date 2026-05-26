/**
 * Declares the transform gizmo operation mode.
 */
export type EngineGizmoMode =
  /** Translate gizmo with axis-aligned arrows. */
  | "translate"
  /** Rotate gizmo with circular rings. */
  | "rotate"
  /** Scale gizmo with axis-aligned handle cubes. */
  | "scale";

/**
 * Declares the constrained axis or plane for gizmo manipulation.
 */
export type EngineGizmoAxis =
  /** Free movement in all axes. */
  | "free"
  /** Constrained to world X axis. */
  | "x"
  /** Constrained to world Y axis. */
  | "y"
  /** Constrained to world Z axis. */
  | "z"
  /** Constrained to XY plane. */
  | "xy"
  /** Constrained to XZ plane. */
  | "xz"
  /** Constrained to YZ plane. */
  | "yz";

/**
 * Declares the gizmo space for transform operations.
 */
export type EngineGizmoSpace =
  /** Transform in world coordinate space. */
  | "world"
  /** Transform in local object coordinate space. */
  | "local";

/**
 * Declares one gizmo handle interaction state.
 */
export type EngineGizmoHandleState =
  /** Handle is idle and not being interacted with. */
  | "idle"
  /** Handle is hovered by the pointer. */
  | "hover"
  /** Handle is actively being dragged. */
  | "active";

/**
 * Declares the gizmo transform state during an active drag operation.
 */
export interface EngineGizmoDragState {
  /** Active gizmo mode during the drag. */
  mode: EngineGizmoMode;
  /** Constrained axis or plane for the drag. */
  axis: EngineGizmoAxis;
  /** Gizmo transform space. */
  space: EngineGizmoSpace;
  /** Accumulated translation delta in world units. */
  deltaX: number;
  /** Accumulated translation delta in world units. */
  deltaY: number;
  /** Accumulated translation delta in world units. */
  deltaZ: number;
  /** Accumulated rotation delta in radians. */
  deltaRotation: number;
  /** Accumulated scale factor (multiplicative). */
  deltaScale: number;
}

/**
 * Declares the gizmo transform pipeline contract for engine-level gizmo interaction.
 * This is an engine runtime concern, not an editor concern.
 */
export interface EngineGizmoTransformPipeline {
  /** Returns the current gizmo mode. */
  getMode(): EngineGizmoMode;
  /** Sets the active gizmo mode. */
  setMode(mode: EngineGizmoMode): void;
  /** Returns the current gizmo space. */
  getSpace(): EngineGizmoSpace;
  /** Toggles between world and local space. */
  toggleSpace(): void;
  /** Resolves which axis/plane a screen-space pointer intersects on the gizmo. */
  resolveGizmoAxis(
    pointerX: number,
    pointerY: number,
    gizmoOriginX: number,
    gizmoOriginY: number,
    gizmoOriginZ: number,
    viewportWidth: number,
    viewportHeight: number,
  ): EngineGizmoAxis;
  /** Starts a gizmo drag operation from a screen-space pointer position. */
  startDrag(
    pointerX: number,
    pointerY: number,
    axis: EngineGizmoAxis,
    originX: number,
    originY: number,
    originZ: number,
  ): void;
  /** Updates the drag state with a new pointer position. */
  updateDrag(pointerX: number, pointerY: number): EngineGizmoDragState;
  /** Ends the current drag operation. */
  endDrag(): EngineGizmoDragState;
  /** Returns whether a drag operation is currently active. */
  isDragging(): boolean;
  /** Returns the current drag state, or null if not dragging. */
  getDragState(): EngineGizmoDragState | null;
}
