import type {DocumentNode, EditorDocument} from '@venus/document-core'

export interface TransformPreviewGeometry {
  shapeId: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}

export interface TransformPreviewRuntimeShape {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  flipX?: boolean
  flipY?: boolean
}

export interface TransformPreviewRuntimeSnapshot {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface BuildTransformPreviewMapOptions {
  includeClipBoundImagePreview?: boolean
  runtimeShapes?: TransformPreviewRuntimeShape[]
}

/**
 * Build a preview map that expands moved group previews to descendants so
 * render-time preview geometry remains consistent with group transforms.
 *
 * Optional clip-bound image preview propagation keeps clipped image previews
 * moving with their clip source during drag/resize before commit.
 */
export function buildGroupAwareTransformPreviewMap(
  document: EditorDocument,
  previewShapes: TransformPreviewGeometry[],
  options?: BuildTransformPreviewMapOptions,
) {
  const previewById = new Map(previewShapes.map((shape) => [shape.shapeId, shape] as const))
  const shapeById = new Map(document.shapes.map((shape) => [shape.id, shape] as const))
  const childrenByParent = new Map<string, string[]>()
  const includeClipBoundImagePreview = !!options?.includeClipBoundImagePreview
  const runtimeShapeById = new Map((options?.runtimeShapes ?? []).map((shape) => [shape.id, shape]))
  const imagesByClipId = new Map<string, string[]>()

  document.shapes.forEach((shape) => {
    if (!shape.parentId) {
      if (includeClipBoundImagePreview && shape.type === 'image' && shape.clipPathId) {
        const boundImages = imagesByClipId.get(shape.clipPathId) ?? []
        boundImages.push(shape.id)
        imagesByClipId.set(shape.clipPathId, boundImages)
      }
      return
    }
    const siblings = childrenByParent.get(shape.parentId) ?? []
    siblings.push(shape.id)
    childrenByParent.set(shape.parentId, siblings)
    if (includeClipBoundImagePreview && shape.type === 'image' && shape.clipPathId) {
      const boundImages = imagesByClipId.get(shape.clipPathId) ?? []
      boundImages.push(shape.id)
      imagesByClipId.set(shape.clipPathId, boundImages)
    }
  })

  for (const previewShape of previewShapes) {
    const source = document.shapes.find((shape) => shape.id === previewShape.shapeId)
    if (!source || source.type !== 'group') {
      continue
    }

    const deltaX = previewShape.x - source.x
    const deltaY = previewShape.y - source.y
    if (Math.abs(deltaX) <= 0.0001 && Math.abs(deltaY) <= 0.0001) {
      continue
    }

    const queue = [...(childrenByParent.get(source.id) ?? [])]
    while (queue.length > 0) {
      const childId = queue.shift()
      if (!childId) {
        continue
      }
      const child = document.shapes.find((shape) => shape.id === childId)
      if (!child) {
        continue
      }

      if (!previewById.has(child.id)) {
        previewById.set(child.id, {
          shapeId: child.id,
          x: child.x + deltaX,
          y: child.y + deltaY,
          width: child.width,
          height: child.height,
          rotation: child.rotation ?? 0,
          flipX: child.flipX,
          flipY: child.flipY,
        })
      }

      const nested = childrenByParent.get(child.id)
      if (nested && nested.length > 0) {
        queue.push(...nested)
      }
    }
  }

  if (includeClipBoundImagePreview) {
    for (const previewShape of previewShapes) {
      const source = shapeById.get(previewShape.shapeId)
      if (!source) {
        continue
      }

      const imageIds = imagesByClipId.get(source.id) ?? []
      imageIds.forEach((imageId) => {
        if (previewById.has(imageId)) {
          return
        }
        const image = shapeById.get(imageId)
        if (!image) {
          return
        }
        const runtimeShape = runtimeShapeById.get(image.id)
        previewById.set(image.id, resolveClipBoundImagePreview(image, source, previewShape, runtimeShape))
      })
    }
  }

  return previewById
}

/**
 * Apply preview geometry to a document node, remapping authored point/bezier
 * geometry into the new preview bounds when needed.
 */
export function applyTransformPreviewGeometryToShape(
  shape: DocumentNode,
  preview: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean
  },
) {
  const source = {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  }
  const target = {
    x: preview.x,
    y: preview.y,
    width: preview.width,
    height: preview.height,
  }

  return {
    ...shape,
    x: preview.x,
    y: preview.y,
    width: preview.width,
    height: preview.height,
    rotation: typeof preview.rotation === 'number' ? preview.rotation : shape.rotation,
    flipX: typeof preview.flipX === 'boolean' ? preview.flipX : shape.flipX,
    flipY: typeof preview.flipY === 'boolean' ? preview.flipY : shape.flipY,
    points:
      (
        shape.type === 'path' ||
        shape.type === 'polygon' ||
        shape.type === 'star' ||
        shape.type === 'lineSegment'
      ) && shape.points
        ? shape.points.map((point) => remapPoint(point, source, target))
        : shape.points,
    bezierPoints:
      shape.type === 'path' && shape.bezierPoints
        ? shape.bezierPoints.map((point) => ({
            anchor: remapPoint(point.anchor, source, target),
            cp1: point.cp1 ? remapPoint(point.cp1, source, target) : point.cp1,
            cp2: point.cp2 ? remapPoint(point.cp2, source, target) : point.cp2,
          }))
        : shape.bezierPoints,
  }
}

