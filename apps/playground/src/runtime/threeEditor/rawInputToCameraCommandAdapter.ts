import type {
  EngineCameraCommand as ThreeEditorCameraCommand,
} from '@venus/engine'

/** Declares one canvas-local point used by runtime raw input adapter. */
type ThreeEditorCanvasPoint = {
  /** Canvas-local x coordinate in pixels. */
  x: number
  /** Canvas-local y coordinate in pixels. */
  y: number
}

/** Declares normalized pointer payload extracted from DOM pointer events in runtime layer. */
type ThreeEditorPointerPayload = {
  /** Pointer identifier from PointerEvent.pointerId. */
  pointerId: number
  /** Pointer source type such as mouse, touch, or pen. */
  pointerType: string
  /** Mouse button index from PointerEvent.button. */
  button: number
  /** Whether shift key is pressed during this pointer sample. */
  shiftKey: boolean
  /** Whether ctrl key is pressed during this pointer sample. */
  ctrlKey: boolean
  /** Whether meta key is pressed during this pointer sample. */
  metaKey: boolean
}

/** Declares selection-commit payload emitted when pointer gesture ends. */
type ThreeEditorSelectionCommitPayload = {
  /** Release point in canvas coordinates for click-based picking; null when unavailable. */
  point: ThreeEditorCanvasPoint | null
  /** Whether gesture moved enough to be considered camera drag instead of click. */
  didDrag: boolean
  /** Whether selection should be treated as additive/toggle intent. */
  additive: boolean
}

/** Declares normalized wheel payload extracted from DOM wheel events in runtime layer. */
type ThreeEditorWheelPayload = {
  /** Horizontal wheel delta from WheelEvent.deltaX. */
  deltaX: number
  /** Vertical wheel delta from WheelEvent.deltaY. */
  deltaY: number
  /** Whether ctrl key is pressed during this wheel event. */
  ctrlKey: boolean
  /** Whether meta key is pressed during this wheel event. */
  metaKey: boolean
  /** Whether alt key is pressed during this wheel event. */
  altKey: boolean
}

/** Declares one touch centroid snapshot used for two-finger pan/pinch updates. */
type TouchGestureState = {
  /** Two-finger centroid x in canvas pixels. */
  centerX: number
  /** Two-finger centroid y in canvas pixels. */
  centerY: number
  /** Two-finger distance in canvas pixels. */
  distance: number
}

/** Declares pointer drag mode recognized by the raw input adapter. */
type DragMode = 'idle' | 'orbit' | 'pan'

/** Declares host callbacks consumed by raw input to camera command adapter. */
export type RawInputToCameraCommandAdapterOptions = {
  /** Returns whether adapter should process inputs for the active route. */
  isActive: () => boolean
  /** Receives semantic camera commands translated from raw input events. */
  onCommand: (command: ThreeEditorCameraCommand) => void
  /** Receives hover updates for pointer move events without active dragging. */
  onHoverMoved: (point: ThreeEditorCanvasPoint) => Promise<void>
  /** Called when pointer gesture completes and selection should be committed. */
  onCommitSelection: (payload: ThreeEditorSelectionCommitPayload) => Promise<void>
}

/** Declares public API for raw input to camera command adapter. */
export type RawInputToCameraCommandAdapter = {
  /** Handles pointer-down and initializes drag state. */
  handlePointerDown: (point: ThreeEditorCanvasPoint, pointer: ThreeEditorPointerPayload) => boolean
  /** Handles pointer-move and emits semantic camera commands. */
  handlePointerMove: (point: ThreeEditorCanvasPoint, pointer: ThreeEditorPointerPayload) => boolean
  /** Handles pointer-up and finalizes interaction mode. */
  handlePointerUp: (pointer: ThreeEditorPointerPayload) => boolean
  /** Handles pointer-leave by resetting transient interaction state. */
  handlePointerLeave: () => boolean
  /** Handles wheel events and emits dolly or pan commands. */
  handleWheel: (point: ThreeEditorCanvasPoint, wheel: ThreeEditorWheelPayload) => boolean
  /** Clears internal touch and pointer state. */
  dispose: () => void
}

