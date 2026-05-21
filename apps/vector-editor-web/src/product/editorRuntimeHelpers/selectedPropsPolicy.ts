import type {DocumentNode} from '../../runtime/model/index.ts'
import type {ElementProps} from '../../runtime/types/index.ts'
import type {SelectedElementProps, SelectedMixedFields} from '../useEditorRuntime/types.ts'

/**
 * Builds one inspector-selected props payload from a single runtime shape.
 * @param shape Runtime shape selected in canvas.
 * @returns Inspector props payload or null when shape is not available.
 */
export function buildSelectedProps(shape: DocumentNode | null): ElementProps | null {
  if (!shape) {
    return null
  }

  return {
    id: shape.id,
    type: shape.type,
    name: shape.text ?? shape.name,
    asset: shape.assetId,
    assetUrl: shape.assetUrl,
    clipPathId: shape.clipPathId,
    clipRule: shape.clipRule,
    schemaMeta: resolveSelectedSchemaMeta(shape),
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    points: shape.points?.map((point) => ({...point})),
    bezierPoints: shape.bezierPoints?.map((point) => ({
      anchor: {...point.anchor},
      cp1: point.cp1 ? {...point.cp1} : point.cp1,
      cp2: point.cp2 ? {...point.cp2} : point.cp2,
    })),
    strokeStartArrowhead: shape.strokeStartArrowhead,
    strokeEndArrowhead: shape.strokeEndArrowhead,
    rotation: shape.rotation ?? 0,
    flipX: shape.flipX ?? false,
    flipY: shape.flipY ?? false,
    opacity: 1,
    fill: resolveSelectedFill(shape),
    stroke: resolveSelectedStroke(shape),
    shadow: shape.shadow ? {...shape.shadow} : undefined,
    cornerRadius: shape.cornerRadius,
    cornerRadii: shape.cornerRadii ? {...shape.cornerRadii} : undefined,
    ellipseStartAngle: shape.ellipseStartAngle,
    ellipseEndAngle: shape.ellipseEndAngle,
  }
}

/**
 * Builds selection props with mixed-style flags for single or multi-selection contexts.
 * @param shapes Current document shape list.
 * @param selectedIds Selected shape id list from runtime state.
 * @param selectedNode Primary selected node when single-selection is active.
 * @returns Selected props payload with optional mixed flags.
 */
export function buildSelectedPropsForSelection(
  shapes: DocumentNode[],
  selectedIds: string[],
  selectedNode: DocumentNode | null,
): SelectedElementProps | null {
  if (selectedIds.length === 0) {
    return null
  }

  if (selectedIds.length === 1) {
    return buildSelectedProps(selectedNode) as SelectedElementProps | null
  }

  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const selectedShapes = selectedIds
    .map((id) => shapeById.get(id) ?? null)
    .filter((shape): shape is DocumentNode => Boolean(shape))
  if (selectedShapes.length === 0) {
    return null
  }

  const base = buildSelectedProps(selectedShapes[0]) as SelectedElementProps | null
  if (!base) {
    return null
  }

  const firstFill = resolveSelectedFill(selectedShapes[0])
  const firstStroke = resolveSelectedStroke(selectedShapes[0])
  const firstShadow = selectedShapes[0].shadow
    ? {...selectedShapes[0].shadow}
    : {enabled: false, color: '#000000', offsetX: 0, offsetY: 0, blur: 8}
  const firstCornerRadius = Number(selectedShapes[0].cornerRadius ?? 0)

  const mixedFields: SelectedMixedFields = {}
  for (let index = 1; index < selectedShapes.length; index += 1) {
    const current = selectedShapes[index]
    const fill = resolveSelectedFill(current)
    const stroke = resolveSelectedStroke(current)
    const shadow = current.shadow
      ? {...current.shadow}
      : {enabled: false, color: '#000000', offsetX: 0, offsetY: 0, blur: 8}

    if (!isPrimitiveFieldEqual(firstFill.enabled, fill.enabled)) {
      mixedFields.fillEnabled = true
    }
    if (!isPrimitiveFieldEqual(firstFill.color, fill.color)) {
      mixedFields.fillColor = true
    }
    if (!isPrimitiveFieldEqual(firstStroke.enabled, stroke.enabled)) {
      mixedFields.strokeEnabled = true
    }
    if (!isPrimitiveFieldEqual(firstStroke.color, stroke.color)) {
      mixedFields.strokeColor = true
    }
    if (!isPrimitiveFieldEqual(firstStroke.weight, stroke.weight)) {
      mixedFields.strokeWeight = true
    }
    if (!isPrimitiveFieldEqual(firstCornerRadius, Number(current.cornerRadius ?? 0))) {
      mixedFields.cornerRadius = true
    }
    if (!isPrimitiveFieldEqual(firstShadow.enabled, shadow.enabled)) {
      mixedFields.shadowEnabled = true
    }
    if (!isPrimitiveFieldEqual(firstShadow.color, shadow.color)) {
      mixedFields.shadowColor = true
    }
    if (!isPrimitiveFieldEqual(firstShadow.offsetX, shadow.offsetX)) {
      mixedFields.shadowOffsetX = true
    }
    if (!isPrimitiveFieldEqual(firstShadow.offsetY, shadow.offsetY)) {
      mixedFields.shadowOffsetY = true
    }
    if (!isPrimitiveFieldEqual(firstShadow.blur, shadow.blur)) {
      mixedFields.shadowBlur = true
    }
  }

  if (Object.keys(mixedFields).length > 0) {
    base.mixedFields = mixedFields
  }
  return base
}

/**
 * Compares primitive inspector field values using strict equality semantics.
 * @param left Left-side value.
 * @param right Right-side value.
 * @returns True when values are equal.
 */
function isPrimitiveFieldEqual(left: string | number | boolean | undefined, right: string | number | boolean | undefined) {
  return left === right
}

/**
 * Resolves schema metadata payload for inspector views.
 * @param shape Runtime shape source.
 */
function resolveSelectedSchemaMeta(shape: DocumentNode) {
  return shape.schema
    ? {
        sourceNodeType: shape.schema.sourceNodeType,
        sourceNodeKind: shape.schema.sourceNodeKind,
        sourceFeatureKinds: shape.schema.sourceFeatureKinds?.slice(),
      }
    : undefined
}

/**
 * Resolves defaulted fill style for inspector controls.
 * @param shape Runtime shape source.
 */
function resolveSelectedFill(shape: DocumentNode) {
  return shape.fill
    ? {...shape.fill}
    : {
        enabled: shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path',
        color: '#ffffff',
      }
}

/**
 * Resolves defaulted stroke style for inspector controls.
 * @param shape Runtime shape source.
 */
function resolveSelectedStroke(shape: DocumentNode) {
  return shape.stroke
    ? {...shape.stroke}
    : {
        enabled: true,
        color: '#000000',
        weight: 1,
      }
}
