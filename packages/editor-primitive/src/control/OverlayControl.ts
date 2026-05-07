import type {CursorIntent} from '../cursor/CursorIntent.ts'
import type {ControlDragBehavior} from './DragBehavior.ts'
import type {ControlHitArea} from './HitArea.ts'
import type {ControlPriority} from './ControlPriority.ts'
import type {ControlRenderDescriptor} from './RenderDescriptor.ts'

/**
 * Defines canonical built-in overlay control kind tokens.
 *
 * The list is intentionally open: custom string kinds are valid so element-
 * specific elements (rect-radius, arc-angle, path-anchor, etc.) can register
 * without adjusting core enums (docs/task/overlay.md §17.2).
 */
export type OverlayControlKind =
  | 'hover-outline'
  | 'selected-marquee-body'
  | 'selection-box'
  | 'resize-edge'
  | 'resize-corner'
  | 'rotate'
  | 'move-body'
  | 'rect-radius'
  | 'arc-angle-start'
  | 'arc-angle-end'
  | 'path-anchor'
  | 'path-tangent'
  | 'element-specific'
  | (string & {})

/**
 * Defines one overlay interaction unit per docs/task/overlay.md §4.4.
 *
 * Every unit declares its identity, hit area, render descriptors, priority,
 * cursor intent, and drag behavior. Pointer flow consumes this contract
 * uniformly so new element-specific controls do not require pointer-flow
 * changes (docs/task/overlay.md §17.1).
 */
export interface OverlayControl<TDragPayload = unknown> {
  /** Stores stable id unique inside one overlay model version. */
  id: string
  /** Stores semantic kind discriminator. */
  kind: OverlayControlKind
  /** Stores owning element id when control is bound to a specific element. */
  ownerId?: string
  /** Stores priority used during hit resolution; higher wins. */
  priority: ControlPriority
  /** Stores hit area geometry consumed by the resolver. */
  hitArea: ControlHitArea
  /** Stores zero or more render descriptors emitted to engine overlay layer. */
  render?: ControlRenderDescriptor[]
  /** Stores cursor hint when this control owns the pointer. */
  cursor?: CursorIntent
  /** Stores drag behavior descriptor consumed by session manager. */
  dragBehavior?: ControlDragBehavior<TDragPayload>
  /** Stores optional metadata bag for diagnostics and theming. */
  metadata?: Record<string, unknown>
  /** Stores optional debug label. */
  label?: string
  /** Indicates whether this control should be skipped during hit resolution. */
  disabled?: boolean
}
