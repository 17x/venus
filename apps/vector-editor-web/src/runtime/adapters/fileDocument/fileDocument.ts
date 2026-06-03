import type {BezierPoint, DocumentNode, EditorDocument, ShapeType} from '../../model/index.ts'
import {normalizeEditorDocumentContract} from '../../model/document-runtime/index.ts'
import type {ElementProps} from '../../types/index.ts'
import type {EditorFileDocument} from '../../types/index.ts'
import {createRuntimeSceneFromVisionFile} from '../fileFormatScene.ts'
import {resolveTextContent, resolveTextRuns} from './fileDocument.text.ts'
type ElementHierarchyMeta = {
  parentId?: string | null
  childIds?: string[]
}

function resolveArrowhead(value: unknown): DocumentNode['strokeStartArrowhead'] {
  if (
    value === 'none' ||
    value === 'triangle' ||
    value === 'diamond' ||
    value === 'circle' ||
    value === 'bar'
  ) {
    return value
  }
  return undefined
}

function cloneRecord<T>(value: T | undefined): T | undefined {
  if (value === undefined) {
    return undefined
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function resolveBlendMode(value: unknown): DocumentNode['blendMode'] {
  if (
    value === 'normal' ||
    value === 'darken' ||
    value === 'multiply' ||
    value === 'color-burn' ||
    value === 'lighten' ||
    value === 'screen' ||
    value === 'color-dodge' ||
    value === 'overlay' ||
    value === 'soft-light' ||
    value === 'hard-light' ||
    value === 'difference' ||
    value === 'exclusion' ||
    value === 'hue' ||
    value === 'saturation' ||
    value === 'color' ||
    value === 'luminosity'
  ) {
    return value
  }
  return undefined
}

function resolveBooleanOperation(value: unknown): DocumentNode['booleanOperation'] {
  if (
    value === 'union' ||
    value === 'subtract' ||
    value === 'intersect' ||
    value === 'exclude' ||
    value === 'none'
  ) {
    return value
  }
  return undefined
}

function resolveTextAutoHeight(value: unknown): DocumentNode['textAutoHeight'] {
  return value === 'auto' || value === 'fixed' ? value : undefined
}

function resolveTextTruncation(value: unknown): DocumentNode['textTruncation'] {
  return value === 'none' || value === 'ending' || value === 'middle' ? value : undefined
}

function resolveFillLayers(value: unknown): DocumentNode['fills'] {
  return Array.isArray(value)
    ? value
        .map((entry) => resolveFill(entry))
        .filter((entry): entry is NonNullable<DocumentNode['fills']>[number] => Boolean(entry))
    : undefined
}

function resolveStrokeLayers(value: unknown): DocumentNode['strokes'] {
  return Array.isArray(value)
    ? value
        .map((entry) => resolveStroke(entry))
        .filter((entry): entry is NonNullable<DocumentNode['strokes']>[number] => Boolean(entry))
    : undefined
}

function resolveShapeType(type: string | undefined): ShapeType {
  if (
    type === 'frame' ||
    type === 'group' ||
    type === 'rectangle' ||
    type === 'ellipse' ||
    type === 'polygon' ||
    type === 'star' ||
    type === 'lineSegment' ||
    type === 'path' ||
    type === 'text' ||
    type === 'image'
  ) {
    return type
  }

  return 'rectangle'
}

function resolveRuntimeNodeType(type: ShapeType): string {
  if (type === 'frame') {
    return 'FRAME'
  }
  if (type === 'group') {
    return 'GROUP'
  }
  if (type === 'text') {
    return 'TEXT'
  }
  if (type === 'image') {
    return 'IMAGE'
  }
  if (type === 'path' || type === 'lineSegment') {
    return 'VECTOR'
  }
  if (type === 'polygon' || type === 'star') {
    return 'SHAPE'
  }

  return 'SHAPE'
}

function resolveFill(value: unknown): DocumentNode['fill'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  const gradient = resolveGradient(record.gradient)
  const image = resolveImageFill(record.image)
  const blendMode = resolveBlendMode(record.blendMode)
  const resolved: NonNullable<DocumentNode['fill']> = {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    opacity: typeof record.opacity === 'number' ? record.opacity : undefined,
  }
  if (gradient) {
    resolved.gradient = gradient
  }
  if (image) {
    resolved.image = image
  }
  if (blendMode) {
    resolved.blendMode = blendMode
  }
  return resolved
}

function resolveStroke(value: unknown): DocumentNode['stroke'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  const gradient = resolveGradient(record.gradient)
  const dashPattern = record.dashPattern === 'solid' ||
    record.dashPattern === 'dashed' ||
    record.dashPattern === 'dotted' ||
    record.dashPattern === 'custom'
    ? record.dashPattern
    : undefined
  const align = record.align === 'center' || record.align === 'inside' || record.align === 'outside'
    ? record.align
    : undefined
  const cap = record.cap === 'none' || record.cap === 'round' || record.cap === 'square'
    ? record.cap
    : undefined
  const join = record.join === 'miter' || record.join === 'round' || record.join === 'bevel'
    ? record.join
    : undefined
  const blendMode = resolveBlendMode(record.blendMode)
  const resolved: NonNullable<DocumentNode['stroke']> = {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    weight: typeof record.weight === 'number' ? record.weight : undefined,
    dashPattern,
    customDash: Array.isArray(record.customDash)
      ? record.customDash.filter((entry): entry is number => typeof entry === 'number')
      : undefined,
    align,
    cap,
    join,
    opacity: typeof record.opacity === 'number' ? record.opacity : undefined,
  }
  if (gradient) {
    resolved.gradient = gradient
  }
  if (blendMode) {
    resolved.blendMode = blendMode
  }
  return resolved
}

function resolveGradient(value: unknown): NonNullable<NonNullable<DocumentNode['fill']>['gradient']> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const record = value as Record<string, unknown>
  if (
    record.type !== 'linear' &&
    record.type !== 'radial' &&
    record.type !== 'angular' &&
    record.type !== 'diamond'
  ) {
    return undefined
  }

  if (!Array.isArray(record.stops)) {
    return undefined
  }

  const stops = record.stops
    .map((stop) => {
      if (!stop || typeof stop !== 'object') {
        return null
      }

      const candidate = stop as Record<string, unknown>
      if (typeof candidate.offset !== 'number' || typeof candidate.color !== 'string') {
        return null
      }

      const nextStop: {offset: number; color: string; opacity?: number} = {
        offset: candidate.offset,
        color: candidate.color,
      }
      if (typeof candidate.opacity === 'number') {
        nextStop.opacity = candidate.opacity
      }
      return nextStop
    })
    .filter((stop): stop is {offset: number; color: string; opacity?: number} => stop !== null)

  if (stops.length === 0) {
    return undefined
  }

  const gradient: NonNullable<NonNullable<DocumentNode['fill']>['gradient']> = {
    type: record.type,
    stops,
  }
  if (typeof record.angle === 'number') {
    gradient.angle = record.angle
  }
  if (typeof record.centerX === 'number') {
    gradient.centerX = record.centerX
  }
  if (typeof record.centerY === 'number') {
    gradient.centerY = record.centerY
  }
  if (typeof record.radius === 'number') {
    gradient.radius = record.radius
  }
  if (typeof record.startAngle === 'number') {
    gradient.startAngle = record.startAngle
  }
  if (typeof record.sweepAngle === 'number') {
    gradient.sweepAngle = record.sweepAngle
  }
  return gradient
}

function resolveImageFill(value: unknown): NonNullable<NonNullable<DocumentNode['fill']>['image']> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (typeof record.assetId !== 'string') {
    return undefined
  }
  const scaleMode = record.scaleMode === 'fill' ||
    record.scaleMode === 'fit' ||
    record.scaleMode === 'crop' ||
    record.scaleMode === 'tile'
    ? record.scaleMode
    : undefined
  const blendMode = resolveBlendMode(record.blendMode)
  const imageFill: NonNullable<NonNullable<DocumentNode['fill']>['image']> = {
    assetId: record.assetId,
  }
  if (scaleMode) {
    imageFill.scaleMode = scaleMode
  }
  if (typeof record.rotation === 'number') {
    imageFill.rotation = record.rotation
  }
  if (typeof record.opacity === 'number') {
    imageFill.opacity = record.opacity
  }
  if (blendMode) {
    imageFill.blendMode = blendMode
  }
  return imageFill
}

