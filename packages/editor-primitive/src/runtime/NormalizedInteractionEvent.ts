import type {NormalizedKeyboardEvent} from '../keyboard/NormalizedKeyboardEvent.ts'
import type {NormalizedPointerEvent} from '../pointer/NormalizedPointerEvent.ts'
import type {TargetStack} from '../target/TargetStack.ts'
import type {NormalizedWheelEvent} from '../viewport/NormalizedWheelEvent.ts'

/**
 * Defines normalized interaction event union consumed by dispatchInteractionEvent.
 */
export type NormalizedInteractionEvent<TPatch = unknown> =
  // Pointer down transition.
  | {type: 'pointer-down'; eventId: string; event: NormalizedPointerEvent; targetStack?: TargetStack; patch?: TPatch}
  // Pointer move transition.
  | {type: 'pointer-move'; eventId: string; event: NormalizedPointerEvent; targetStack?: TargetStack; patch?: TPatch}
  // Pointer up transition.
  | {type: 'pointer-up'; eventId: string; event: NormalizedPointerEvent; targetStack?: TargetStack; patch?: TPatch}
  // Pointer cancel transition.
  | {type: 'pointer-cancel'; eventId: string; event: NormalizedPointerEvent; targetStack?: TargetStack}
  // Key down transition.
  | {type: 'key-down'; eventId: string; event: NormalizedKeyboardEvent; patch?: TPatch}
  // Key up transition.
  | {type: 'key-up'; eventId: string; event: NormalizedKeyboardEvent; patch?: TPatch}
  // Wheel transition.
  | {type: 'wheel'; eventId: string; event: NormalizedWheelEvent}
  // Window blur lifecycle transition.
  | {type: 'blur'; eventId: string; timestamp: number}
  // Visibility hidden lifecycle transition.
  | {type: 'visibility-hidden'; eventId: string; timestamp: number}
  // Context menu transition.
  | {type: 'context-menu'; eventId: string; event: NormalizedPointerEvent; targetStack?: TargetStack}

