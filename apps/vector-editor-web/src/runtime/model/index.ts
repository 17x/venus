export type {AffineMatrix, BezierPoint, BoundingRect, NormalizedBounds, Point, Rect} from './geometry/geometry.ts'
export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createIdentityAffineMatrix,
  createRotationAffineMatrix,
  createScaleAffineMatrix,
  createTranslationAffineMatrix,
  cubicBezier,
  getBoundingRectFromBezierPoints,
  getNormalizedBoundsFromBox,
  invertAffineMatrix,
  multiplyAffineMatrices,
  convertDrawPointsToBezierPoints,
} from './geometry/geometry.ts'
export {createNid as nid} from '@venus/lib/ids'
export {parseRuntimeSceneToEditorDocument} from './parseRuntimeScene/parseRuntimeScene.ts'
export type {
  RuntimeFeatureKindV4,
  RuntimeFeatureKindV5,
  RuntimeFeatureEntryV5,
  RuntimeEditorProductV5,
  RuntimeNodeFeature,
  RuntimeNodeFeatureV4,
  RuntimeNodeFeatureV5,
  RuntimeNodeType,
  RuntimeNodeTypeV4,
  RuntimeNodeTypeV5,
  RuntimePathCommandV4,
  RuntimePathV4,
  RuntimeSceneAny,
  RuntimeSceneLatest,
  RuntimeSceneV5,
} from './runtimeSceneTypes.ts'
export {type ToolDefinition, type ToolId, type ToolName} from './tool.ts'

/** Length unit used by document coordinate metadata. */
export enum Unit {
  MM = 'mm',
  INCHES = 'inches',
  PX = 'px',
  CM = 'cm',
}

/** String literal union of length unit values. */
export type UnitType = `${Unit}`
export type {
  DocumentNode,
  DocumentObjectType,
  DocumentSchemaMeta,
  EditorDocument,
  EllipseDocumentNode,
  FrameDocumentNode,
  GroupDocumentNode,
  ImageDocumentNode,
  LineSegmentDocumentNode,
  PathDocumentNode,
  PolygonDocumentNode,
  RectangleCornerRadii,
  RectangleDocumentNode,
  ShapeFillStyle,
  ShapeGradientStop,
  ShapeGradientStyle,
  ShapeGradientType,
  ShapeShadowStyle,
  ShapeStrokeStyle,
  ShapeType,
  StarDocumentNode,
  StrokeArrowhead,
  TextRun,
  TextDocumentNode,
  TextStyle,
  TypedDocumentNode,
} from './documentModel.ts'
export {DOCUMENT_OBJECT_TYPES} from './documentModel.ts'