function resolveShadow(value: unknown): DocumentNode['shadow'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    kind: record.kind === 'drop' || record.kind === 'inner' ? record.kind : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    offsetX: typeof record.offsetX === 'number' ? record.offsetX : undefined,
    offsetY: typeof record.offsetY === 'number' ? record.offsetY : undefined,
    blur: typeof record.blur === 'number' ? record.blur : undefined,
    spread: typeof record.spread === 'number' ? record.spread : undefined,
    blendMode: resolveBlendMode(record.blendMode),
  }
}

function resolveBlur(value: unknown): DocumentNode['blur'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  if (record.kind !== 'layer' && record.kind !== 'background') {
    return undefined
  }
  if (typeof record.radius !== 'number') {
    return undefined
  }
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    kind: record.kind,
    radius: record.radius,
  }
}

function resolveCornerRadii(value: unknown): DocumentNode['cornerRadii'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    topLeft: typeof record.topLeft === 'number' ? record.topLeft : undefined,
    topRight: typeof record.topRight === 'number' ? record.topRight : undefined,
    bottomRight: typeof record.bottomRight === 'number' ? record.bottomRight : undefined,
    bottomLeft: typeof record.bottomLeft === 'number' ? record.bottomLeft : undefined,
  }
}

function resolveFeatureKinds(element: ElementProps, shapeType: ShapeType) {
  const featureKinds = ['METADATA']

  if (shapeType === 'path' || shapeType === 'lineSegment' || shapeType === 'polygon' || shapeType === 'star') {
    featureKinds.push('VECTOR')
  }
  if (shapeType === 'text') {
    featureKinds.push('TEXT')
  }
  if (shapeType === 'image' && typeof element.asset === 'string') {
    featureKinds.push('IMAGE')
  }
  if (shapeType === 'image' && typeof element.clipPathId === 'string') {
    featureKinds.push('CLIP')
  }

  return featureKinds
}

