import type {BezierPoint, DocumentNode, EditorDocument, ShapeType} from '@venus/document-core'
import {parseRuntimeSceneToEditorDocument} from '@venus/file-format/base'
import type {ElementProps} from '@lite-u/editor/types'
import type {VisionFileType} from '../hooks/useEditorRuntime.ts'
import {createRuntimeSceneFromVisionFile} from './fileFormatScene.ts'

const PAGE_FRAME_SUFFIX = ':page-frame'

function resolveShapeType(type: string | undefined): ShapeType {
  if (
    type === 'frame' ||
    type === 'rectangle' ||
    type === 'ellipse' ||
    type === 'lineSegment' ||
    type === 'path' ||
    type === 'text' ||
    type === 'image'
  ) {
    return type
  }

  return 'rectangle'
}

function toDocumentShape(
  element: ElementProps,
  assetUrlResolver?: (assetId: string | undefined) => string | undefined,
): DocumentNode {
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
  const x = Number(element.x ?? (bezierBounds ? bezierBounds.x : pointBounds ? pointBounds.minX : ((element.cx ?? 0) - width / 2)))
  const y = Number(element.y ?? (bezierBounds ? bezierBounds.y : pointBounds ? pointBounds.minY : ((element.cy ?? 0) - height / 2)))
  const resolvedWidth = Number(element.width ?? (bezierBounds ? bezierBounds.width : pointBounds ? pointBounds.maxX - pointBounds.minX : 0))
  const resolvedHeight = Number(element.height ?? (bezierBounds ? bezierBounds.height : pointBounds ? pointBounds.maxY - pointBounds.minY : 0))

  return {
    id: element.id,
    type: resolveShapeType(element.type),
    name: String(element.name ?? element.type ?? 'shape'),
    x,
    y,
    width: resolvedWidth,
    height: resolvedHeight,
    text: resolveTextContent(element),
    assetId: typeof element.asset === 'string' ? element.asset : undefined,
    assetUrl:
      typeof element.assetUrl === 'string'
        ? element.assetUrl
        : assetUrlResolver?.(typeof element.asset === 'string' ? element.asset : undefined),
    points,
    bezierPoints,
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
      layer: index,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      asset: shape.assetId,
      points: shape.points?.map((point) => ({...point})),
      bezierPoints: shape.bezierPoints?.map((point) => ({
        anchor: {...point.anchor},
        cp1: point.cp1 ? {...point.cp1} : point.cp1,
        cp2: point.cp2 ? {...point.cp2} : point.cp2,
      })),
      rotation: 0,
      opacity: 1,
      fill: {
        enabled: shape.type !== 'text' && shape.type !== 'lineSegment' && shape.type !== 'path',
        color: '#ffffff',
      },
      stroke: {
        enabled: true,
        color: '#000000',
        weight: 1,
      },
    }))
}

function resolveTextContent(element: ElementProps) {
  if (element.type !== 'text') {
    return undefined
  }

  return String(element.name ?? 'Text')
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
