import type {
  EngineGizmoAxis,
  EngineGizmoDragState,
  EngineGizmoMode,
  EngineGizmoSpace,
  EngineGizmoTransformPipeline,
} from "./gizmoTransform.contract";

/** Hit radius in normalized viewport coordinates for gizmo axis detection. */
const GIZMO_AXIS_HIT_RADIUS = 0.06;

/**
 * Creates a gizmo transform pipeline for engine-level gizmo interaction.
 * Manages mode, space, axis detection, and drag state.
 */
export function createEngineGizmoTransformPipeline(): EngineGizmoTransformPipeline {
  let mode: EngineGizmoMode = "translate";
  let space: EngineGizmoSpace = "world";
  let dragState: EngineGizmoDragState | null = null;
  let dragStartPointerX = 0;
  let dragStartPointerY = 0;

  /**
   * Resolves which gizmo axis a screen-space pointer intersects.
   * Uses simple axis-aligned projection for engine-owned axis detection.
   * @param pointerX Normalized pointer x (-1 to 1).
   * @param pointerY Normalized pointer y (-1 to 1).
   * @param gizmoOriginX Gizmo world origin x.
   * @param gizmoOriginY Gizmo world origin y.
   * @param gizmoOriginZ Gizmo world origin z.
   * @param viewportWidth Viewport width in CSS pixels.
   * @param viewportHeight Viewport height in CSS pixels.
   */
  function resolveGizmoAxis(
    pointerX: number,
    pointerY: number,
    gizmoOriginX: number,
    gizmoOriginY: number,
    gizmoOriginZ: number,
    _viewportWidth: number,
    _viewportHeight: number,
  ): EngineGizmoAxis {
    void gizmoOriginZ; void _viewportWidth; void _viewportHeight; // Reserved for 3D gizmo projection.
    // Normalize pointer relative to gizmo origin in screen space.
    const dx = pointerX - gizmoOriginX;
    const dy = pointerY - gizmoOriginY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Outside hit radius: free movement (no axis constraint).
    if (dist > GIZMO_AXIS_HIT_RADIUS) {
      return "free";
    }

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Inside hit radius: determine which axis handle was grabbed.
    if (mode === "translate") {
      if (absDx > absDy) {
        return dx > 0 ? "x" : "x";
      }
      return dy > 0 ? "y" : "y";
    }

    if (mode === "rotate") {
      // Rotation uses ring detection: XY plane (around Z) by default.
      return "z";
    }

    if (mode === "scale") {
      if (absDx > absDy) {
        return "x";
      }
      return "y";
    }

    return "free";
  }

  /**
   * Starts a drag operation from a pointer position.
   */
  function startDrag(
    pointerX: number,
    pointerY: number,
    axis: EngineGizmoAxis,
    originX: number,
    originY: number,
    originZ: number,
  ): void {
    void originX; void originY; void originZ; // Reserved for future world-space delta projection.
    dragStartPointerX = pointerX;
    dragStartPointerY = pointerY;

    dragState = {
      mode,
      axis,
      space,
      deltaX: 0,
      deltaY: 0,
      deltaZ: 0,
      deltaRotation: 0,
      deltaScale: 1,
    };
  }

  /**
   * Updates the drag state from a new pointer position.
   * Computes deltas from the drag start position.
   */
  function updateDrag(pointerX: number, pointerY: number): EngineGizmoDragState {
    if (!dragState) {
      return createZeroDragState();
    }

    const rawDx = pointerX - dragStartPointerX;
    const rawDy = pointerY - dragStartPointerY;

    // Apply axis constraint.
    const dx = dragState.axis === "y" || dragState.axis === "z" || dragState.axis === "yz" ? 0 : rawDx;
    const dy = dragState.axis === "x" || dragState.axis === "z" || dragState.axis === "xz" ? 0 : rawDy;

    if (dragState.mode === "translate") {
      dragState.deltaX = dx;
      dragState.deltaY = -dy; // Screen Y is inverted from world Y.
      dragState.deltaZ = 0;
    } else if (dragState.mode === "rotate") {
      dragState.deltaRotation = Math.atan2(rawDx, -rawDy);
    } else if (dragState.mode === "scale") {
      const scaleFactor = 1 + rawDx * 2;
      dragState.deltaScale = Math.max(0.01, scaleFactor);
    }

    return { ...dragState };
  }

  /**
   * Ends the current drag and returns the final drag state.
   */
  function endDrag(): EngineGizmoDragState {
    const result = dragState ?? createZeroDragState();
    dragState = null;
    return result;
  }

  return {
    getMode: () => mode,
    setMode: (newMode) => { mode = newMode; },
    getSpace: () => space,
    toggleSpace: () => { space = space === "world" ? "local" : "world"; },
    resolveGizmoAxis,
    startDrag,
    updateDrag,
    endDrag,
    isDragging: () => dragState !== null,
    getDragState: () => dragState,
  };
}

/** Creates a zero-valued drag state used as default. */
function createZeroDragState(): EngineGizmoDragState {
  return {
    mode: "translate",
    axis: "free",
    space: "world",
    deltaX: 0,
    deltaY: 0,
    deltaZ: 0,
    deltaRotation: 0,
    deltaScale: 1,
  };
}