function toDocumentShape(
  element: ElementProps,
  assetUrlResolver?: (assetId: string | undefined) => string | undefined,
): DocumentNode {
  const shapeType = resolveShapeType(element.type)
  const points = Array.isArray(element.points)
    ? element.points
        .map((point) =>
          point && typeof point === 'object' &&
          typeof (point as {x?: unknown}).x === 'number' &&
          typeof (point as {y?: unknown}).y === 'number'
            ? {x: Number((point as {x: number}).x), y: Number((point as {y: number}).y)}
            : null,
        )
        .filter((point): point is {x: number; y: number} => point !== null)
    : undefined
  const pointBounds = points && points.length > 0
    ? {
        minX: Math.min(...points.map((point) => point.x)),
        minY: Math.min(...points.map((point) => point.y)),
        maxX: Math.max(...points.map((point) => point.x)),
        maxY: Math.max(...points.map((point) => point.y)),
      }
    : null
  const bezierPoints = Array.isArray(element.bezierPoints)
    ? element.bezierPoints
        .map((point) => toBezierPoint(point))
        .filter((point): point is BezierPoint => point !== null)
    : undefined
  const bezierBounds = bezierPoints && bezierPoints.length > 0
    ? getBezierBounds(bezierPoints)
    : null
  const width = Number(element.width ?? (pointBounds ? pointBounds.maxX - pointBounds.minX : 0))
  const height = Number(element.height ?? (pointBounds ? pointBounds.maxY - pointBounds.minY : 0))
  const fallbackX = Number(element.x ?? ((element.cx ?? 0) - width / 2))
  const fallbackY = Number(element.y ?? ((element.cy ?? 0) - height / 2))
  const geometryBounds =
    shapeType === 'path' && bezierBounds
      ? bezierBounds
      : (shapeType === 'path' || shapeType === 'polygon' || shapeType === 'star') && pointBounds
        ? {
            x: pointBounds.minX,
            y: pointBounds.minY,
            width: pointBounds.maxX - pointBounds.minX,
            height: pointBounds.maxY - pointBounds.minY,
          }
        : null
  const x = geometryBounds?.x ?? fallbackX
  const y = geometryBounds?.y ?? fallbackY
  const resolvedWidth = geometryBounds?.width ?? Number(element.width ?? (bezierBounds ? bezierBounds.width : pointBounds ? pointBounds.maxX - pointBounds.minX : 0))
  const resolvedHeight = geometryBounds?.height ?? Number(element.height ?? (bezierBounds ? bezierBounds.height : pointBounds ? pointBounds.maxY - pointBounds.minY : 0))

  return {
    id: element.id,
    type: shapeType,
    name: String(element.name ?? element.type ?? 'shape'),
    parentId: typeof (element as ElementProps & ElementHierarchyMeta).parentId === 'string'
      ? (element as ElementProps & ElementHierarchyMeta).parentId
      : (element as ElementProps & ElementHierarchyMeta).parentId === null
        ? null
        : undefined,
    childIds: Array.isArray((element as ElementProps & ElementHierarchyMeta).childIds)
      ? (element as ElementProps & ElementHierarchyMeta).childIds?.filter((value): value is string => typeof value === 'string')
      : undefined,
    x,
    y,
    width: resolvedWidth,
    height: resolvedHeight,
    rotation: Number(element.rotation ?? 0),
    flipX: Boolean(element.flipX),
    flipY: Boolean(element.flipY),
    opacity: typeof element.opacity === 'number' ? element.opacity : undefined,
    blendMode: resolveBlendMode(element.blendMode),
    locked: typeof element.locked === 'boolean' ? element.locked : undefined,
    visible: typeof element.visible === 'boolean'
      ? element.visible
      : typeof element.show === 'boolean'
        ? element.show
        : undefined,
    text: resolveTextContent(element),
    textRuns: resolveTextRuns(element),
    textAutoHeight: resolveTextAutoHeight(element.textAutoHeight),
    textTruncation: resolveTextTruncation(element.textTruncation),
    textMaxLines: typeof element.textMaxLines === 'number' ? element.textMaxLines : undefined,
    assetId: typeof element.asset === 'string' ? element.asset : undefined,
    clipPathId: typeof element.clipPathId === 'string' ? element.clipPathId : undefined,
    clipRule: element.clipRule === 'evenodd' ? 'evenodd' : element.clipPathId ? 'nonzero' : undefined,
    assetUrl:
      typeof element.assetUrl === 'string'
        ? element.assetUrl
        : assetUrlResolver?.(typeof element.asset === 'string' ? element.asset : undefined),
    points,
    bezierPoints,
    strokeStartArrowhead: resolveArrowhead(element.strokeStartArrowhead),
    strokeEndArrowhead: resolveArrowhead(element.strokeEndArrowhead),
    fills: resolveFillLayers(element.fills),
    fill: resolveFill(element.fill),
    strokes: resolveStrokeLayers(element.strokes),
    stroke: resolveStroke(element.stroke),
    shadow: resolveShadow(element.shadow),
    blur: resolveBlur(element.blur),
    cornerRadius: typeof element.cornerRadius === 'number' ? element.cornerRadius : undefined,
    cornerRadii: resolveCornerRadii(element.cornerRadii),
    ellipseStartAngle: typeof element.ellipseStartAngle === 'number' ? element.ellipseStartAngle : undefined,
    ellipseEndAngle: typeof element.ellipseEndAngle === 'number' ? element.ellipseEndAngle : undefined,
    booleanOperation: resolveBooleanOperation(element.booleanOperation),
    componentId: typeof element.componentId === 'string' ? element.componentId : undefined,
    componentProperties: element.componentProperties && typeof element.componentProperties === 'object'
      ? cloneRecord(element.componentProperties as Record<string, unknown>)
      : undefined,
    schema: {
      sourceNodeType: resolveRuntimeNodeType(shapeType),
      sourceNodeKind: shapeType,
      sourceFeatureKinds: resolveFeatureKinds(element, shapeType),
      maskGroupId: typeof element.maskGroupId === 'string' ? element.maskGroupId : undefined,
      maskRole: element.maskRole === 'host' || element.maskRole === 'source' ? element.maskRole : undefined,
    },
    styleRefs: {
      fillStyleId: typeof element.fillStyleId === 'string' ? element.fillStyleId : undefined,
      strokeStyleId: typeof element.strokeStyleId === 'string' ? element.strokeStyleId : undefined,
      textStyleId: typeof element.textStyleId === 'string' ? element.textStyleId : undefined,
      effectStyleId: typeof element.effectStyleId === 'string' ? element.effectStyleId : undefined,
    },
    extensions: element.extensions && typeof element.extensions === 'object'
      ? {...element.extensions}
      : undefined,
  }
}

