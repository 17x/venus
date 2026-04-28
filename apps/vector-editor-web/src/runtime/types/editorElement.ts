// Declares stable id type used by editor element and asset contracts.
export type UID = string

// Declares one gradient color stop in normalized offset space.
export interface GradientStop {
  // Stores stop offset in [0, 1].
  offset: number
  // Stores CSS-compatible color string.
  color: string
  // Stores optional stop alpha override.
  opacity?: number
}

// Declares gradient fill/stroke style metadata.
export interface GradientStyle {
  // Stores gradient strategy used by renderer.
  type: 'linear' | 'radial'
  // Stores ordered stop list for color interpolation.
  stops: GradientStop[]
  // Stores optional linear gradient angle in degrees.
  angle?: number
  // Stores optional radial center x in normalized coordinates.
  centerX?: number
  // Stores optional radial center y in normalized coordinates.
  centerY?: number
  // Stores optional radial radius in normalized coordinates.
  radius?: number
}

// Declares basic fill style shape used by editor element props.
export interface Fill {
  // Stores whether fill channel is enabled.
  enabled?: boolean
  // Stores solid fill color when gradient is omitted.
  color?: string
  // Stores optional gradient configuration for fill rendering.
  gradient?: GradientStyle
}

// Declares basic stroke style shape used by editor element props.
export interface Stroke {
  // Stores whether stroke channel is enabled.
  enabled?: boolean
  // Stores solid stroke color when gradient is omitted.
  color?: string
  // Stores stroke width.
  weight?: number
  // Stores line cap style.
  cap?: string
  // Stores line join style.
  join?: string
  // Stores dashed rendering toggle.
  dashed?: boolean
  // Stores optional gradient configuration for stroke rendering.
  gradient?: GradientStyle
}

// Declares shape-level shadow style payload.
export interface Shadow {
  // Stores whether shadow channel is enabled.
  enabled?: boolean
  // Stores shadow color.
  color?: string
  // Stores x-axis offset.
  offsetX?: number
  // Stores y-axis offset.
  offsetY?: number
  // Stores blur radius.
  blur?: number
}

// Declares independent rectangle corner radius payload.
export interface CornerRadii {
  // Stores top-left corner radius.
  topLeft?: number
  // Stores top-right corner radius.
  topRight?: number
  // Stores bottom-right corner radius.
  bottomRight?: number
  // Stores bottom-left corner radius.
  bottomLeft?: number
}

// Declares text-specific shadow payload.
export interface TextShadow {
  // Stores text shadow color.
  color?: string
  // Stores text shadow x offset.
  offsetX?: number
  // Stores text shadow y offset.
  offsetY?: number
  // Stores text shadow blur radius.
  blur?: number
}

// Declares text style payload for element text runs.
export interface TextStyle {
  // Stores text color.
  color?: string
  // Stores font family.
  fontFamily?: string
  // Stores font size.
  fontSize?: number
  // Stores font weight.
  fontWeight?: number
  // Stores letter spacing.
  letterSpacing?: number
  // Stores line height.
  lineHeight?: number
  // Stores horizontal text align.
  textAlign?: 'left' | 'center' | 'right'
  // Stores vertical text align.
  verticalAlign?: 'top' | 'middle' | 'bottom'
  // Stores optional text shadow style.
  shadow?: TextShadow
}

// Declares one rich-text segment range and style.
export interface TextRun {
  // Stores inclusive start index.
  start: number
  // Stores exclusive end index.
  end: number
  // Stores optional segment style payload.
  style?: TextStyle
}

// Declares app-level shape element payload shared by product/runtime adapters.
export interface ElementProps {
  // Stores unique shape id.
  id: UID
  // Stores shape type string.
  type: string
  // Stores optional layer index.
  layer?: number
  // Stores optional shape display name.
  name?: string
  // Stores optional visibility flag.
  show?: boolean
  // Stores shape x coordinate.
  x?: number
  // Stores shape y coordinate.
  y?: number
  // Stores center x coordinate fallback.
  cx?: number
  // Stores center y coordinate fallback.
  cy?: number
  // Stores radius axis 1 for ellipse-like payloads.
  r1?: number
  // Stores radius axis 2 for ellipse-like payloads.
  r2?: number
  // Stores shape width.
  width?: number
  // Stores shape height.
  height?: number
  // Stores rotation in degrees.
  rotation?: number
  // Stores horizontal flip state.
  flipX?: boolean
  // Stores vertical flip state.
  flipY?: boolean
  // Stores optional polyline/path raw points payload used by legacy adapters.
  points?: unknown[]
  // Stores optional bezier control-point payload used by pen/path adapters.
  bezierPoints?: unknown[]
  // Stores element opacity.
  opacity?: number
  // Stores optional fill style.
  fill?: Fill
  // Stores optional stroke style.
  stroke?: Stroke
  // Stores optional shape shadow style.
  shadow?: Shadow
  // Stores uniform corner radius.
  cornerRadius?: number
  // Stores independent corner radii.
  cornerRadii?: CornerRadii
  // Stores optional ellipse arc start angle.
  ellipseStartAngle?: number
  // Stores optional ellipse arc end angle.
  ellipseEndAngle?: number
  // Stores optional asset id for image nodes.
  asset?: string
  // Stores resolved runtime asset URL for image-backed nodes.
  assetUrl?: string
  // Stores optional clipping source shape id for masked image semantics.
  clipPathId?: string
  // Stores optional clip rule for runtime fill winding behavior.
  clipRule?: 'nonzero' | 'evenodd' | string
  // Stores optional mask-group id used by host/source pairing logic.
  maskGroupId?: string
  // Stores optional mask role used by host/source pairing logic.
  maskRole?: 'host' | 'source' | string
  // Stores optional parent id for tree-structured shape ownership.
  parentId?: string | null
  // Stores optional ordered child id list for group-like shapes.
  childIds?: string[]
  // Stores optional text content payload.
  text?: string
  // Stores optional rich text runs payload.
  textRuns?: TextRun[]
  // Stores dynamic extension payload fields for compatibility.
  [key: string]: unknown
}

// Declares runtime-resolved element snapshot with required layer/show fields.
export interface ElementInstance extends ElementProps {
  // Stores required layer index for runtime-projected list rendering.
  layer: number
  // Stores required visibility state for runtime-projected list rendering.
  show: boolean
}

// Declares editor event type key.
export type EditorEventType = string

// Declares editor event payload by event type key.
export type EditorEventData<_K extends EditorEventType = EditorEventType> = unknown