/**
 * Resolve preview map + preview-adjusted document/runtime snapshot state from
 * one shared transform-preview computation.
 */
export function resolveTransformPreviewRuntimeState<
  TRuntimeShape extends TransformPreviewRuntimeSnapshot,
>(
  document: EditorDocument,
  runtimeShapes: TRuntimeShape[],
  previewShapes: TransformPreviewGeometry[] | null | undefined,
  options?: {
    includeClipBoundImagePreview?: boolean
  },
) {
  if (!previewShapes || previewShapes.length === 0) {
    return {
      previewById: null,
      previewDocument: document,
      previewShapes: runtimeShapes,
    }
  }

  const previewById = buildGroupAwareTransformPreviewMap(document, previewShapes, {
    includeClipBoundImagePreview: !!options?.includeClipBoundImagePreview,
    runtimeShapes,
  })

  return {
    previewById,
    previewDocument: {
      ...document,
      shapes: document.shapes.map((shape) =>
        previewById.has(shape.id)
          ? applyTransformPreviewGeometryToShape(shape, {
              x: previewById.get(shape.id)?.x ?? shape.x,
              y: previewById.get(shape.id)?.y ?? shape.y,
              width: previewById.get(shape.id)?.width ?? shape.width,
              height: previewById.get(shape.id)?.height ?? shape.height,
              rotation: previewById.get(shape.id)?.rotation,
              flipX: previewById.get(shape.id)?.flipX,
              flipY: previewById.get(shape.id)?.flipY,
            })
          : shape,
      ),
    },
    previewShapes: runtimeShapes.map((shape) => (
      previewById.has(shape.id)
        ? {
            ...shape,
            x: previewById.get(shape.id)?.x ?? shape.x,
            y: previewById.get(shape.id)?.y ?? shape.y,
            width: previewById.get(shape.id)?.width ?? shape.width,
            height: previewById.get(shape.id)?.height ?? shape.height,
          }
        : shape
    )),
  }
}

function remapPoint(
  point: {x: number; y: number},
  source: {x: number; y: number; width: number; height: number},
  target: {x: number; y: number; width: number; height: number},
) {
  const scaleX = source.width === 0 ? 1 : target.width / source.width
  const scaleY = source.height === 0 ? 1 : target.height / source.height
  return {
    x: target.x + (point.x - source.x) * scaleX,
    y: target.y + (point.y - source.y) * scaleY,
  }
}

function resolveClipBoundImagePreview(
  image: DocumentNode,
  clipSource: DocumentNode,
  clipPreview: TransformPreviewGeometry,
  runtimeShape?: TransformPreviewRuntimeShape,
): TransformPreviewGeometry {
  const baseX = runtimeShape?.x ?? image.x
  const baseY = runtimeShape?.y ?? image.y
  const baseWidth = Math.max(1, runtimeShape?.width ?? image.width)
  const baseHeight = Math.max(1, runtimeShape?.height ?? image.height)
  const baseRotation = runtimeShape?.rotation ?? image.rotation ?? 0

  const sourceCenter = {
    x: clipSource.x + clipSource.width / 2,
    y: clipSource.y + clipSource.height / 2,
  }
  const targetCenter = {
    x: clipPreview.x + clipPreview.width / 2,
    y: clipPreview.y + clipPreview.height / 2,
  }
  const baseCenter = {
    x: baseX + baseWidth / 2,
    y: baseY + baseHeight / 2,
  }

  const scaleX = clipSource.width === 0 ? 1 : clipPreview.width / clipSource.width
  const scaleY = clipSource.height === 0 ? 1 : clipPreview.height / clipSource.height
  const sourceRotation = clipSource.rotation ?? 0
  const targetRotation = typeof clipPreview.rotation === 'number' ? clipPreview.rotation : sourceRotation
  const rotationDelta = targetRotation - sourceRotation
  const sourceFlipX = !!clipSource.flipX
  const sourceFlipY = !!clipSource.flipY
  const targetFlipX = typeof clipPreview.flipX === 'boolean' ? clipPreview.flipX : sourceFlipX
  const targetFlipY = typeof clipPreview.flipY === 'boolean' ? clipPreview.flipY : sourceFlipY

  const reflectedOffset = {
    x: targetFlipX !== sourceFlipX ? -(baseCenter.x - sourceCenter.x) : (baseCenter.x - sourceCenter.x),
    y: targetFlipY !== sourceFlipY ? -(baseCenter.y - sourceCenter.y) : (baseCenter.y - sourceCenter.y),
  }
  const scaledOffset = {
    x: reflectedOffset.x * scaleX,
    y: reflectedOffset.y * scaleY,
  }
  const rotatedOffset = rotateVector(scaledOffset, rotationDelta)
  const nextCenter = {
    x: targetCenter.x + rotatedOffset.x,
    y: targetCenter.y + rotatedOffset.y,
  }
  const nextWidth = Math.max(1, baseWidth * Math.abs(scaleX))
  const nextHeight = Math.max(1, baseHeight * Math.abs(scaleY))

  return {
    shapeId: image.id,
    x: nextCenter.x - nextWidth / 2,
    y: nextCenter.y - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
    rotation: baseRotation + rotationDelta,
    flipX: image.flipX,
    flipY: image.flipY,
  }
}

function rotateVector(point: {x: number; y: number}, degrees: number) {
  if (Math.abs(degrees) <= 0.0001) {
    return point
  }
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }
}