export function createDocumentNodeFromElement(element: ElementProps): DocumentNode {
  return toDocumentShape(element)
}

/**
 * Creates canonical editor document snapshot from persisted file payload.
 * @param file Source file document payload.
 */
export function createEditorDocumentFromFile(file: EditorFileDocument): EditorDocument {
  const runtimeScene = createRuntimeSceneFromVisionFile(file)
  const assetMap = new Map((file.assets ?? []).map((asset) => [asset.id, asset]))
  const shapes = file.elements.map((element) =>
    toDocumentShape(element, (assetId) => assetId ? assetMap.get(assetId)?.objectUrl : undefined),
  )

  return normalizeEditorDocumentContract({
    id: file.id,
    name: file.name,
    width: runtimeScene.canvasWidth,
    height: runtimeScene.canvasHeight,
    schema: file.schema,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    pages: file.pages,
    activePageId: file.activePageId,
    lifecycle: file.lifecycle,
    styleReferences: file.styleReferences,
    extensions: file.extensions,
    shapes,
  })
}

/**
 * Creates element payload list from canonical editor document snapshot.
 * @param document Source editor document snapshot.
 */
export function createFileElementsFromDocument(document: EditorDocument): ElementProps[] {
  return document.shapes
    .map((shape, index) => ({
      id: shape.id,
      type: shape.type,
      name: shape.text ?? shape.name,
      parentId: shape.parentId,
      childIds: shape.childIds?.slice(),
      layer: index,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      asset: shape.assetId,
      clipPathId: shape.clipPathId,
      clipRule: shape.clipRule,
      maskGroupId: shape.schema?.maskGroupId,
      maskRole: shape.schema?.maskRole,
      fillStyleId: shape.styleRefs?.fillStyleId,
      strokeStyleId: shape.styleRefs?.strokeStyleId,
      textStyleId: shape.styleRefs?.textStyleId,
      effectStyleId: shape.styleRefs?.effectStyleId,
      extensions: shape.extensions ? {...shape.extensions} : undefined,
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
      opacity: shape.opacity ?? 1,
      blendMode: shape.blendMode,
      locked: shape.locked,
      visible: shape.visible,
      show: shape.visible,
      text: shape.text,
      textRuns: shape.textRuns ? shape.textRuns.map((run) => ({
        start: run.start,
        end: run.end,
        style: cloneRecord(run.style),
      })) : undefined,
      textAutoHeight: shape.textAutoHeight,
      textTruncation: shape.textTruncation,
      textMaxLines: shape.textMaxLines,
      fills: cloneRecord(shape.fills),
      fill: shape.fill
        ? cloneRecord(shape.fill)
        : {
            enabled: shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path',
            color: '#ffffff',
          },
      strokes: cloneRecord(shape.strokes),
      stroke: shape.stroke
        ? cloneRecord(shape.stroke)
        : {
            enabled: true,
            color: '#000000',
            weight: 1,
          },
      shadow: cloneRecord(shape.shadow),
      blur: cloneRecord(shape.blur),
      cornerRadius: shape.cornerRadius,
      cornerRadii: shape.cornerRadii ? {...shape.cornerRadii} : undefined,
      ellipseStartAngle: shape.ellipseStartAngle,
      ellipseEndAngle: shape.ellipseEndAngle,
      booleanOperation: shape.booleanOperation,
      componentId: shape.componentId,
      componentProperties: cloneRecord(shape.componentProperties),
    }))
}

function toPoint(value: unknown) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as {x?: unknown}).x !== 'number' ||
    typeof (value as {y?: unknown}).y !== 'number'
  ) {
    return null
  }

  return {
    x: Number((value as {x: number}).x),
    y: Number((value as {y: number}).y),
  }
}

function toBezierPoint(value: unknown): BezierPoint | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const anchor = toPoint(record.anchor)
  if (!anchor) {
    return null
  }

  return {
    anchor,
    cp1: toPoint(record.cp1),
    cp2: toPoint(record.cp2),
  }
}

function getBezierBounds(points: BezierPoint[]) {
  const xs = points.flatMap((point) => [point.anchor.x, point.cp1?.x, point.cp2?.x].filter((value): value is number => typeof value === 'number'))
  const ys = points.flatMap((point) => [point.anchor.y, point.cp1?.y, point.cp2?.y].filter((value): value is number => typeof value === 'number'))
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