/**
 * Creates a raw input adapter that maps DOM-like events into semantic camera commands.
 * @param options Adapter options carrying command and hover callbacks.
 */
export const createRawInputToCameraCommandAdapter = (
  options: RawInputToCameraCommandAdapterOptions,
): RawInputToCameraCommandAdapter => {
  const DRAG_DISTANCE_THRESHOLD = 4
  let dragMode: DragMode = 'idle'
  let pointerAnchor: ThreeEditorCanvasPoint | null = null
  let pointerPressPoint: ThreeEditorCanvasPoint | null = null
  let pointerDidDrag = false
  let pointerSelectionAdditive = false
  let touchOrbitAnchor: ThreeEditorCanvasPoint | null = null
  let touchPanState: TouchGestureState | null = null
  let touchDidDrag = false
  const activeTouches = new Map<number, ThreeEditorCanvasPoint>()

  /**
   * Resolves two-touch centroid and distance used for pan/pinch command synthesis.
   */
  const resolveTouchGestureState = (): TouchGestureState | null => {
    const touches = Array.from(activeTouches.values())
    if (touches.length < 2) {
      return null
    }
    const [a, b] = touches
    return {
      centerX: (a.x + b.x) * 0.5,
      centerY: (a.y + b.y) * 0.5,
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    }
  }

  /**
   * Handles pointer-down and initializes drag/touch gesture state.
   * @param point Canvas-local pointer point.
   * @param pointer Pointer payload from pointerdown.
   */
  const handlePointerDown = (point: ThreeEditorCanvasPoint, pointer: ThreeEditorPointerPayload): boolean => {
    if (!options.isActive()) {
      return false
    }
    if (pointer.pointerType === 'touch') {
      activeTouches.set(pointer.pointerId, point)
      touchDidDrag = false
      if (activeTouches.size === 1) {
        touchOrbitAnchor = point
        touchPanState = null
      } else {
        touchOrbitAnchor = null
        touchPanState = resolveTouchGestureState()
      }
      return true
    }

    pointerAnchor = point
    pointerPressPoint = point
    pointerDidDrag = false
    pointerSelectionAdditive = pointer.ctrlKey || pointer.metaKey
    dragMode = pointer.button === 2 || pointer.button === 1 || pointer.shiftKey ? 'pan' : 'orbit'
    return true
  }

  /**
   * Handles pointer-move and emits orbit/pan/dolly commands according to active mode.
   * @param point Canvas-local pointer point.
   * @param pointer Pointer payload from pointermove.
   */
  const handlePointerMove = (point: ThreeEditorCanvasPoint, pointer: ThreeEditorPointerPayload): boolean => {
    if (!options.isActive()) {
      return false
    }

    if (pointer.pointerType === 'touch') {
      if (!activeTouches.has(pointer.pointerId)) {
        return true
      }
      activeTouches.set(pointer.pointerId, point)
      if (activeTouches.size === 1 && touchOrbitAnchor) {
        const deltaX = point.x - touchOrbitAnchor.x
        const deltaY = point.y - touchOrbitAnchor.y
        if (Math.hypot(deltaX, deltaY) >= DRAG_DISTANCE_THRESHOLD) {
          touchDidDrag = true
        }
        touchOrbitAnchor = point
        options.onCommand({
          type: 'orbit',
          deltaYaw: -deltaX * 0.2,
          deltaPitch: deltaY * 0.16,
        })
        return true
      }
      if (activeTouches.size >= 2) {
        const gesture = resolveTouchGestureState()
        if (!gesture || !touchPanState) {
          touchPanState = gesture
          return true
        }
        const deltaCenterX = gesture.centerX - touchPanState.centerX
        const deltaCenterY = gesture.centerY - touchPanState.centerY
        const pinchRatio = touchPanState.distance > 0 ? gesture.distance / touchPanState.distance : 1
        if (
          Math.hypot(deltaCenterX, deltaCenterY) >= DRAG_DISTANCE_THRESHOLD ||
          Math.abs(pinchRatio - 1) >= 0.01
        ) {
          touchDidDrag = true
        }
        options.onCommand({
          type: 'pan',
          deltaRight: deltaCenterX * 0.72,
          deltaUp: deltaCenterY * 0.72,
        })
        options.onCommand({
          type: 'dolly',
          zoomFactor: pinchRatio,
        })
        touchPanState = gesture
        return true
      }
      return true
    }

    if (!pointerAnchor || dragMode === 'idle') {
      void options.onHoverMoved(point)
      return true
    }

    const deltaX = point.x - pointerAnchor.x
    const deltaY = point.y - pointerAnchor.y
    if (Math.hypot(deltaX, deltaY) >= DRAG_DISTANCE_THRESHOLD) {
      pointerDidDrag = true
    }
    pointerAnchor = point
    if (dragMode === 'orbit') {
      options.onCommand({
        type: 'orbit',
        deltaYaw: -deltaX * 0.2,
        deltaPitch: deltaY * 0.16,
      })
      return true
    }
    options.onCommand({
      type: 'pan',
      deltaRight: deltaX * 0.72,
      deltaUp: deltaY * 0.72,
    })
    return true
  }

  /**
   * Handles pointer-up and commits selection after gesture completion.
   * @param pointer Pointer payload from pointerup.
   */
  const handlePointerUp = (pointer: ThreeEditorPointerPayload): boolean => {
    if (!options.isActive()) {
      return false
    }
    if (pointer.pointerType === 'touch') {
      activeTouches.delete(pointer.pointerId)
      if (activeTouches.size === 0) {
        touchOrbitAnchor = null
        touchPanState = null
        void options.onCommitSelection({
          point: null,
          didDrag: touchDidDrag,
          additive: false,
        })
        touchDidDrag = false
      } else if (activeTouches.size === 1) {
        const [remaining] = Array.from(activeTouches.values())
        touchOrbitAnchor = remaining
        touchPanState = null
      }
      return true
    }

    const releasePoint = pointerAnchor ? {...pointerAnchor} : pointerPressPoint ? {...pointerPressPoint} : null
    const didDrag = pointerDidDrag
    const additive = pointerSelectionAdditive
    pointerAnchor = null
    pointerPressPoint = null
    pointerDidDrag = false
    pointerSelectionAdditive = false
    dragMode = 'idle'
    void options.onCommitSelection({
      point: releasePoint,
      didDrag,
      additive,
    })
    return true
  }

  /**
   * Handles pointer-leave by clearing interaction state without emitting commands.
   */
  const handlePointerLeave = (): boolean => {
    if (!options.isActive()) {
      return false
    }
    activeTouches.clear()
    touchOrbitAnchor = null
    touchPanState = null
    touchDidDrag = false
    pointerAnchor = null
    pointerPressPoint = null
    pointerDidDrag = false
    pointerSelectionAdditive = false
    dragMode = 'idle'
    return true
  }

  /**
   * Handles wheel events and emits default dolly or modifier-based pan commands.
   * @param point Canvas-local pointer point used for protocol parity.
   * @param wheel Wheel payload from wheel event.
   */
  const handleWheel = (point: ThreeEditorCanvasPoint, wheel: ThreeEditorWheelPayload): boolean => {
    if (!options.isActive()) {
      return false
    }
    void point
    const shouldPan = wheel.ctrlKey || wheel.metaKey || wheel.altKey
    if (!shouldPan) {
      options.onCommand({
        type: 'dolly',
        zoomFactor: wheel.deltaY < 0 ? 1.03 : 0.97,
      })
      return true
    }
    options.onCommand({
      type: 'pan',
      deltaRight: -wheel.deltaX * 0.68,
      deltaUp: -wheel.deltaY * 0.68,
    })
    return true
  }

  /**
   * Clears transient state for route teardown and adapter disposal.
   */
  const dispose = (): void => {
    activeTouches.clear()
    touchOrbitAnchor = null
    touchPanState = null
    touchDidDrag = false
    pointerAnchor = null
    pointerPressPoint = null
    pointerDidDrag = false
    pointerSelectionAdditive = false
    dragMode = 'idle'
  }

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handleWheel,
    dispose,
  }
}
