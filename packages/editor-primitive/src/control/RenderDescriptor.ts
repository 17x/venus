import type {Point2D} from '@venus/lib'
import type {OverlayCoordinateSpace} from '../overlay/OverlayPrimitives.ts'

/**
 * Defines render descriptor kinds emitted to the engine overlay layer.
 *
 * Per docs/task/overlay.md §17.4 these stay open so engine overlay capability
 * can grow without polluting `editor-primitive` business semantics.
 */
export type ControlRenderDescriptorKind =
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'rect'
  | 'circle'
  | 'arc'
  | 'handle'
  | 'path'
  | 'caret'
  | 'label'
  | 'custom'

/**
 * Defines lightweight style payload forwarded to engine overlay drawing.
 *
 * Style values are kept token-friendly (string color tokens) so the vector
 * app can swap in product theme tokens without modifying primitive code.
 */
export interface ControlRenderStyle {
  /** Stores stroke color token or CSS color string. */
  strokeColor?: string
  /** Stores stroke width in device pixels. */
  strokeWidth?: number
  /** Stores stroke dash pattern in device pixels. */
  strokeDash?: number[]
  /** Stores fill color token or CSS color string. */
  fillColor?: string
  /** Stores fill opacity override. */
  fillOpacity?: number
  /** Stores point radius for handle/circle primitives. */
  pointRadius?: number
  /** Stores arc start angle (degrees) for arc primitives. */
  startAngleDegrees?: number
  /** Stores arc end angle (degrees) for arc primitives. */
  endAngleDegrees?: number
  /** Stores arc inner radius for sector primitives. */
  innerRadius?: number
  /** Stores arc outer radius for sector primitives. */
  outerRadius?: number
  /** Stores stroke scale invariance flag forwarded to engine. */
  nonScalingStroke?: boolean
  /** Stores render order override key. */
  zIndex?: number
}

/**
 * Defines the descriptor delivered to engine overlay rendering.
 *
 * Render descriptors hold no editor-business state; they only describe what
 * to draw. Hit semantics live with the owning `OverlayControl`.
 */
export interface ControlRenderDescriptor {
  /** Stores stable descriptor id. */
  id: string
  /** Stores primitive kind for renderer dispatch. */
  kind: ControlRenderDescriptorKind
  /** Stores coordinate space for descriptor points. */
  coordinate: OverlayCoordinateSpace
  /** Stores point list payload when descriptor is point-list based. */
  points?: Point2D[]
  /** Stores optional style payload. */
  style?: ControlRenderStyle
  /** Stores optional element-specific render token bag for theming. */
  styleToken?: string
  /** Indicates whether descriptor should be rendered at all. */
  visible?: boolean
}
