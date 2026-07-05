export type RuntimePoint = { x: number; y: number }
export type RuntimeModifiers = {
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

// Re-export Venus engine types as the canonical document model.
export type {
  Appearance,
  BlendMode,
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
} from './editorElement.ts'

export type {
  CornerRadii,
  EditorEventData,
  EditorEventType,
  ElementInstance,
  ElementProps,
  Fill,
  GradientStop,
  GradientStyle,
  Shadow,
  Stroke,
  TextRun,
  TextShadow,
  TextStyle,
  UID,
} from './editorElement.ts'

export type {
  EditorFileAsset,
  EditorFileDocument,
  EditorFilePageSpec,
} from './editorFile.ts'
