import type {RuntimePoint} from '../../../types/index.ts'

import type {RuntimeInputEvent} from './index.runtimeEvents.types.ts'

/**
 * Declares pointer event handlers consumed by runtime canvas shell wiring.
 */
export interface RuntimeCanvasInputHandlers {
  /** Handles pointer move events with current canvas-local coordinates. */
  onPointerMove(point: RuntimePoint): void
  /** Handles pointer down events with optional keyboard modifier state. */
  onPointerDown(
    point: RuntimePoint,
    modifiers?: {
      shiftKey: boolean
      metaKey: boolean
      ctrlKey: boolean
      altKey: boolean
    },
  ): void
  /** Handles pointer up events emitted by runtime shell bindings. */
  onPointerUp(): void
  /** Handles pointer leave events emitted when pointer exits canvas bounds. */
  onPointerLeave(): void
}

interface RuntimeInputRouterLike {
  dispatch(event: RuntimeInputEvent): void
}

/**
 * Creates a canvas-facing adapter that routes pointer lifecycles through RuntimeInputEvent.
 * @param router Runtime input router used to publish normalized runtime input events.
 * @param handlers Canvas pointer handlers used by existing runtime interaction stack.
 */
export function createRuntimeCanvasInputBridge(
  router: RuntimeInputRouterLike,
  handlers: RuntimeCanvasInputHandlers,
): RuntimeCanvasInputHandlers {
  return {
    onPointerMove(point) {
      router.dispatch({
        type: 'pointermove',
        point,
      })
      handlers.onPointerMove(point)
    },
    onPointerDown(point, modifiers) {
      router.dispatch({
        type: 'pointerdown',
        point,
        modifiers,
      })
      handlers.onPointerDown(point, modifiers)
    },
    onPointerUp() {
      router.dispatch({
        type: 'pointerup',
        point: {x: 0, y: 0},
      })
      handlers.onPointerUp()
    },
    onPointerLeave() {
      router.dispatch({
        type: 'pointerleave',
        point: {x: 0, y: 0},
      })
      handlers.onPointerLeave()
    },
  }
}
