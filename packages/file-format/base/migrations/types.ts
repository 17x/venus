export interface RuntimeSceneV1 {
  version: 1
  canvasWidth: number
  canvasHeight: number
  gradients: unknown[]
  rootElements: unknown[]
}

export interface RuntimeSceneV2 {
  version: 2
  canvasWidth: number
  canvasHeight: number
  gradients: unknown[]
  rootElements: unknown[]
  documentId: string
}

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

export interface RuntimeTextFeature {
  kind: 'TEXT'
  content: string
  fontSize: number
  fontFamily: string
  letterSpacing: number
  lineHeight: number
}

export interface RuntimeVectorFeature {
  kind: 'VECTOR'
  vertices: number[]
  indices: number[]
  isClosed: boolean
}

export interface RuntimeImageFeature {
  kind: 'IMAGE'
  assetId: string
  width: number
  height: number
}

export interface RuntimeLayoutFeature {
  kind: 'LAYOUT'
  mode: 'NONE' | 'ROW' | 'COLUMN'
  padding: number
  gap: number
}

export type RuntimeNodeFeature =
  | RuntimeFillFeature
  | RuntimeStrokeFeature
  | RuntimeTextFeature
  | RuntimeVectorFeature
  | RuntimeImageFeature
  | RuntimeLayoutFeature

export interface RuntimeNodeV3 {
  id: number
  type: RuntimeNodeType
  transform: RuntimeMatrix3x3
  children: number[]
  features: RuntimeNodeFeature[]
}

export interface RuntimeSceneV3 {
  version: 3
  canvasWidth: number
  canvasHeight: number
  gradients: unknown[]
  rootElements: unknown[]
  documentId: string
  nodes: RuntimeNodeV3[]
  rootNodeIds: number[]
}

export type RuntimeNodeTypeV4 = 'FRAME' | 'GROUP' | 'SHAPE' | 'TEXT' | 'IMAGE' | 'VECTOR'

export type RuntimeFeatureKindV4 =
  | 'FILL'
  | 'STROKE'
  | 'LAYOUT'
  | 'CONSTRAINT'
  | 'TEXT'
  | 'VECTOR'
  | 'IMAGE'
  | 'EFFECT'

export interface RuntimeLayoutPaddingV4 {
  top: number
  right: number
  bottom: number
  left: number
}

export interface RuntimeFillFeatureV4 {
  kind: 'FILL'
  fill: unknown
  opacity: number
}

export interface RuntimeStrokeFeatureV4 {
  kind: 'STROKE'
  color: unknown
  width: number
}

export interface RuntimeLayoutFeatureV4 {
  kind: 'LAYOUT'
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  primaryAxisSizing: 'FIXED' | 'AUTO'
  counterAxisSizing: 'FIXED' | 'AUTO'
  gap: number
  padding: RuntimeLayoutPaddingV4
  alignItems: 'START' | 'CENTER' | 'END' | 'STRETCH'
  justifyContent: 'START' | 'CENTER' | 'END' | 'SPACE_BETWEEN'
  widthMode: 'FIXED' | 'HUG' | 'FILL'
  heightMode: 'FIXED' | 'HUG' | 'FILL'
}

export interface RuntimeConstraintFeatureV4 {
  kind: 'CONSTRAINT'
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'STRETCH'
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'STRETCH'
}

export interface RuntimeTextRunV4 {
  start: number
  end: number
  fontSize: number
  fontFamily: string
  fontWeight: number
  color: unknown
  letterSpacing: number
  lineHeight: number
}

export interface RuntimeTextFeatureV4 {
  kind: 'TEXT'
  text: string
  runs: RuntimeTextRunV4[]
}

export interface RuntimePathCommandV4 {
  type: 'MOVE_TO' | 'LINE_TO' | 'CURVE_TO' | 'CLOSE'
  points: number[]
}

export interface RuntimePathV4 {
  commands: RuntimePathCommandV4[]
}

export interface RuntimeVectorFeatureV4 {
  kind: 'VECTOR'
  paths: RuntimePathV4[]
}

export interface RuntimeImageFeatureV4 {
  kind: 'IMAGE'
  imageId: string
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE'
}

export interface RuntimeShadowEffectV4 {
  offsetX: number
  offsetY: number
  blur: number
  spread: number
  color: unknown
}

export interface RuntimeEffectFeatureV4 {
  kind: 'EFFECT'
  shadows: RuntimeShadowEffectV4[]
  blur: number
  opacity: number
}

export type RuntimeNodeFeatureV4 =
  | RuntimeFillFeatureV4
  | RuntimeStrokeFeatureV4
  | RuntimeLayoutFeatureV4
  | RuntimeConstraintFeatureV4
  | RuntimeTextFeatureV4
  | RuntimeVectorFeatureV4
  | RuntimeImageFeatureV4
  | RuntimeEffectFeatureV4

export interface RuntimeNodeV4 {
  id: string
  type: RuntimeNodeTypeV4
  transform: RuntimeMatrix3x3
  children: RuntimeNodeV4[]
  features: RuntimeNodeFeatureV4[]
}

export interface RuntimeSceneV4 {
  version: 4
  canvasWidth: number
  canvasHeight: number
  gradients: unknown[]
  rootElements: unknown[]
  documentId: string
  nodes: RuntimeNodeV4[]
}

export type RuntimeNodeTypeV5 = RuntimeNodeTypeV4

export type RuntimeFeatureKindV5 =
  | RuntimeFeatureKindV4
  | 'METADATA'
  | 'MINDMAP_BRANCH'
  | 'CONNECTOR'

export type RuntimeEditorProductV5 =
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
  sourceAnchor: { x: number; y: number }
  targetAnchor: { x: number; y: number }
  connectorType: 'STRAIGHT' | 'ORTHOGONAL' | 'CURVED'
}

export type RuntimeNodeFeatureV5 =
  | RuntimeNodeFeatureV4
  | RuntimeMetadataFeatureV5
  | RuntimeMindmapBranchFeatureV5
  | RuntimeConnectorFeatureV5

export interface RuntimeFeatureEntryV5 {
  id: string
  role: string
  feature: RuntimeNodeFeatureV5
}

export interface RuntimeNodeV5 {
  id: string
  type: RuntimeNodeTypeV5
  transform: RuntimeMatrix3x3
  children: RuntimeNodeV5[]
  features: RuntimeNodeFeatureV4[]
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
  product: RuntimeEditorProductV5
  editorKey: string
  metadata: RuntimeKeyValueV5[]
}

export type RuntimeSceneLatest = RuntimeSceneV5
export type RuntimeSceneAny = RuntimeSceneV1 | RuntimeSceneV2 | RuntimeSceneV3 | RuntimeSceneV4 | RuntimeSceneV5
