/**
 * Defines drag behavior tags emitted by overlay controls.
 *
 * Per docs/task/overlay.md §14, every transform must enter an explicit
 * session: move/resize/rotate/rect-radius/arc-angle/path-point/text-box/crop.
 * Custom kinds keep the system open without baking element-specific semantics
 * into the primitive enum.
 */
export type ControlDragBehaviorKind =
  | 'none'
  | 'move'
  | 'resize'
  | 'rotate'
  | 'rect-radius'
  | 'arc-angle'
  | 'path-point'
  | 'path-tangent'
  | 'text-box'
  | 'crop'
  | 'custom'

/**
 * Defines descriptor declaring how dragging a control is interpreted.
 *
 * The descriptor is intentionally declarative; the host runtime owns session
 * orchestration. Extra payload is forwarded to the session manager so
 * element-specific elements can attach metadata (e.g. corner index for rect
 * radius, anchor index for path-point) without expanding core enums.
 */
export interface ControlDragBehavior<TPayload = unknown> {
  /** Stores drag behavior discriminator. */
  kind: ControlDragBehaviorKind
  /** Stores optional opaque payload forwarded to session manager. */
  payload?: TPayload
  /** Stores optional human-readable token for diagnostics. */
  token?: string
}
