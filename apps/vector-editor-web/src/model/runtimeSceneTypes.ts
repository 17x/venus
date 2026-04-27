export type RuntimeNodeType = 'FRAME' | 'GROUP' | 'SHAPE' | 'TEXT' | 'IMAGE' | 'VECTOR'

export interface RuntimeMatrix3x3 {
  m00: number
  m01: number
  m02: number
  m10: number
  m11: number
  m12: number
  m20: number
  m21: number
  m22: number
}

export interface RuntimeLayoutPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface RuntimeFillFeature {
  kind: 'FILL'
  fill: unknown
  opacity: number
}

export interface RuntimeStrokeFeature {
  kind: 'STROKE'
  color: unknown
  width: number
}

export interface RuntimeLayoutFeature {
  kind: 'LAYOUT'
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  primaryAxisSizing: 'FIXED' | 'AUTO'
  counterAxisSizing: 'FIXED' | 'AUTO'
  gap: number
  padding: RuntimeLayoutPadding
  alignItems: 'START' | 'CENTER' | 'END' | 'STRETCH'
  justifyContent: 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN'
  widthMode: 'FIXED' | 'HUG' | 'FILL'
  heightMode: 'FIXED' | 'HUG' | 'FILL'
}

export interface RuntimeConstraintFeature {
  kind: 'CONSTRAINT'
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'STRETCH'
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'STRETCH'
}

export interface RuntimeTextRun {
  start: number
  end: number
  fontSize: number
  fontFamily: string
  fontWeight: number
  color: unknown
  letterSpacing: number
  lineHeight: number
  shadowColor?: unknown
  shadowOffsetX?: number
  shadowOffsetY?: number
  shadowBlur?: number
}

export interface RuntimeTextFeature {
  kind: 'TEXT'
  text: string
  runs: RuntimeTextRun[]
}

export interface RuntimePathCommand {
  type: 'MOVE_TO' | 'LINE_TO' | 'CURVE_TO' | 'CLOSE'
  points: number[]
}

export interface RuntimePath {
  commands: RuntimePathCommand[]
}

export interface RuntimeVectorFeature {
  kind: 'VECTOR'
  paths: RuntimePath[]
}

export interface RuntimeImageFeature {
  kind: 'IMAGE'
  imageId: string
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE'
}

export interface RuntimeShadowEffect {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: unknown
}

export interface RuntimeEffectFeature {
  kind: 'EFFECT'
  shadows: RuntimeShadowEffect[]
  blur: number
  opacity: number
}

export type RuntimeFeatureKind =
  | 'FILL'
  | 'STROKE'
  | 'LAYOUT'
  | 'CONSTRAINT'
  | 'TEXT'
  | 'VECTOR'
  | 'IMAGE'
  | 'EFFECT'
  | 'METADATA'
  | 'CLIP'
  | 'MINDMAP_BRANCH'
  | 'CONNECTOR'

export type RuntimeEditorProduct =
  | 'UNKNOWN'
  | 'VECTOR'
  | 'MINDMAP'
  | 'FLOWCHART'
  | 'WHITEBOARD'

export interface RuntimeKeyValueV5 {
  key: string
  value: string
}

export interface RuntimeMetadataFeatureV5 {
  kind: 'METADATA'
  entries: RuntimeKeyValueV5[]
}

export interface RuntimeMindmapBranchFeatureV5 {
  kind: 'MINDMAP_BRANCH'
  side: 'AUTO' | 'LEFT' | 'RIGHT'
  collapsed: boolean
  orderHint: number
}

export interface RuntimeConnectorFeatureV5 {
  kind: 'CONNECTOR'
  sourceNodeId: string
  targetNodeId: string
  sourceAnchor: {x: number; y: number}
  targetAnchor: {x: number; y: number}
  connectorType: 'STRAIGHT' | 'ORTHOGONAL' | 'CURVED'
}

export interface RuntimeClipFeatureV5 {
  kind: 'CLIP'
  sourceNodeId: string
  clipRule: 'NONZERO' | 'EVENODD'
}

export type RuntimeNodeFeatureV5 =
  | RuntimeFillFeature
  | RuntimeStrokeFeature
  | RuntimeLayoutFeature
  | RuntimeConstraintFeature
  | RuntimeTextFeature
  | RuntimeVectorFeature
  | RuntimeImageFeature
  | RuntimeEffectFeature
  | RuntimeMetadataFeatureV5
  | RuntimeClipFeatureV5
  | RuntimeMindmapBranchFeatureV5
  | RuntimeConnectorFeatureV5

export interface RuntimeFeatureEntryV5 {
  id: string
  role: string
  feature: RuntimeNodeFeatureV5
}

export interface RuntimeNodeV5 {
  id: string
  type: RuntimeNodeType
  transform: RuntimeMatrix3x3
  children: RuntimeNodeV5[]
  name: string
  parentId: string | null
  featureEntries: RuntimeFeatureEntryV5[]
  nodeKind: string
  isVisible: boolean
  isLocked: boolean
}

export interface RuntimeSceneV5 {
  version: 5
  canvasWidth: number
  canvasHeight: number
  gradients: unknown[]
  rootElements: unknown[]
  documentId: string
  nodes: RuntimeNodeV5[]
  product: RuntimeEditorProduct
  editorKey: string
  metadata: RuntimeKeyValueV5[]
}

export type RuntimeSceneLatest = RuntimeSceneV5
export type RuntimeSceneAny = RuntimeSceneV5

// Compatibility aliases for existing app/runtime imports.
export type RuntimeEditorProductV5 = RuntimeEditorProduct
export type RuntimeNodeFeature = RuntimeNodeFeatureV5
export type RuntimeNodeTypeV4 = RuntimeNodeType
export type RuntimeNodeTypeV5 = RuntimeNodeType
export type RuntimeFeatureKindV4 = RuntimeFeatureKind
export type RuntimeFeatureKindV5 = RuntimeFeatureKind
export type RuntimeNodeFeatureV4 = RuntimeNodeFeatureV5
export type RuntimePathCommandV4 = RuntimePathCommand
export type RuntimePathV4 = RuntimePath
