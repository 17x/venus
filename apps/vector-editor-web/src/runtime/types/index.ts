export type RuntimePoint = { x: number; y: number }
export type RuntimeModifiers = {
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
}

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
