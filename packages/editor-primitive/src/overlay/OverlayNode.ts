import type {OverlayAction} from './OverlayAction.ts'
import type {OverlayCoordinateSpace, OverlayPrimitiveType} from './OverlayPrimitives.ts'
import type {CursorIntent} from '../cursor/CursorIntent.ts'

/**
 * Defines one overlay node contract shared across runtime and engine integration.
 */
export interface OverlayNode<TAction = unknown> {
  /** Stores stable overlay node id. */
  id: string
  /** Stores primitive type for renderer and hit-test dispatch. */
  type: OverlayPrimitiveType
  /** Stores coordinate space used by geometry payload. */
  coordinate: OverlayCoordinateSpace
  /** Stores optional zIndex override used by overlay sorting. */
  zIndex?: number
  /** Indicates whether node should be rendered. */
  visible?: boolean
  /** Indicates whether node participates in hit tests. */
  hittable?: boolean
  /** Stores optional cursor hint resolved when node is hovered. */
  cursor?: CursorIntent
  /** Stores product-defined action payload passed through hit results. */
  action?: OverlayAction<TAction>
  /** Stores product metadata for diagnostics/debug overlays. */
  meta?: Record<string, unknown>
}

