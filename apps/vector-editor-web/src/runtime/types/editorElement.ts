/**
 * Vector Editor Element Types
 *
 * All domain types now re-export from @venus/engine Venus document model.
 * Local-only types remain for Vector-specific product concerns (imageMeta, schemaMeta).
 * Flat fill/stroke/shadow types are kept as compatibility aliases while PropPanel
 * and adapters migrate to the structured VenusAppearance model.
 *
 * AI-TEMP: Remove flat Fill/Stroke/Shadow types when PropPanel uses VenusAppearance;
 * ref VECTOR_ENGINE_STRENGTHENING_REQUIREMENTS.md §8.1.
 */

// Re-export engine Venus document model types as the source of truth.
export type {
  VenusAppearance as Appearance,
  VenusBlendMode as BlendMode,
  VenusStroke,
  VenusEffect,
  VenusPaint,
  VenusSolidPaint,
  VenusGradientPaint,
  VenusGradient,
  VenusLinearGradient,
  VenusRadialGradient,
  VenusGradientStop,
  VenusStrokeAlign,
  VenusConstraints,
  VenusExportSetting,
} from '@venus/engine'

// Declares stable id type used by editor element and asset contracts.
export type UID = string

// ---- Compatibility aliases (migrating to VenusAppearance) ----

/** AI-TEMP: Compatibility fill type; migrate to VenusPaint[]. */
export interface Fill {
  enabled?: boolean
  color?: string
  gradient?: GradientStyle
}

/** AI-TEMP: Compatibility stroke type; migrate to VenusStroke. */
export interface Stroke {
  enabled?: boolean
  color?: string
  weight?: number
  cap?: string
  join?: string
  dashed?: boolean
  gradient?: GradientStyle
}

/** AI-TEMP: Compatibility shadow type; migrate to VenusEffect.dropShadow. */
export interface Shadow {
  enabled?: boolean
  color?: string
  offsetX?: number
  offsetY?: number
  blur?: number
}

// ---- Gradient types (compatible with Venus) ----

/** Declares one gradient color stop in normalized offset space. Aligned with VenusGradientStop. */
export interface GradientStop {
  offset: number
  color: string
  opacity?: number
}

/** Declares gradient fill/stroke style metadata. Aligned with VenusGradient. */
export interface GradientStyle {
  type: 'linear' | 'radial'
  stops: GradientStop[]
  angle?: number
  centerX?: number
  centerY?: number
  radius?: number
}

// ---- Corner radii (compatible with Venus) ----

/** Declares independent rectangle corner radius payload. Aligned with Venus cornerRadii. */
export interface CornerRadii {
  topLeft?: number
  topRight?: number
  bottomRight?: number
  bottomLeft?: number
}

// ---- Text types (aligned with Venus EngineTextStyle / EngineTextRun) ----

export interface TextShadow {
  color?: string
  offsetX?: number
  offsetY?: number
  blur?: number
}

/** Declares text style payload for element text runs. Aligned with Venus EngineTextStyle. */
export interface TextStyle {
  color?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  fontStyle?: 'normal' | 'italic' | 'oblique'
  letterSpacing?: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  shadow?: TextShadow
}

/** Declares one rich-text segment range and style. Aligned with Venus EngineTextRun. */
export interface TextRun {
  start: number
  end: number
  style?: TextStyle
}

// ---- ElementProps (app-level shape element payload) ----

/**
 * App-level shape element payload shared by product/runtime adapters.
 * Flat fields are migrating toward the structured VenusAppearance model.
 */
export interface ElementProps {
  id: UID
  type: string
  layer?: number
  name?: string
  show?: boolean
  locked?: boolean
  blendMode?: string
  strokeAlign?: string
  x?: number
  y?: number
  cx?: number
  cy?: number
  r1?: number
  r2?: number
  width?: number
  height?: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
  points?: unknown[]
  bezierPoints?: unknown[]
  opacity?: number
  /** AI-TEMP: Flat fill; migrate to appearance.fills (VenusPaint[]). */
  fill?: Fill
  /** AI-TEMP: Flat stroke; migrate to appearance.strokes (VenusStroke[]). */
  stroke?: Stroke
  /** AI-TEMP: Flat shadow; migrate to appearance.effects (VenusEffect[]). */
  shadow?: Shadow
  cornerRadius?: number
  cornerRadii?: CornerRadii
  ellipseStartAngle?: number
  ellipseEndAngle?: number
  asset?: string
  assetUrl?: string
  sourceRect?: {x: number; y: number; width: number; height: number}
  naturalSize?: {width: number; height: number}
  imageSmoothing?: boolean
  clipPathId?: string
  clipRule?: 'nonzero' | 'evenodd' | string
  maskGroupId?: string
  maskRole?: 'host' | 'source' | string
  parentId?: string | null
  childIds?: string[]
  text?: string
  textRuns?: TextRun[]
  /** Engine Venus structured appearance (future primary styling path). */
  appearance?: import('@venus/engine').VenusAppearance
  [key: string]: unknown
}

// Declares runtime-resolved element snapshot with required layer/show fields.
export interface ElementInstance extends ElementProps {
  layer: number
  show: boolean
}

// Declares editor event type key.
export type EditorEventType = string

// Declares editor event payload by event type key.
export type EditorEventData<_K extends EditorEventType = EditorEventType> = unknown
