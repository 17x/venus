import {getBoundingRectFromBezierPoints, type BezierPoint, type DocumentNode, type EditorDocument} from '@venus/document-core'

export function clonePoints(points?: Array<{x: number; y: number}>) {
  return points?.map((point) => ({...point}))
}

export function cloneBezierPoints(points?: BezierPoint[]) {
  return points?.map((point) => ({
    anchor: {...point.anchor},
    cp1: point.cp1 ? {...point.cp1} : point.cp1,
    cp2: point.cp2 ? {...point.cp2} : point.cp2,
  }))
}

export function cloneFill(fill?: DocumentNode['fill']) {
  return fill ? {...fill} : undefined
}

export function cloneStroke(stroke?: DocumentNode['stroke']) {
  return stroke ? {...stroke} : undefined
}

export function cloneShadow(shadow?: DocumentNode['shadow']) {
  return shadow ? {...shadow} : undefined
}

export function cloneCornerRadii(cornerRadii?: DocumentNode['cornerRadii']) {
  return cornerRadii ? {...cornerRadii} : undefined
}

export function getPathBounds(points: Array<{x: number; y: number}>) {
  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function getBezierPathBounds(points: BezierPoint[]) {
  const bounds = getBoundingRectFromBezierPoints(points)

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

export function findShapeById(document: EditorDocument, shapeId: string) {
  return document.shapes.find((shape) => shape.id === shapeId) ?? null
}

export function cloneDocument(document: EditorDocument): EditorDocument {
  return {
    ...document,
    shapes: document.shapes.map((shape) => ({
      ...shape,
      points: clonePoints(shape.points),
      bezierPoints: cloneBezierPoints(shape.bezierPoints),
      assetId: shape.assetId,
      assetUrl: shape.assetUrl,
      clipPathId: shape.clipPathId,
      clipRule: shape.clipRule,
      fill: cloneFill(shape.fill),
      stroke: cloneStroke(shape.stroke),
      shadow: cloneShadow(shape.shadow),
      cornerRadius: shape.cornerRadius,
      cornerRadii: cloneCornerRadii(shape.cornerRadii),
      ellipseStartAngle: shape.ellipseStartAngle,
      ellipseEndAngle: shape.ellipseEndAngle,
      schema: shape.schema
        ? {
            ...shape.schema,
            sourceFeatureKinds: shape.schema.sourceFeatureKinds?.slice(),
          }
        : undefined,
    })),
  }
}
