import type {BezierPoint, DocumentNode, EditorDocument, ShapeType} from '@venus/document-core'
import {parseRuntimeSceneToEditorDocument} from '@venus/document-core'
import type {ElementProps} from '@lite-u/editor/types'
import type {VisionFileType} from '../hooks/useEditorRuntime.ts'
import {createRuntimeSceneFromVisionFile} from './fileFormatScene.ts'

const PAGE_FRAME_SUFFIX = ':page-frame'
type ElementHierarchyMeta = {
  parentId?: string | null
  childIds?: string[]
}

type ElementTextRun = NonNullable<DocumentNode['textRuns']>[number]

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
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
  }
}

function resolveStroke(value: unknown): DocumentNode['stroke'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    weight: typeof record.weight === 'number' ? record.weight : undefined,
  }
}

function resolveShadow(value: unknown): DocumentNode['shadow'] {
  if (!value || typeof value !== 'object') {
    return undefined
  }
  const record = value as Record<string, unknown>
  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : undefined,
    color: typeof record.color === 'string' ? record.color : undefined,
    offsetX: typeof record.offsetX === 'number' ? record.offsetX : undefined,
    offsetY: typeof record.offsetY === 'number' ? record.offsetY : undefined,
    blur: typeof record.blur === 'number' ? record.blur : undefined,
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
    text: resolveTextContent(element),
    textRuns: resolveTextRuns(element),
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
    fill: resolveFill(element.fill),
    stroke: resolveStroke(element.stroke),
    shadow: resolveShadow(element.shadow),
    cornerRadius: typeof element.cornerRadius === 'number' ? element.cornerRadius : undefined,
    cornerRadii: resolveCornerRadii(element.cornerRadii),
    ellipseStartAngle: typeof element.ellipseStartAngle === 'number' ? element.ellipseStartAngle : undefined,
    ellipseEndAngle: typeof element.ellipseEndAngle === 'number' ? element.ellipseEndAngle : undefined,
    schema: {
      sourceNodeType: resolveRuntimeNodeType(shapeType),
      sourceNodeKind: shapeType,
      sourceFeatureKinds: resolveFeatureKinds(element, shapeType),
    },
  }
}

export function createDocumentNodeFromElement(element: ElementProps): DocumentNode {
  return toDocumentShape(element)
}

export function createEditorDocumentFromFile(file: VisionFileType): EditorDocument {
  const runtimeScene = createRuntimeSceneFromVisionFile(file)
  const document = parseRuntimeSceneToEditorDocument(runtimeScene)
  const assetMap = new Map((file.assets ?? []).map((asset) => [asset.id, asset]))

  return {
    ...document,
    shapes: document.shapes.map((shape) => {
      const nextShape = shape.id === `${file.id}:page-frame`
        ? {
            ...shape,
            id: `${file.id}${PAGE_FRAME_SUFFIX}`,
          }
        : shape
      if (!nextShape.assetId) {
        return nextShape
      }

      return {
        ...nextShape,
        assetUrl: assetMap.get(nextShape.assetId)?.objectUrl,
      }
    }),
  }
}

export function createFileElementsFromDocument(document: EditorDocument): ElementProps[] {
  return document.shapes
    .filter((shape) => !(shape.type === 'frame' && shape.id.endsWith(PAGE_FRAME_SUFFIX)))
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
      text: shape.text,
      textRuns: shape.textRuns ? shape.textRuns.map((run) => ({
        start: run.start,
        end: run.end,
        style: run.style
          ? {...run.style}
          : undefined,
      })) : undefined,
      fill: shape.fill
        ? {...shape.fill}
        : {
            enabled: shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path',
            color: '#ffffff',
          },
      stroke: shape.stroke
        ? {...shape.stroke}
        : {
            enabled: true,
            color: '#000000',
            weight: 1,
          },
      shadow: shape.shadow ? {...shape.shadow} : undefined,
      cornerRadius: shape.cornerRadius,
      cornerRadii: shape.cornerRadii ? {...shape.cornerRadii} : undefined,
      ellipseStartAngle: shape.ellipseStartAngle,
      ellipseEndAngle: shape.ellipseEndAngle,
    }))
}

function resolveTextContent(element: ElementProps) {
  if (element.type !== 'text') {
    return undefined
  }

  if (typeof element.text === 'string') {
    return element.text
  }

  return String(element.name ?? 'Text')
}

function resolveTextRuns(element: ElementProps): DocumentNode['textRuns'] {
  if (element.type !== 'text') {
    return undefined
  }

  const candidate = (element as ElementProps & {textRuns?: unknown}).textRuns
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return undefined
  }

  return candidate
    .map((run) => toTextRun(run))
    .filter((run): run is ElementTextRun => run !== null)
}

function toTextRun(value: unknown): ElementTextRun | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const run = value as {
    start?: unknown
    end?: unknown
    style?: {
      color?: unknown
      fontFamily?: unknown
      fontSize?: unknown
      fontWeight?: unknown
      letterSpacing?: unknown
      lineHeight?: unknown
      textAlign?: unknown
      verticalAlign?: unknown
      shadow?: {
        color?: unknown
        offsetX?: unknown
        offsetY?: unknown
        blur?: unknown
      }
    }
  }

  if (typeof run.start !== 'number' || typeof run.end !== 'number') {
    return null
  }

  const style = run.style && typeof run.style === 'object'
    ? {
        color: typeof run.style.color === 'string' ? run.style.color : undefined,
        fontFamily: typeof run.style.fontFamily === 'string' ? run.style.fontFamily : undefined,
        fontSize: typeof run.style.fontSize === 'number' ? run.style.fontSize : undefined,
        fontWeight: typeof run.style.fontWeight === 'number' ? run.style.fontWeight : undefined,
        letterSpacing: typeof run.style.letterSpacing === 'number' ? run.style.letterSpacing : undefined,
        lineHeight: typeof run.style.lineHeight === 'number' ? run.style.lineHeight : undefined,
        textAlign: resolveTextAlign(run.style.textAlign),
        verticalAlign: resolveVerticalAlign(run.style.verticalAlign),
      }
    : undefined

  return {
    start: Math.max(0, Math.floor(run.start)),
    end: Math.max(0, Math.floor(run.end)),
    style,
  }
}

function resolveTextAlign(value: unknown): 'left' | 'center' | 'right' | undefined {
  if (value === 'left' || value === 'center' || value === 'right') {
    return value
  }
  return undefined
}

function resolveVerticalAlign(value: unknown): 'top' | 'middle' | 'bottom' | undefined {
  if (value === 'top' || value === 'middle' || value === 'bottom') {
    return value
  }
  return undefined
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
